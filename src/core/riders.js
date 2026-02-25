/**
 * Калькулятор дополнительных покрытий (райдеров) — Pro Life Gold
 *
 * Покрытия:
 *   1. Смерть от НС                   (SA-linked)
 *   2. Инвалидность I-II гр. от НС    (SA-linked, единовременная выплата)
 *   3. Телесные травмы от НС          (fixed-sum, с множителем)
 *   4. Временная утрата труд. от НС   (fixed-sum)
 *   5. Госпитализация от НС           (fixed-sum)
 *   6. Освобождение от взносов (НС)   (waiver, актуарный расчёт)
 *   7. Критические заболевания (КЗ)   (CI, double-decrement)
 *
 * Формула для простых допов:
 *   gross_tariff = ROUND((tariff × kMult + lAdd) × (1 + expenses) / (1 − acquisition), 4)
 *   rider_premium = gross_tariff × rider_sum × freqFactor
 */

import { PRODUCT_CONFIG } from '../config/product.js';
import { roundHalfUp }    from './calculator.js';

// ─── RidersCalculator ─────────────────────────────────────────────────────────

export class RidersCalculator {

  constructor(engine, config = PRODUCT_CONFIG) {
    this.engine       = engine;
    this.config       = config;
    this.ridersConfig = config.riders ?? {};
    this.freqAdj      = config.frequencyAdjustment;
    this.expenses     = config.expenses;
  }

  _freqFactor(frequency) {
    return this.freqAdj[frequency] ?? 1.0;
  }

  // ─── Простой доп (SA-linked или fixed-sum) ────────────────────────────────

  /**
   * Рассчитать премию для простого дополнительного покрытия.
   *
   * @param {string} riderName
   * @param {number} riderSum        — страховая сумма дополнительного покрытия
   * @param {number} term            — срок договора
   * @param {string} frequency       — периодичность взносов
   * @param {number} [kMult=1.0]
   * @param {number} [lAdd=0.0]
   * @param {number} [traumaMultiplier=1.0] — множитель для травмы
   */
  calculateSimpleRider(riderName, riderSum, term, frequency,
                       kMult = 1.0, lAdd = 0.0, traumaMultiplier = 1.0) {
    const rc          = this.ridersConfig[riderName] ?? {};
    const baseTariff  = rc.tariff ?? 0.0;
    const expenseRate = rc.expenses ?? 0.0;
    const acquisition = rc.acquisition ?? 0.0;

    // Для травмы: корректировка тарифа по множителю
    let effectiveTariff;
    if (rc.multiplierBased && traumaMultiplier > 1) {
      const mFactor = rc.multiplierFactor ?? 0.25;
      effectiveTariff = (rc.baseTariff ?? baseTariff) * (1.0 + mFactor * (traumaMultiplier - 1));
    } else {
      effectiveTariff = baseTariff;
    }

    const grossTariff = roundHalfUp(
      (effectiveTariff * kMult + lAdd) * (1.0 + expenseRate) / (1.0 - acquisition),
      4
    );

    const freqFactor    = this._freqFactor(frequency);
    const annualPremium = grossTariff * riderSum;

    let riderPremium;
    if (frequency === 'single') {
      riderPremium = roundHalfUp(annualPremium * term);
    } else {
      riderPremium = roundHalfUp(annualPremium * freqFactor);
    }

    return {
      riderName,
      baseTariff,
      grossTariff,
      riderSum,
      annualPremium: Math.round(annualPremium * 100) / 100,
      riderPremium,
      frequency,
    };
  }

  // ─── Освобождение от уплаты взносов при инвалидности от НС (waiver) ────────

