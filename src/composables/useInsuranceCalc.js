/**
 * useInsuranceCalc — Vue 3 composable для расчёта полиса Pro Life Gold
 */

import { ref, computed } from 'vue';
import { ActuarialEngine } from '../core/actuarial.js';
import { PolicyCalculator } from '../core/calculator.js';
import { RidersCalculator } from '../core/riders.js';
import { PRODUCT_CONFIG } from '../config/product.js';
import { useI18n } from '../i18n/index.js';
import { useCurrencyRate } from './useCurrencyRate.js';

const ALLOWED_RIDERS = [
  'accidental_death',
  'disability_accident_lumpsum',
  'trauma',
  'hospitalization',
];

let _engine = null;
let _calculator = null;
let _ridersCalc = null;

function getEngine() {
  if (!_engine) {
    _engine = new ActuarialEngine(PRODUCT_CONFIG);
    _calculator = new PolicyCalculator(_engine, PRODUCT_CONFIG);
    _ridersCalc = new RidersCalculator(_engine, PRODUCT_CONFIG);
  }
  return { engine: _engine, calculator: _calculator, ridersCalc: _ridersCalc };
}

export function formatMoney(value, currency = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return currency ? `${formatted} ${currency}` : formatted;
}

export function validateInputs(inputs) {
  const { t } = useI18n();
  const errors = [];
  const {
    dob,
    gender,
    term,
    frequency,
    mode,
    sumAssured,
    premium,
    enableAnnuity,
    annuityFrequency,
    annuityTerm,
    guaranteedPeriod,
  } = inputs;
  const { minTerm, maxTerm, maxExitAge, minAge, minPremiumUsd } = PRODUCT_CONFIG;

  if (!dob) {
    errors.push(t('errors.dobRequired'));
  } else {
    const age = PolicyCalculator.calculateAge(dob);
    if (age < 0) {
      errors.push(t('errors.dobInvalid'));
    } else if (minAge && age < minAge) {
      errors.push(t('errors.minAge', { age, min: minAge }));
    } else if (age + minTerm > maxExitAge) {
      errors.push(t('errors.ageTooHigh', { age, maxAge: maxExitAge - minTerm, max: maxExitAge }));
    }
    const exitAge = age + (term || 0);
    if (term && exitAge > maxExitAge) {
      errors.push(t('errors.exitAgeExceeds', { exitAge, max: maxExitAge }));
    }
  }

  if (!gender || !['male', 'female'].includes(gender)) {
    errors.push(t('errors.genderRequired'));
  }

  if (!term || term < minTerm || term > maxTerm) {
    errors.push(t('errors.termRange', { min: minTerm, max: maxTerm }));
  }

  if (!frequency) {
    errors.push(t('errors.frequencyRequired'));
  }

  if (mode === 'sa_to_premium') {
    if (!sumAssured || sumAssured <= 0) {
      errors.push(t('errors.sumAssuredRequired'));
    }
  } else if (!premium || premium <= 0) {
    errors.push(t('errors.premiumRequired'));
  }

  // Минимальный взнос (Pro Life Gold) — в долларах США.
  //   • ежегодно (annual)   — не менее $1 000
  //   • единовременно (single) — не менее $5 000
  // Сравниваем premium (KZT) с (минимум USD × текущий курс).
  if (mode === 'premium_to_sa' && frequency && minPremiumUsd && premium > 0) {
    const minUsd = minPremiumUsd[frequency];
    if (minUsd) {
      const { usdRate } = useCurrencyRate();
      const rate = usdRate?.value;
      if (rate && rate > 0) {
        const minKzt = minUsd * rate;
        if (premium < minKzt) {
          errors.push(t('errors.minPremium', {
            frequency: t(`frequency.${frequency}`),
            min: `$ ${formatMoney(minUsd)}`,
          }));
        }
      }
    }
  }

  if (enableAnnuity) {
    if (!annuityFrequency) {
      errors.push(t('errors.annuityFrequencyRequired'));
    }
    if (!annuityTerm || annuityTerm <= 0) {
      errors.push(t('errors.annuityTermRequired'));
    }
    if (guaranteedPeriod === undefined || guaranteedPeriod === null || guaranteedPeriod < 0) {
      errors.push(t('errors.guaranteedPeriodRequired'));
    }
    if ((annuityTerm || 0) > 0 && guaranteedPeriod > annuityTerm) {
      errors.push(t('errors.guaranteedPeriodMax'));
    }
  }

  return errors;
}

