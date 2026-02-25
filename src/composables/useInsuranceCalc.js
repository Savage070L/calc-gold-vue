/**
 * useInsuranceCalc — Vue 3 composable для расчёта полиса Pro Life Gold
 *
 * Использование:
 *   import { useInsuranceCalc } from '@/composables/useInsuranceCalc'
 *   const { result, loading, error, calculate, validateInputs } = useInsuranceCalc()
 */

import { ref, computed } from 'vue';
import { ActuarialEngine }  from '../core/actuarial.js';
import { PolicyCalculator } from '../core/calculator.js';
import { RidersCalculator } from '../core/riders.js';
import { PRODUCT_CONFIG }   from '../config/product.js';

// Singleton: движок и калькуляторы создаются один раз (таблицы кэшируются)
let _engine      = null;
let _calculator  = null;
let _ridersCalc  = null;

function getEngine() {
  if (!_engine) {
    _engine = new ActuarialEngine(PRODUCT_CONFIG);
    _calculator = new PolicyCalculator(_engine, PRODUCT_CONFIG);
    _ridersCalc = new RidersCalculator(_engine, PRODUCT_CONFIG);
  }
  return { engine: _engine, calculator: _calculator, ridersCalc: _ridersCalc };
}

// ─── Форматирование ────────────────────────────────────────────────────────────

export function formatMoney(value, currency = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatRate(value, decimals = 4) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return (value * 100).toFixed(decimals) + '%';
}

// ─── Валидация ────────────────────────────────────────────────────────────────