  /**
   * Рассчитать доп «Освобождение от уплаты взносов».
   *
   * Для каждого года k = 0..n-1:
   *   P(k) = ROUND(BP_main × SA, 0)
   *   Q(k) = SUM(P(k+1)..P(n-1))
   *   R(k) = ROUND(Q(k) × gross_tariff_dis, 0)
   * waiver_annual = SUM(R) / (n-1)
   * waiver_premium = ROUND(waiver_annual × freqFactor, 0)
   */
  calculateWaiverRider(x, n, t, gender, sumAssured, annualPremiumMain, frequency) {
    const rcWaiver = this.ridersConfig.disability_waiver ?? {};
    if (!rcWaiver || rcWaiver.type !== 'waiver') {
      return { riderName: 'disability_waiver', riderPremium: 0, annualPremium: 0 };
    }
    if (frequency === 'single' || t <= 1) {
      return { riderName: 'disability_waiver', riderPremium: 0, annualPremium: 0 };
    }

    // Тариф берётся из disability_accident_lumpsum
    const rcDis      = this.ridersConfig.disability_accident_lumpsum ?? {};
    const disTariff  = rcDis.tariff      ?? 0.00047;
    const disExp     = rcDis.expenses    ?? 0.25;
    const disAcq     = rcDis.acquisition ?? 0.40;
    const grossTariffDis = roundHalfUp(
      disTariff * (1.0 + disExp) / (1.0 - disAcq), 4
    );

    const annualMain = roundHalfUp(annualPremiumMain);

    // P(k) — взносы, уплачиваемые за год k
    const payments = [];
    for (let k = 0; k < n; k++) {
      payments.push(n - 1 >= k ? annualMain : 0);
    }

    // Суммируем R(k) = ROUND(Q(k) × grossTariffDis, 0)
    let sumR = 0.0;
    for (let k = 0; k < n; k++) {
      const qk = payments.slice(k + 1).reduce((a, b) => a + b, 0);
      sumR += roundHalfUp(qk * grossTariffDis);
    }

    const freqFactor     = this._freqFactor(frequency);
    const waiverPremium  = n > 1 ? roundHalfUp((sumR / (n - 1)) * freqFactor) : 0;
    const waiverAnnual   = n > 1 ? Math.round((sumR / (n - 1)) * 100) / 100 : 0;

    return {
      riderName: 'disability_waiver',
      riderPremium: waiverPremium,
      annualPremium: waiverAnnual,
      grossTariffDis,
      frequency,
    };
  }

  // ─── Критические заболевания (CI, double-decrement) ──────────────────────

  /**
   * Рассчитать доп «Критические заболевания».
   * Использует CI double-decrement таблицу (из ActuarialEngine).
   *
   * Ax:n_ci = (M_ci(x) − M_ci(x+n)) / D_ci(x)
   * ax:n_ci = (N_ci(x) − N_ci(x+n)) / D_ci(x)
   * ax:t_ci = (N_ci(x) − N_ci(x+t)) / D_ci(x)
   * BP_ci   = (Ax:n_ci + G7×ax:n_ci) / (ax:t_ci − G6×ax:t_ci − alfa_ci)
   */
  calculateCIRider(x, n, t, gender, ciSum, frequency, kMult = 1.0, lAdd = 0.0) {
    const ciTable = this.engine.getCITable(gender);
    const { G6, G7, G2, G3, H4 } = this.expenses;

    const Dx_ci  = ciTable.Dx(x);
    if (Dx_ci === 0) {
      return { riderName: 'critical_illness', riderPremium: 0, annualPremium: 0 };
    }

    const Mx_ci  = ciTable.Mx(x);
    const Mxn_ci = ciTable.Mx(x + n);
    const Nx_ci  = ciTable.Nx(x);
    const Nxn_ci = ciTable.Nx(x + n);
    const Nxt_ci = ciTable.Nx(x + t);
    const Dx1_ci = ciTable.Dx(x + 1);
    const Dx2_ci = ciTable.Dx(x + 2);
    const Dx3_ci = ciTable.Dx(x + 3);

    const Ax_n_ci = (Mx_ci - Mxn_ci) / Dx_ci;
    const ax_n_ci = (Nx_ci - Nxn_ci) / Dx_ci;
    const ax_t_ci = (Nx_ci - Nxt_ci) / Dx_ci;

    // alfa_ci (те же формулы, что для основного покрытия; G4/G5 = 0)
    let alfa_ci;
    if (t === 1) {
      alfa_ci = H4 ?? 0.0;
    } else {
      alfa_ci = G2;
      if (Dx_ci > 0) {
        alfa_ci += G3 * Dx1_ci / Dx_ci;
        // G4 и G5 = 0 в методологии Gold
      }
    }

    const num   = Ax_n_ci + G7 * ax_n_ci;
    const den   = ax_t_ci - G6 * ax_t_ci - alfa_ci;
    const BP_ci = den > 0 ? num / den : 0.0;

    const freqFactor    = this._freqFactor(frequency);
    const annualPremium = roundHalfUp(BP_ci * ciSum);
    const riderPremium  = frequency === 'single'
      ? annualPremium
      : roundHalfUp(BP_ci * ciSum * freqFactor);

    return {
      riderName: 'critical_illness',
      BP_ci, Ax_n_ci, ax_n_ci, ax_t_ci, alfa_ci,
      ciSum,
      annualPremium,
      riderPremium,
      frequency,
    };
  }

