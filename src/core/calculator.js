/**
 * Калькулятор полиса — Pro Life Gold
 *
 * Формулы брутто-премии:
 *   BP_1 = (Ax:n + G7×ax:n) / (ax:t − G6×ax:t − alfa)   [death benefit = full_sum_assured]
 *   BP_2 = (Ex:n + G7×ax:n) / (ax:t − IAx:n − G6×ax:t − alfa) [death benefit = paid_premiums]
 *
 * Актуарные величины:
 *   Ax:n  = (M(x) − M(x+n) + D(x+n)) / D(x)
 *   Ex:n  = D(x+n) / D(x)
 *   ax:n  = (N(x) − N(x+n)) / D(x)
 *   ax:t  = (N(x) − N(x+t)) / D(x)
 *   IAx:n = (R(x) − R(x+n) − n×M(x+n)) / D(x)  [t>1]
 *         = (M(x) − M(x+n)) / D(x)              [t=1]
 */

import { ActuarialEngine } from './actuarial.js';
import { PRODUCT_CONFIG }  from '../config/product.js';

// ─── Вспомогательное округление (ROUND_HALF_UP, как в Excel) ─────────────────

export function roundHalfUp(value, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ─── PolicyCalculator ─────────────────────────────────────────────────────────

export class PolicyCalculator {

  constructor(engine, config = PRODUCT_CONFIG) {
    this.engine          = engine;
    this.config          = config;
    this.expenses        = config.expenses;
    this.freqAdj         = config.frequencyAdjustment;
    this.surrenderPenalty = config.surrenderPenalty;
    this.bonusRate       = config.bonusRate;
    this.annuityExpense  = config.annuityExpense;
  }

  // ─── Утилиты ────────────────────────────────────────────────────────────────

  /**
   * Вычислить полный возраст на дату ref (по умолчанию — сегодня).
   * @param {string} dob — дата рождения в формате 'YYYY-MM-DD'
   * @param {Date}   [ref]
   */
  static calculateAge(dob, ref = new Date()) {
    const [y, m, d] = dob.split('-').map(Number);
    let age = ref.getFullYear() - y;
    if (ref.getMonth() + 1 < m || (ref.getMonth() + 1 === m && ref.getDate() < d)) {
      age -= 1;
    }
    return age;
  }

  _freqFactor(frequency) {
    return this.freqAdj[frequency] ?? 1.0;
  }

  /**
   * Нагрузки для заданного срока уплаты взносов.
   * Для t=1 (единовременно): G2=H4, G3=G4=G5=0.
   * ВАЖНО: В методологии Gold G4 и G5 всегда = 0 в расчётах.
   */
  _getExpenses(t) {
    const e = this.expenses;
    if (t === 1) {
      return { G2: e.H4, G3: 0.0, G4: 0.0, G5: 0.0, G6: e.G6, G7: e.G7, G8: e.G8, H4: e.H4 };
    }
    return { G2: e.G2, G3: e.G3, G4: 0.0, G5: 0.0, G6: e.G6, G7: e.G7, G8: e.G8, H4: e.H4 };
  }

  // ─── Актуарные значения ──────────────────────────────────────────────────────

  /**
   * Вычислить основные актуарные величины для возраста x, срока n, периода взносов t.
   */
  _actuarialValues(comm, x, n, t) {
    const Dx  = comm.Dx(x);
    const Dxn = comm.Dx(x + n);
    const Dx1 = comm.Dx(x + 1);
    const Dx2 = comm.Dx(x + 2);
    const Dx3 = comm.Dx(x + 3);
    const Mx  = comm.Mx(x);
    const Mxn = comm.Mx(x + n);
    const Nx  = comm.Nx(x);
    const Nxn = comm.Nx(x + n);
    const Nxt = comm.Nx(x + t);
    const Rx  = comm.Rx(x);
    const Rxn = comm.Rx(x + n);

    const Ax_n  = (Mx - Mxn + Dxn) / Dx;
    const Ex_n  = Dxn / Dx;
    const ax_n  = (Nx - Nxn) / Dx;
    const ax_t  = (Nx - Nxt) / Dx;
    const IAx_n = t === 1
      ? (Mx - Mxn) / Dx
      : (Rx - Rxn - n * Mxn) / Dx;

    const NP_1 = ax_t > 0 ? Ax_n / ax_t : 0.0;
    const NP_2 = (ax_n - IAx_n) > 0 ? Ex_n / (ax_n - IAx_n) : 0.0;

    return { Dx, Dxn, Dx1, Dx2, Dx3, Mx, Mxn, Nx, Nxn, Nxt, Rx, Rxn,
             Ax_n, Ex_n, ax_n, ax_t, IAx_n, NP_1, NP_2 };
  }

  /**
   * Аквизиционная нагрузка alfa.
   * alfa = G2 + G3×D(x+1)/D(x) + G4×D(x+2)/D(x) + G5×D(x+3)/D(x)
   * Для t=1: alfa = H4
   */
  _calcAlfa(expenses, vals, t) {
    if (t === 1) return expenses.H4;
    const { Dx, Dx1, Dx2, Dx3 } = vals;
    let alfa = expenses.G2;
    if (Dx > 0) {
      alfa += expenses.G3 * Dx1 / Dx;
      if (expenses.G4 > 0) alfa += expenses.G4 * Dx2 / Dx;
      if (expenses.G5 > 0) alfa += expenses.G5 * Dx3 / Dx;
    }
    return alfa;
  }

  // ─── Брутто-ставка ───────────────────────────────────────────────────────────

  /**
   * Рассчитать брутто-ставку BP на 1 единицу СС.
   */
  calcGrossPremiumRate(x, n, t, gender, deathBenefitType = 'full_sum_assured', kMult = 1.0, lAdd = 0.0) {
    const comm     = this.engine.getCommutationTable(gender, kMult, lAdd);
    const vals     = this._actuarialValues(comm, x, n, t);
    const expenses = this._getExpenses(t);

    const { G6, G7 } = expenses;
    const { Ax_n, Ex_n, ax_n, ax_t, IAx_n } = vals;
    const alfa = this._calcAlfa(expenses, vals, t);

    const num1 = Ax_n + G7 * ax_n;
    const den1 = ax_t - G6 * ax_t - alfa;
    const BP_1 = den1 > 0 ? num1 / den1 : 0.0;

    const num2 = Ex_n + G7 * ax_n;
    const den2 = ax_t - IAx_n - G6 * ax_t - alfa;
    const BP_2 = den2 > 0 ? num2 / den2 : 0.0;

    const BP = deathBenefitType === 'paid_premiums' ? BP_2 : BP_1;
    const NP = deathBenefitType === 'paid_premiums' ? vals.NP_2 : vals.NP_1;

    return { ...vals, ...expenses, alfa, BP_1, BP_2, BP, NP,
             interestRate: this.engine.getInterestRate() };
  }

  // ─── Расчёт премии по заданной СС ────────────────────────────────────────────

  calculatePremium(dob, gender, term, frequency, sumAssured,
                   deathBenefitType = 'full_sum_assured', kMult = 1.0, lAdd = 0.0) {
    const x    = PolicyCalculator.calculateAge(dob);
    const t    = frequency === 'single' ? 1 : term;
    const vals = this.calcGrossPremiumRate(x, term, t, gender, deathBenefitType, kMult, lAdd);

    const { BP, NP, interestRate } = vals;
    const freqFactor = this._freqFactor(frequency);

    let annualPremium, grossPremium;
    if (frequency === 'single') {
      grossPremium  = roundHalfUp(BP * sumAssured);
      annualPremium = grossPremium;
    } else {
      annualPremium = roundHalfUp(BP * sumAssured);
      grossPremium  = roundHalfUp(BP * sumAssured * freqFactor);
    }

    return {
      age: x, term, paymentTerm: t, gender, frequency, deathBenefitType,
      sumAssured, interestRate,
      BP_rate: BP, BP_1: vals.BP_1, BP_2: vals.BP_2, NP_rate: NP,
      annualPremium, grossPremium,
      netPremium: NP * sumAssured,
      freqFactor,
      actuarial: vals,
    };
  }

  // ─── Расчёт СС по заданной премии ────────────────────────────────────────────

  calculateSumAssured(dob, gender, term, frequency, premium,
                      deathBenefitType = 'full_sum_assured', kMult = 1.0, lAdd = 0.0) {
    const x    = PolicyCalculator.calculateAge(dob);
    const t    = frequency === 'single' ? 1 : term;
    const vals = this.calcGrossPremiumRate(x, term, t, gender, deathBenefitType, kMult, lAdd);

    const { BP, NP, interestRate } = vals;
    const freqFactor = this._freqFactor(frequency);

    let sumAssured;
    if (frequency === 'single') {
      sumAssured = BP > 0 ? roundHalfUp(premium / BP) : 0.0;
    } else {
      sumAssured = BP > 0 ? roundHalfUp(premium / (BP * freqFactor)) : 0.0;
    }

    const annualPremium = roundHalfUp(BP * sumAssured);
    const grossPremium  = frequency === 'single'
      ? annualPremium
      : roundHalfUp(BP * sumAssured * freqFactor);

    return {
      age: x, term, paymentTerm: t, gender, frequency, deathBenefitType,
      sumAssured, interestRate,
      BP_rate: BP, BP_1: vals.BP_1, BP_2: vals.BP_2, NP_rate: NP,
      annualPremium, grossPremium,
      netPremium: NP * sumAssured,
      freqFactor,
      actuarial: vals,
    };
  }

  // ─── Обратный расчёт с учётом райдеров (3-фазный солвер) ────────────────────

  /**
   * Рассчитать СС по общей премии с учётом выбранных райдеров.
   * Фаза 1: бинарный поиск (гладкая функция)
   * Фаза 2: аналитическое решение
   * Фаза 3: refinement (перебор ближайших кандидатов)
   */
  calculateSumAssuredWithRiders(dob, gender, term, frequency, totalPremium,
                                deathBenefitType, ridersCalc, saLinkedKeys, fixedRiders,
                                kMult = 1.0, lAdd = 0.0) {
    if (!totalPremium || !term) {
      return this.calculateSumAssured(dob, gender, term, frequency, 0,
                                      deathBenefitType, kMult, lAdd);
    }

    const x    = PolicyCalculator.calculateAge(dob);
    const t    = frequency === 'single' ? 1 : term;
    const vals = this.calcGrossPremiumRate(x, term, t, gender, deathBenefitType, kMult, lAdd);
    const { BP: bpRate, NP, interestRate, BP_1, BP_2 } = vals;

    if (!bpRate) {
      return this.calculateSumAssured(dob, gender, term, frequency, 0,
                                      deathBenefitType, kMult, lAdd);
    }

    const freqFactor = this._freqFactor(frequency);

    // Суммарный тариф SA-linked допов
    let saLinkedTariffSum = 0.0;
    for (const rk of saLinkedKeys) {
      saLinkedTariffSum += this._getSimpleRiderGrossTariff(rk);
    }

    // Фиксированная часть (fixed-sum допы)
    let fixedTotal = 0.0;
    for (const [rk, rs] of fixedRiders) {
      const riderSum = parseFloat(rs);
      if (riderSum > 0) {
        const r = ridersCalc.calculateSimpleRider(rk, riderSum, term, frequency);
        fixedTotal += r.riderPremium;
      }
    }

    // Вспомогательные функции подсчёта суммарной премии
    const tpSmooth = (sa) => {
      const sac  = roundHalfUp(sa);
      const main = frequency === 'single'
        ? bpRate * sac
        : bpRate * sac * freqFactor;
      let linked = 0;
      for (const rk of saLinkedKeys) {
        linked += ridersCalc.calculateSimpleRider(rk, sac, term, frequency).riderPremium;
      }
      return main + linked + fixedTotal;
    };

    const tpRound = (sa) => {
      const sac  = roundHalfUp(sa);
      const main = frequency === 'single'
        ? roundHalfUp(bpRate * sac)
        : roundHalfUp(bpRate * sac * freqFactor);
      let linked = 0;
      for (const rk of saLinkedKeys) {
        linked += ridersCalc.calculateSimpleRider(rk, sac, term, frequency).riderPremium;
      }
      return main + linked + fixedTotal;
    };

    // Фаза 1: Бинарный поиск
    let saEst = frequency === 'single'
      ? totalPremium / bpRate * 2
      : totalPremium / (bpRate * freqFactor) * 2;

    let saLo = 0.0, saHi = saEst;
    while (tpSmooth(saHi) < totalPremium) {
      saHi *= 2;
      if (saHi > 1e15) break;
    }
    for (let iter = 0; iter < 300; iter++) {
      const mid = (saLo + saHi) / 2;
      if (tpSmooth(mid) < totalPremium) saLo = mid; else saHi = mid;
      if (saHi - saLo < 1e-6) break;
    }
    const saSmooth = (saLo + saHi) / 2;

    // Фаза 2: Аналитическое решение
    const totalRate = (bpRate + saLinkedTariffSum) * (frequency === 'single' ? 1.0 : freqFactor);
    const saCont    = totalRate > 0 ? (totalPremium - fixedTotal) / totalRate : saSmooth;

    // Фаза 3: Refinement — перебор кандидатов
    let bestSA   = saSmooth;
    let bestDiff = Math.abs(tpRound(saSmooth) - totalPremium);

    const candidates = [];
    for (let off = -5; off <= 5; off++) candidates.push(Math.round(saSmooth) + off);
    for (const d of [-0.5, -0.25, -0.1, -0.01, 0, 0.01, 0.1, 0.25, 0.5]) candidates.push(saSmooth + d);
    candidates.push(saCont);
    for (let off = -5; off <= 5; off++) candidates.push(Math.round(saCont) + off);
    for (const d of [-0.5, -0.25, -0.1, -0.01, 0, 0.01, 0.1, 0.25, 0.5]) candidates.push(saCont + d);

    for (const sa of candidates) {
      if (sa <= 0) continue;
      const diff = Math.abs(tpRound(sa) - totalPremium);
      if (diff < bestDiff) { bestDiff = diff; bestSA = sa; }
    }

    const sumAssured    = Math.round(bestSA * 100) / 100;
    const annualPremium = bpRate * sumAssured;
    const grossPremium  = frequency === 'single'
      ? roundHalfUp(annualPremium)
      : roundHalfUp(bpRate * sumAssured * freqFactor);

    return {
      age: x, term, paymentTerm: t, gender, frequency, deathBenefitType,
      sumAssured, interestRate,
      BP_rate: bpRate, BP_1, BP_2, NP_rate: NP,
      annualPremium, grossPremium,
      netPremium: NP * sumAssured,
      freqFactor,
      actuarial: vals,
    };
  }

  _getSimpleRiderGrossTariff(riderKey) {
    const rc = this.config.riders?.[riderKey] ?? {};
    const bt = rc.tariff ?? 0.0;
    return roundHalfUp(bt * (1.0 + (rc.expenses ?? 0)) / (1.0 - (rc.acquisition ?? 0)), 4);
  }

  // ─── Таблица резервов ─────────────────────────────────────────────────────────

  /**
   * Рассчитать резервы и выкупные суммы по годам.
   *
   * Формула резерва (Ax-based):
   *   reserve_rate = Ax:n_k + G7×ax:n_k + BP×(alfa_k + G6×ax:t_k − ax:t_k)
   *
   * Для paid_premiums — выкупная сумма считается через IAx:n_k.
   */
  calculateReserves(dob, gender, term, frequency, sumAssured,
                    deathBenefitType = 'full_sum_assured', kMult = 1.0, lAdd = 0.0) {
    const x    = PolicyCalculator.calculateAge(dob);
    const t    = frequency === 'single' ? 1 : term;
    const comm = this.engine.getCommutationTable(gender, kMult, lAdd);

    const base     = this._actuarialValues(comm, x, term, t);
    const expenses = this._getExpenses(t);
    const { G6, G7 } = expenses;
    const alfa0 = this._calcAlfa(expenses, base, t);

    let BP;
    if (deathBenefitType === 'paid_premiums') {
      const num = base.Ex_n + G7 * base.ax_n;
      const den = base.ax_t - base.IAx_n - G6 * base.ax_t - alfa0;
      BP = den > 0 ? num / den : 0.0;
    } else {
      const num = base.Ax_n + G7 * base.ax_n;
      const den = base.ax_t - G6 * base.ax_t - alfa0;
      BP = den > 0 ? num / den : 0.0;
    }

    const Dx  = comm.Dx(x);
    const Mxn = comm.Mx(x + term);
    const Dxn = comm.Dx(x + term);
    const Nxn = comm.Nx(x + term);
    const Nxt = comm.Nx(x + t);
    const Rxn = comm.Rx(x + term);

    const reserves = [];

    for (let k = 1; k <= term; k++) {
      const xk  = x + k;
      const Dxk = comm.Dx(xk);

      if (Dxk === 0) {
        reserves.push({ year: k, age: xk, reserveRate: 0, surrenderRate: 0,
                        reserve: 0, surrender: 0, reducedSA: 0 });
        continue;
      }

      const Mxk = comm.Mx(xk);
      const Nxk = comm.Nx(xk);
      const Rxk = comm.Rx(xk);

      const Ax_n_k = (Mxk - Mxn + Dxn) / Dxk;
      const Ex_n_k = Dxn / Dxk;
      const ax_n_k = (Nxk - Nxn) / Dxk;
      const ax_t_k = k < t ? (Nxk - Nxt) / Dxk : 0.0;

      // Остаточная аквизиционная нагрузка alfa_k
      let alfa_k = 0.0;
      if (t > 1) {
        if (k === 1) {
          alfa_k = expenses.G3;
          if (expenses.G4 > 0 && Dxk > 0) alfa_k += expenses.G4 * comm.Dx(x + 2) / Dxk;
          if (expenses.G5 > 0 && Dxk > 0) alfa_k += expenses.G5 * comm.Dx(x + 3) / Dxk;
        } else if (k === 2) {
          alfa_k = expenses.G4 ?? 0.0;
          if (expenses.G5 > 0 && Dxk > 0) alfa_k += expenses.G5 * comm.Dx(x + 3) / Dxk;
        } else if (k === 3) {
          alfa_k = expenses.G5 ?? 0.0;
        }
      }

      // Резерв (Ax-based) — одинаков для обоих типов выплаты
      const reserveRate = Ax_n_k + G7 * ax_n_k + BP * (alfa_k + G6 * ax_t_k - ax_t_k);

      // Выкупная сумма
      let surrenderReserve;
      let IAx_n_k = 0.0;
      if (deathBenefitType === 'paid_premiums') {
        IAx_n_k       = (Rxk - Rxn - (term - k) * Mxn) / Dx;
        surrenderReserve = Ex_n_k + G7 * ax_n_k + BP * IAx_n_k + BP * (alfa_k + G6 * ax_t_k - ax_t_k);
      } else {
        surrenderReserve = reserveRate;
      }

      const G8          = this.surrenderPenalty;
      const surrenderRate = surrenderReserve - (1.0 - surrenderReserve) * G8;

      const reserve  = reserveRate * sumAssured;
      let   surrender = Math.max(surrenderRate * sumAssured, 0.0);
      if (k === term) surrender = sumAssured;

      const reducedSA = Ax_n_k > 0 ? roundHalfUp(surrender / Ax_n_k) : 0;

      reserves.push({
        year: k, age: xk,
        Ax_n_k, Ex_n_k, ax_n_k, ax_t_k, IAx_n_k, alfa_k,
        reserveRate, surrenderRate,
        reserve:   Math.round(reserve * 100) / 100,
        surrender: Math.round(surrender * 100) / 100,
        reducedSA,
      });
    }

    return reserves;
  }

  // ─── Бонусы ───────────────────────────────────────────────────────────────────

  /**
   * Рассчитать бонусы по годам.
   * Начиная с 3-го года: bonus_k = surrender_{k-1} × bonusRate (5%)
   *
   * Бонусная СС:
   *   год 3: bonus_sa = ROUND(bonus / (Ax:n_k + ax:n_k × G7), 0)
   *   год 4+: bonus_sa += ROUND(bonus / Ax:n_k, 0)
   */
  calculateBonus(reserves, sumAssured) {
    const { bonusRate, expenses: { G7 } } = this;
    const result = [];
    let cumulativeBonusSA = 0.0;

    for (let i = 0; i < reserves.length; i++) {
      const r   = reserves[i];
      const k   = r.year;
      let bonus = 0.0;
      let bonusSAIncrement = 0.0;

      if (k >= 3 && i > 0) {
        const prevSurrender = reserves[i - 1].surrender;
        if (prevSurrender > 0) {
          bonus = roundHalfUp(prevSurrender * bonusRate);
          const { Ax_n_k, ax_n_k } = r;
          if (k === 3) {
            const denom = Ax_n_k + ax_n_k * G7;
            bonusSAIncrement = denom > 0 ? roundHalfUp(bonus / denom) : 0;
          } else {
            bonusSAIncrement = Ax_n_k > 0 ? roundHalfUp(bonus / Ax_n_k) : 0;
          }
          cumulativeBonusSA += bonusSAIncrement;
        }
      }

      result.push({
        year: k,
        bonus,
        bonusSAIncrement,
        cumulativeBonusSA: roundHalfUp(cumulativeBonusSA),
        totalSAWithBonus:  roundHalfUp(sumAssured + cumulativeBonusSA),
      });
    }

    return result;
  }

  // ─── Аннуитет ─────────────────────────────────────────────────────────────────

  /**
   * Рассчитать аннуитетные выплаты.
   *
   * a = ((1 − v^(gp×m)) / (v × d_m)
   *      + m × ((N(x+n+gp) − N(x+n+n_ann)) / D(x+n)
   *             − (m−1)/(2m) × (1 − D(x+n+n_ann)/D(x+n)))
   *      ) × (1 + annuity_expense)
   *
   * Аннуитет = ROUND(SA / a, 0)
   */
  calculateAnnuity(x, n, sumAssured, annuityFrequency = 'annual', annuityTerm = 0,
                   guaranteedPeriod = 0, gender = 'male', kMult = 1.0, lAdd = 0.0) {
    if (annuityTerm <= 0) {
      return { annuityPayment: 0, annuityFactor: 0,
               annuityFrequency, annuityTerm, guaranteedPeriod };
    }

    const i  = this.engine.getInterestRate();
    const freqMap = { annual: 1, semiannual: 2, quarterly: 4, monthly: 12 };
    const m  = freqMap[annuityFrequency] ?? 1;

    const d_m = Math.pow(1.0 + i, 1.0 / m) - 1.0;
    const v_m = d_m > -1.0 ? 1.0 / (1.0 + d_m) : 0.0;

    const comm = this.engine.getCommutationTable(gender, kMult, lAdd);
    const Dxn  = comm.Dx(x + n);

    if (Dxn === 0) {
      return { annuityPayment: 0, annuityFactor: 0,
               annuityFrequency, annuityTerm, guaranteedPeriod };
    }

    const gp    = guaranteedPeriod;
    const nAnn  = annuityTerm;

    const guaranteedPart = (gp > 0 && d_m > 0)
      ? (1.0 - Math.pow(v_m, gp * m)) / (v_m * d_m)
      : 0.0;

    const Nxn_gp  = comm.Nx(x + n + gp);
    const Nxn_ann = comm.Nx(x + n + nAnn);
    const Dxn_ann = comm.Dx(x + n + nAnn);

    const lifePart = m * (
      (Nxn_gp - Nxn_ann) / Dxn
      - ((m - 1.0) / (2.0 * m)) * (1.0 - Dxn_ann / Dxn)
    );

    const addExpense = (nAnn === 1 && m === 1) ? 0.0 : this.annuityExpense;
    const aFactor   = (guaranteedPart + lifePart) * (1.0 + addExpense);
    const annuityPayment = aFactor > 0 ? roundHalfUp(sumAssured / aFactor) : 0;

    return {
      annuityPayment, annuityFactor: aFactor,
      annuityFrequency, annuityTerm, guaranteedPeriod,
      guaranteedPart, lifePart, annuityExpense: addExpense,
    };
  }

  // ─── Полный расчёт ────────────────────────────────────────────────────────────

  /**
   * Полный расчёт: премия + резервы + бонусы + аннуитет.
   *
   * @param {Object} params
   * @param {string} params.dob               — дата рождения 'YYYY-MM-DD'
   * @param {'male'|'female'} params.gender
   * @param {number} params.term              — срок договора (лет)
   * @param {string} params.frequency         — периодичность взносов
   * @param {string} params.deathBenefitType  — 'full_sum_assured' | 'paid_premiums'
   * @param {'sa_to_premium'|'premium_to_sa'} params.mode
   * @param {number} [params.sumAssured]
   * @param {number} [params.premium]
   * @param {string} [params.annuityFrequency]
   * @param {number} [params.annuityTerm]
   * @param {number} [params.guaranteedPeriod]
   * @param {Object} [params.ridersCalc]
   * @param {string[]} [params.saLinkedKeys]
   * @param {Array}  [params.fixedRiders]
   */
  fullCalculation(params, ridersCalc = null) {
    const {
      dob, gender, term, frequency,
      deathBenefitType = 'full_sum_assured',
      mode = 'sa_to_premium',
      annuityFrequency = 'annual',
      annuityTerm = 0,
      guaranteedPeriod = 0,
      saLinkedKeys = [],
      fixedRiders = [],
      kMult = 1.0,
      lAdd = 0.0,
    } = params;

    let result, sumAssured;

    if (mode === 'sa_to_premium') {
      result     = this.calculatePremium(dob, gender, term, frequency,
                                         params.sumAssured, deathBenefitType, kMult, lAdd);
      sumAssured = params.sumAssured;
    } else {
      if (ridersCalc && (saLinkedKeys.length > 0 || fixedRiders.length > 0)) {
        result = this.calculateSumAssuredWithRiders(
          dob, gender, term, frequency, params.premium,
          deathBenefitType, ridersCalc, saLinkedKeys, fixedRiders, kMult, lAdd,
        );
      } else {
        result = this.calculateSumAssured(dob, gender, term, frequency, params.premium,
                                          deathBenefitType, kMult, lAdd);
      }
      sumAssured = result.sumAssured;
    }

    const reserves = this.calculateReserves(dob, gender, term, frequency, sumAssured,
                                            deathBenefitType, kMult, lAdd);
    const bonuses  = this.calculateBonus(reserves, sumAssured);

    const x      = PolicyCalculator.calculateAge(dob);
    const annuity = this.calculateAnnuity(x, term, sumAssured, annuityFrequency,
                                          annuityTerm, guaranteedPeriod, gender, kMult, lAdd);

    return { ...result, reserves, bonuses, annuity,
             annuityPayment: annuity.annuityPayment };
  }
}