export function validateInputs(inputs) {
  const errors = [];
  const { dob, gender, term, frequency, mode, sumAssured, premium } = inputs;
  const { minTerm, maxTerm, maxExitAge } = PRODUCT_CONFIG;

  if (!dob) {
    errors.push('Укажите дату рождения');
  } else {
    const age = PolicyCalculator.calculateAge(dob);
    if (age < 0 || age > 80) {
      errors.push('Некорректный возраст (допустимо: 0–80 лет)');
    }
    const exitAge = age + (term || 0);
    if (exitAge > maxExitAge) {
      errors.push(`Возраст выхода (${exitAge}) превышает максимально допустимый (${maxExitAge})`);
    }
  }

  if (!gender || !['male', 'female'].includes(gender)) {
    errors.push('Укажите пол');
  }

  if (!term || term < minTerm || term > maxTerm) {
    errors.push(`Срок договора должен быть от ${minTerm} до ${maxTerm} лет`);
  }

  if (!frequency) {
    errors.push('Укажите периодичность взносов');
  }

  if (mode === 'sa_to_premium') {
    if (!sumAssured || sumAssured <= 0) {
      errors.push('Укажите страховую сумму (должна быть больше 0)');
    }
  } else {
    if (!premium || premium <= 0) {
      errors.push('Укажите взнос (должен быть больше 0)');
    }
  }

  return errors;
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useInsuranceCalc() {
  const result  = ref(null);
  const loading = ref(false);
  const error   = ref(null);
  const errors  = ref([]);

  const hasResult = computed(() => result.value !== null);
  const isValid   = computed(() => errors.value.length === 0);

  /**
   * Запустить расчёт.
   *
   * @param {Object} inputs
   * @param {string}  inputs.dob                — 'YYYY-MM-DD'
   * @param {string}  inputs.gender             — 'male' | 'female'
   * @param {number}  inputs.term               — срок (лет)
   * @param {string}  inputs.frequency          — 'annual' | 'semiannual' | 'quarterly' | 'monthly' | 'single'
   * @param {string}  inputs.deathBenefitType   — 'full_sum_assured' | 'paid_premiums'
   * @param {string}  inputs.mode               — 'sa_to_premium' | 'premium_to_sa'
   * @param {number}  [inputs.sumAssured]
   * @param {number}  [inputs.premium]
   * @param {number}  [inputs.usdRate]          — курс USD/KZT (для отображения)
   * @param {string}  [inputs.annuityFrequency]
   * @param {number}  [inputs.annuityTerm]
   * @param {number}  [inputs.guaranteedPeriod]
   * @param {Object}  [inputs.riders]           — выбранные допы и их параметры
   */
  function calculate(inputs) {
    errors.value = validateInputs(inputs);
    if (errors.value.length > 0) {
      error.value  = errors.value.join('; ');
      result.value = null;
      return;
    }

    loading.value = true;
    error.value   = null;

    try {
      const { calculator, ridersCalc } = getEngine();
      const {
        dob, gender, term, frequency,
        deathBenefitType = 'full_sum_assured',
        mode = 'sa_to_premium',
        sumAssured, premium,
        usdRate = 1,
        annuityFrequency = 'annual',
        annuityTerm = 0,
        guaranteedPeriod = 0,
        riders: ridersSelection = {},
        kMult = 1.0, lAdd = 0.0,
      } = inputs;

      // Основной расчёт (премия + резервы + бонусы + аннуитет)
      const baseResult = calculator.fullCalculation({
        dob, gender, term, frequency,
        deathBenefitType, mode,
        sumAssured, premium,
        annuityFrequency, annuityTerm, guaranteedPeriod,
        kMult, lAdd,
      });

      // Расчёт допов
      const x = PolicyCalculator.calculateAge(dob);
      const t = frequency === 'single' ? 1 : term;
      const ridersResult = ridersCalc.calculateAllRiders({
        x, n: term, t, gender, frequency,
        sumAssured: baseResult.sumAssured,
        annualPremium: baseResult.annualPremium,
        ridersSelection,
        kMult, lAdd,
      });

      // SA-linked ключи для обратного расчёта с допами
      const saLinkedKeys = ['accidental_death', 'disability_accident_lumpsum']
        .filter(k => ridersSelection[k]?.enabled);

      // Fixed riders для обратного расчёта
      const fixedRiders = ['trauma', 'temporary_disability', 'hospitalization']
        .filter(k => ridersSelection[k]?.enabled)
        .map(k => [k, ridersSelection[k].sum ?? 0])
        .filter(([, s]) => s > 0);

      // Если mode=premium_to_sa и есть допы — пересчитать с учётом всех допов
      let finalResult = baseResult;
      if (mode === 'premium_to_sa' && (saLinkedKeys.length > 0 || fixedRiders.length > 0)) {
        finalResult = calculator.calculateSumAssuredWithRiders(
          dob, gender, term, frequency, premium,
          deathBenefitType, ridersCalc, saLinkedKeys, fixedRiders, kMult, lAdd,
        );
        // Добавляем резервы и бонусы
        const reserves = calculator.calculateReserves(dob, gender, term, frequency,
                                                       finalResult.sumAssured, deathBenefitType,
                                                       kMult, lAdd);
        const bonuses  = calculator.calculateBonus(reserves, finalResult.sumAssured);
        const annuity  = calculator.calculateAnnuity(x, term, finalResult.sumAssured,
                                                     annuityFrequency, annuityTerm,
                                                     guaranteedPeriod, gender, kMult, lAdd);
        finalResult = { ...finalResult, reserves, bonuses, annuity,
                        annuityPayment: annuity.annuityPayment };
      }

      // Пересчёт допов с финальной СС
      const finalRidersResult = ridersCalc.calculateAllRiders({
        x, n: term, t, gender, frequency,
        sumAssured: finalResult.sumAssured,
        annualPremium: finalResult.annualPremium,
        ridersSelection,
        kMult, lAdd,
      });

      // Суммарная премия (основная + допы)
      const totalRiderPremium = Object.values(finalRidersResult.riders)
        .reduce((sum, r) => sum + (r.riderPremium ?? 0), 0);
      const totalPremium = finalResult.grossPremium + totalRiderPremium;

      result.value = {
        ...finalResult,
        riders: finalRidersResult.riders,
        totalRiderPremium,
        totalPremium,
        usdRate,
        // Удобные производные значения
        grossPremiumUSD:    usdRate > 0 ? Math.round(finalResult.grossPremium / usdRate) : null,
        totalPremiumUSD:    usdRate > 0 ? Math.round(totalPremium / usdRate) : null,
        sumAssuredUSD:      usdRate > 0 ? Math.round(finalResult.sumAssured / usdRate) : null,
      };
    } catch (e) {
      error.value  = `Ошибка расчёта: ${e.message}`;
      result.value = null;
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    result.value  = null;
    error.value   = null;
    errors.value  = [];
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