export function useInsuranceCalc() {
  const result = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const errors = ref([]);

  const hasResult = computed(() => result.value !== null);
  const isValid = computed(() => errors.value.length === 0);

  function calculate(inputs) {
    errors.value = validateInputs(inputs);
    if (errors.value.length > 0) {
      error.value = errors.value.join('; ');
      result.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const { calculator, ridersCalc } = getEngine();
      const {
        dob,
        gender,
        term,
        frequency,
        deathBenefitType = 'full_sum_assured',
        mode = 'sa_to_premium',
        sumAssured,
        premium,
        enableAnnuity = false,
        annuityFrequency = 'annual',
        annuityTerm = 0,
        guaranteedPeriod = 0,
        riders: ridersSelection = {},
        kMult = 1.0,
        lAdd = 0.0,
      } = inputs;

      const allowedRidersSelection = Object.fromEntries(
        Object.entries(ridersSelection).filter(([key]) => ALLOWED_RIDERS.includes(key))
      );

      const effectiveAnnuityTerm = enableAnnuity ? annuityTerm : 0;
      const effectiveGuaranteedPeriod = enableAnnuity ? guaranteedPeriod : 0;

      const baseResult = calculator.fullCalculation({
        dob,
        gender,
        term,
        frequency,
        deathBenefitType,
        mode,
        sumAssured,
        premium,
        annuityFrequency,
        annuityTerm: effectiveAnnuityTerm,
        guaranteedPeriod: effectiveGuaranteedPeriod,
        kMult,
        lAdd,
      });

      const x = PolicyCalculator.calculateAge(dob);
      const t = frequency === 'single' ? 1 : term;

      const saLinkedKeys = ['accidental_death', 'disability_accident_lumpsum']
        .filter((k) => allowedRidersSelection[k]?.enabled);

      const fixedRiders = ['trauma', 'hospitalization']
        .filter((k) => allowedRidersSelection[k]?.enabled)
        .map((k) => [k, allowedRidersSelection[k].sum ?? 0])
        .filter(([, s]) => s > 0);

      let finalResult = baseResult;
      if (mode === 'premium_to_sa' && (saLinkedKeys.length > 0 || fixedRiders.length > 0)) {
        finalResult = calculator.calculateSumAssuredWithRiders(
          dob,
          gender,
          term,
          frequency,
          premium,
          deathBenefitType,
          ridersCalc,
          saLinkedKeys,
          fixedRiders,
          kMult,
          lAdd,
        );

        const reserves = calculator.calculateReserves(
          dob,
          gender,
          term,
          frequency,
          finalResult.sumAssured,
          deathBenefitType,
          kMult,
          lAdd,
        );
        const bonuses = calculator.calculateBonus(reserves, finalResult.sumAssured);
        const annuity = calculator.calculateAnnuity(
          x,
          term,
          finalResult.sumAssured,
          annuityFrequency,
          effectiveAnnuityTerm,
          effectiveGuaranteedPeriod,
          gender,
          kMult,
          lAdd,
        );

        finalResult = {
          ...finalResult,
          reserves,
          bonuses,
          annuity,
          annuityPayment: annuity.annuityPayment,
        };
      }

      const finalRidersResult = ridersCalc.calculateAllRiders({
        x,
        n: term,
        t,
        gender,
        frequency,
        sumAssured: finalResult.sumAssured,
        annualPremium: finalResult.annualPremium,
        ridersSelection: allowedRidersSelection,
        kMult,
        lAdd,
      });

      const totalRiderPremium = ALLOWED_RIDERS.reduce((sum, key) => {
        const rider = finalRidersResult.riders[key];
        return sum + (rider?.riderPremium ?? 0);
      }, 0);

      const totalPremium = finalResult.grossPremium + totalRiderPremium;
      const maturityAmount = finalResult.bonuses?.length
        ? (finalResult.bonuses[finalResult.bonuses.length - 1]?.totalSAWithBonus ?? finalResult.sumAssured)
        : finalResult.sumAssured;

      // ─── Пост-валидация результата ───────────────────────────────────────
      //   1. СС по доп. покрытию не должна превышать СС по основному.
      //   2. Для детей 7-16 лет СС по основному ≤ 5 000 000 ₸.
      // При нарушении — расчёт не отображается.
      const { t: ti } = useI18n();
      const finalSA = finalResult.sumAssured;
      const postErrs = [];

      const hasRiderOverSA = Object.values(allowedRidersSelection).some(
        (r) => r?.enabled && typeof r.sum === 'number' && r.sum > finalSA,
      );
      if (hasRiderOverSA) postErrs.push(ti('errors.riderSumExceedsSA'));

      const CHILD_MIN_AGE = 7, CHILD_MAX_AGE = 16, CHILD_MAX_SA = 5_000_000;
      if (x >= CHILD_MIN_AGE && x <= CHILD_MAX_AGE && finalSA > CHILD_MAX_SA) {
        postErrs.push(ti('errors.childMaxSA', {
          age: x,
          min: CHILD_MIN_AGE,
          max: CHILD_MAX_AGE,
          sa:  formatMoney(CHILD_MAX_SA, '₸'),
        }));
      }

      if (postErrs.length > 0) {
        errors.value = [...errors.value, ...postErrs];
        error.value = errors.value.join('; ');
        result.value = null;
        return;
      }

      result.value = {
        ...finalResult,
        riders: finalRidersResult.riders,
        totalRiderPremium,
        totalPremium,
        maturityAmount,
        annuityPayment: enableAnnuity ? finalResult.annuityPayment : 0,
        calcDate: new Date().toISOString().slice(0, 10), // YYYY-MM-DD, used for policy anniversary dates
      };
    } catch (e) {
      error.value = `Ошибка расчёта: ${e.message}`;
      result.value = null;
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    result.value = null;
    error.value = null;
    errors.value = [];
    loading.value = false;
  }

  return {
    result,
    loading,
    error,
    errors,
    hasResult,
    isValid,
    calculate,
    reset,
  };
}