  // ─── Расчёт всех выбранных допов ──────────────────────────────────────────

  /**
   * Рассчитать все выбранные дополнительные покрытия.
   *
   * @param {Object} params
   * @param {number} params.x            — возраст
   * @param {number} params.n            — срок договора
   * @param {number} params.t            — срок уплаты взносов
   * @param {string} params.gender
   * @param {string} params.frequency
   * @param {number} params.sumAssured
   * @param {number} params.annualPremium
   * @param {Object} params.ridersSelection — { riderName: { enabled, sum, multiplier } }
   */
  calculateAllRiders(params) {
    const {
      x, n, t, gender, frequency,
      sumAssured, annualPremium,
      ridersSelection = {},
      kMult = 1.0, lAdd = 0.0,
    } = params;

    const results = {};
    let totalRiderPremium = 0.0;

    // SA-linked допы (сумма = страховая сумма основного покрытия)
    const saLinkedRiders = ['accidental_death', 'disability_accident_lumpsum'];
    for (const riderName of saLinkedRiders) {
      const sel = ridersSelection[riderName] ?? {};
      if (sel.enabled) {
        const riderSum = sel.sum ?? sumAssured;
        const r = this.calculateSimpleRider(riderName, riderSum, n, frequency, kMult, lAdd);
        results[riderName]  = r;
        totalRiderPremium  += r.riderPremium;
      }
    }

    // Fixed-sum допы (пользователь задаёт сумму покрытия)
    const fixedRiders = ['trauma', 'temporary_disability', 'hospitalization'];
    for (const riderName of fixedRiders) {
      const sel = ridersSelection[riderName] ?? {};
      if (sel.enabled) {
        const riderSum        = sel.sum ?? sumAssured;
        const traumaMultiplier = riderName === 'trauma' ? (sel.multiplier ?? 1.0) : 1.0;
        const r = this.calculateSimpleRider(riderName, riderSum, n, frequency,
                                            kMult, lAdd, traumaMultiplier);
        results[riderName] = r;
        // trauma и hospitalization входят в суммарную методологическую премию
        if (riderName === 'accidental_death' || riderName === 'disability_accident_lumpsum'
            || riderName === 'trauma' || riderName === 'hospitalization') {
          totalRiderPremium += r.riderPremium;
        }
      }
    }

    // Освобождение от уплаты взносов
    const selWaiver = ridersSelection.disability_waiver ?? {};
    if (selWaiver.enabled) {
      const r = this.calculateWaiverRider(x, n, t, gender, sumAssured, annualPremium, frequency);
      results.disability_waiver = r;
    }

    // Критические заболевания
    const selCI = ridersSelection.critical_illness ?? {};
    if (selCI.enabled) {
      const ciSum = selCI.sum ?? sumAssured;
      const r = this.calculateCIRider(x, n, t, gender, ciSum, frequency, kMult, lAdd);
      results.critical_illness = r;
    }

    return { riders: results, totalRiderPremium };
  }
}
