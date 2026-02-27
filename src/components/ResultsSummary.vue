<template>
  <div class="results-summary" v-if="result">
    <div class="top-badges" :class="{ 'has-annuity': result.annuityPayment > 0 }">
      <div class="summary-badge">
        <span class="badge-label">СТРАХОВАЯ СУММА <InfoTooltip v-bind="TIP.sumAssured" /></span>
        <span class="badge-value blue">{{ fmtTopValue(animated.sumAssured) }}</span>
      </div>

      <div class="summary-badge" v-if="result.annuityPayment > 0">
        <span class="badge-label">АННУИТЕТНАЯ ВЫПЛАТА <InfoTooltip v-bind="TIP.annuityTop" /></span>
        <span class="badge-value green">{{ fmtTopValue(animated.annuityPayment) }}</span>
        <div class="badge-meta">
          <span class="badge-freq">Периодичность: {{ annuityFreqLabel }}</span>
          <span class="badge-sub">Срок выплат: {{ annuityTermText }}; Гарант. период: {{ guaranteedPeriodText }}</span>
        </div>
      </div>

      <div class="summary-badge">
        <span class="badge-label">ИТОГО ПРЕМИЯ <InfoTooltip v-bind="TIP.totalPremium" /></span>
        <span class="badge-value green">{{ fmtTopValue(animated.totalPremium) }}</span>
        <div class="badge-meta">
          <span class="badge-freq">Периодичность: {{ premiumFreqLabel }}</span>
        </div>
      </div>
    </div>

    <div class="total-block">
      <h3><span class="icon">💰</span> Детализация по покрытиям <InfoTooltip v-bind="TIP.details" /></h3>
      <div class="total-header-row">
        <span class="hcol-label">Покрытие <InfoTooltip v-bind="TIP.colCoverage" /></span>
        <span class="hcol-sum">Страховая сумма <InfoTooltip v-bind="TIP.colSum" /></span>
        <span class="hcol-prem">Премия <InfoTooltip v-bind="TIP.colPremium" /></span>
      </div>

      <div class="total-row">
        <span class="total-label">Основное покрытие</span>
        <span class="total-sum">{{ fmtP(animated.sumAssured) }}</span>
        <span class="total-value">{{ fmtP(animated.grossPremium) }}</span>
      </div>

      <div v-for="row in coverageRows" :key="row.key" class="total-row">
        <span class="total-label">{{ row.label }}</span>
        <span class="total-sum">{{ fmtRiderSum(row.key, animatedRiders[row.key]?.sum ?? row.sum) }}</span>
        <span class="total-value">{{ fmtP(animatedRiders[row.key]?.premium ?? row.premium) }}</span>
      </div>

      <div v-if="result.annuityPayment > 0" class="annuity-box">
        <div class="annuity-row">
          <span>Аннуитетная выплата <span class="freq-label">({{ annuityFreqLabel }})</span></span>
          <span class="annuity-val">{{ fmtP(animated.annuityPayment) }}</span>
        </div>
      </div>

      <div class="total-divider"></div>
      <div class="total-row two-col">
        <span class="total-label strong">
          ИТОГО ПРЕМИЯ
          <span class="term-period-note">в течении {{ termText }} с периодичностью "{{ premiumFreqLabel }}"</span>
        </span>
        <span class="total-value big">{{ fmtP(animated.totalPremium) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import { formatMoney } from '../composables/useInsuranceCalc.js';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';
import InfoTooltip from './InfoTooltip.vue';

const { usdRate, currencyMode, toUsdStr } = useCurrencyRate();
const isUsdMode = computed(() => currencyMode.value === 'USD' && !!usdRate.value);

function fmtP(kzt) {
  return isUsdMode.value ? (toUsdStr(kzt) ?? fmt(kzt)) : fmt(kzt);
}

function fmtTopValue(kzt) {
  if (isUsdMode.value && usdRate.value) {
    const usd = Math.round((Number(kzt) || 0) / usdRate.value);
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(usd) + '\u00A0$';
  }
  const kztVal = Math.round(Number(kzt) || 0);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(kztVal) + '\u00A0₸';
}

const KZT_FIXED_RIDERS = new Set(['trauma', 'hospitalization']);
function fmtRiderSum(key, kzt) {
  return KZT_FIXED_RIDERS.has(key) ? fmt(kzt) : fmtP(kzt);
}

const TIP = {
  sumAssured: {
    title: 'Страховая сумма',
    text: 'Ключевой параметр вашего полиса, определяющий <b>масштаб накоплений и защиты</b>.<br><br>На протяжении всего срока эта сумма обеспечивает сохранность вашего финансового плана. К концу полиса накопленный капитал выплачивается вам.<br><br>Чем выше страховая сумма — тем значительнее итоговые накопления.',
  },
  totalPremium: {
    title: 'Итого взнос',
    text: 'Ваш регулярный вклад в формирование капитала с учётом <b>всех выбранных покрытий</b>.<br><br>Большая часть взноса направляется на <b>накопления</b>, которые растут с гарантированным доходом. Меньшая часть — на защиту вашего плана.<br><br>Сумма указана в выбранной вами периодичности.',
  },
  details: {
    title: 'Детализация по покрытиям',
    text: 'Разбивка взноса по каждому виду защиты.<br><br>Основу составляет <b>накопительное покрытие</b> — именно оно формирует ваш капитал. Дополнительные покрытия (райдеры) защищают ваш план от непредвиденных событий, не затрагивая накопленные средства.',
  },
  colCoverage: {
    title: 'Покрытие',
    text: 'Вид защиты в рамках вашего полиса.<br><br><b>Основное покрытие</b> — накопительная программа, которая формирует ваш капитал. <b>Дополнительные покрытия</b> (райдеры) — надбавки, защищающие ваш план и доход от конкретных рисков.',
  },
  colSum: {
    title: 'Страховая сумма',
    text: 'Размер защиты по данному виду покрытия.<br><br>Для основного покрытия — это также ориентир вашего итогового капитала. Для дополнительных покрытий — сумма поддержки при конкретном страховом случае.',
  },
  colPremium: {
    title: 'Взнос по покрытию',
    text: 'Часть вашего общего взноса, направленная на данный вид защиты.<br><br>Взнос по основному покрытию — это ваш вклад в накопления. Взносы по райдерам — стоимость дополнительной защиты плана.<br><br>Сумма всех взносов = итоговый взнос по полису.',
  },
  annuityTop: {
    title: 'Аннуитетная выплата',
    text: 'Регулярная выплата из накопленной суммы при включенном аннуитете. Показывается с выбранной периодичностью и сроком выплат.',
  },
};

const props = defineProps({ result: { type: Object, default: null } });

const FREQ_LABELS = {
  annual: 'Раз в год', semiannual: 'Раз в полгода',
  quarterly: 'Раз в квартал', monthly: 'Раз в месяц', single: 'Единовременный',
};
const RIDER_LABELS = {
  accidental_death: 'Смерть от НС',
  disability_accident_lumpsum: 'Инвалидность I, II гр. от НС',
  trauma: 'Телесные травмы от НС',
  hospitalization: 'Госпитализация от НС',
};

const animated = reactive({ sumAssured: 0, grossPremium: 0, totalPremium: 0, annuityPayment: 0 });
const animatedRiders = reactive({});

const annuityFreqLabel = computed(() => FREQ_LABELS[props.result?.annuity?.annuityFrequency] ?? 'Раз в год');
const premiumFreqLabel = computed(() => FREQ_LABELS[props.result?.frequency] ?? '');
const termText = computed(() => pluralYears(Number(props.result?.term ?? 0)));
const annuityTermText = computed(() => pluralYears(Number(props.result?.annuity?.annuityTerm ?? 0)));
const guaranteedPeriodText = computed(() => pluralYears(Number(props.result?.annuity?.guaranteedPeriod ?? 0)));

const coverageRows = computed(() =>
  Object.entries(props.result?.riders ?? {})
    .filter(([n, r]) => RIDER_LABELS[n] && (r?.riderPremium ?? 0) > 0)
    .map(([n, r]) => ({ key: n, label: RIDER_LABELS[n], sum: r.riderSum ?? 0, premium: r.riderPremium ?? 0 }))
);

function fmt(v) { return formatMoney(v, 'KZT'); }

function pluralYears(years) {
  if (!years) return '0 лет';
  const mod10 = years % 10;
  const mod100 = years % 100;
  if (mod10 === 1 && mod100 !== 11) return `${years} год`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${years} года`;
  return `${years} лет`;
}

function animateTo(key, target, duration = 700) {
  const start = Number(animated[key] || 0), end = Number(target || 0), t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    animated[key] = start + (end - start) * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(tick);
    else animated[key] = end;
  }
  requestAnimationFrame(tick);
}

function animateRider(key, premiumTarget, sumTarget, duration = 700) {
  if (!animatedRiders[key]) animatedRiders[key] = { premium: 0, sum: 0 };
  const slot = animatedRiders[key];
  [['premium', premiumTarget], ['sum', sumTarget]].forEach(([field, target]) => {
    const start = Number(slot[field] || 0), end = Number(target || 0), t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      slot[field] = start + (end - start) * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
      else slot[field] = end;
    }
    requestAnimationFrame(tick);
  });
}

watch(() => props.result, (r) => {
  if (!r) return;
  animateTo('sumAssured', r.sumAssured);
  animateTo('grossPremium', r.grossPremium);
  animateTo('totalPremium', r.totalPremium ?? r.grossPremium);
  animateTo('annuityPayment', r.annuityPayment ?? 0);
  Object.entries(r.riders ?? {}).forEach(([key, rider]) => {
    if ((rider?.riderPremium ?? 0) > 0) {
      animateRider(key, rider.riderPremium ?? 0, rider.riderSum ?? 0);
    }
  });
}, { immediate: true });
</script>

<style scoped>
.results-summary { display: flex; flex-direction: column; gap: 16px; }

@keyframes fadeInCard {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.top-badges {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  animation: fadeInCard 0.3s ease-out both;
}
.top-badges.has-annuity {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.summary-badge {
  background: var(--surface, #F5F8FF);
  border-radius: 22px;
  padding: 22px 24px;
  box-shadow: var(--shadow-out);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 210px;
  gap: 10px;
}

.badge-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: clamp(12px, 0.9vw, 15px);
  font-weight: 800;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.badge-value {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: clamp(40px, 2.9vw, 58px);
  font-weight: 800;
  line-height: 1.02;
  white-space: nowrap;
}

.badge-value.blue {
  background: linear-gradient(135deg, #1565C0, #1976D2, #42A5F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.badge-value.green {
  background: linear-gradient(135deg, #2E7D32, #43A047, #66BB6A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badge-meta {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.badge-freq {
  font-size: clamp(13px, 1vw, 18px);
  font-weight: 700;
  color: var(--text-light);
  opacity: 0.78;
}

.badge-sub {
  font-size: clamp(12px, 0.85vw, 15px);
  color: var(--text-light);
  opacity: 0.88;
  line-height: 1.35;
}

.top-badges.has-annuity .summary-badge {
  min-height: 220px;
  padding: 20px 22px;
}
.top-badges.has-annuity .badge-value {
  font-size: clamp(32px, 2.1vw, 46px);
}
.top-badges.has-annuity .badge-freq {
  font-size: clamp(12px, 0.86vw, 15px);
}
.top-badges.has-annuity .badge-sub {
  font-size: clamp(11px, 0.78vw, 14px);
}

.total-block {
  background: linear-gradient(135deg, #152D4A 0%, #0B1F35 100%);
  color: #E8F4FD;
  border-radius: var(--radius, 20px);
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(66,165,245,0.12);
  animation: fadeInCard 0.55s ease-out both;
}
.total-block h3 {
  color: #E8F4FD; margin-bottom: 12px; font-size: 15px;
  display: flex; align-items: center; gap: 8px;
}
.total-block h3 .icon {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%; background: rgba(66,165,245,0.12);
}

.total-header-row, .total-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 8px; align-items: center;
}
.total-header-row {
  padding-bottom: 8px; margin-bottom: 6px;
  border-bottom: 1px solid rgba(66,165,245,0.18);
}
.hcol-label, .hcol-sum, .hcol-prem {
  font-size: 13px; text-transform: uppercase;
  letter-spacing: 0.5px; opacity: 0.5; font-weight: 700;
}
.hcol-label { text-align: left; }
.hcol-sum, .hcol-prem { text-align: center; }

.total-row { padding: 10px 0; border-bottom: 1px solid rgba(66,165,245,0.08); }
.total-row.two-col { grid-template-columns: minmax(0, 1fr) auto; border-bottom: none; }
.total-row.two-col .total-label { grid-column: auto; }

.total-label { font-size: 18px; opacity: 0.9; }
.total-label.strong { font-size: 22px; font-weight: 700; opacity: 1; }
.total-sum {
  font-family: 'SF Mono', monospace;
  font-size: 18px; font-weight: 600;
  text-align: center; opacity: 0.7;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.total-value {
  font-family: 'SF Mono', monospace;
  font-size: 18px; font-weight: 700;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.total-value.big {
  font-size: 32px; text-align: right;
  background: linear-gradient(135deg, #42A5F5, #66BB6A);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  display: block; white-space: nowrap; line-height: 1.1;
}
.total-divider { border-top: 1px solid rgba(66,165,245,0.12); margin: 10px 0; }
.freq-label {
  font-size: 16px; font-weight: 500; opacity: 0.6;
  text-transform: none; letter-spacing: 0;
}
.term-period-note {
  display: block;
  margin-top: 3px;
  font-size: 15px;
  font-weight: 500;
  opacity: 0.72;
  text-transform: none;
  letter-spacing: 0;
}

.annuity-box { margin-top: 6px; padding: 6px 0; }
.annuity-row {
  display: grid; grid-template-columns: 1fr auto;
  gap: 10px; align-items: center;
  font-size: 22px; font-weight: 700; opacity: 1;
}
.annuity-val {
  font-family: 'SF Mono', monospace;
  font-size: 32px; font-weight: 800;
  background: linear-gradient(135deg, #43A047, #66BB6A, #A5D6A7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

@media (max-width: 860px) {
  .top-badges, .top-badges.has-annuity { grid-template-columns: 1fr; }
  .summary-badge {
    min-height: auto;
    border-radius: 16px;
    padding: 14px 16px;
    gap: 6px;
  }
  .badge-value { font-size: 34px; }
  .badge-freq { font-size: 14px; }
  .badge-label { font-size: 12px; }
  .badge-sub { font-size: 13px; }
}

@media (max-width: 720px) {
  .total-block { padding: 14px; }
  .total-header-row { display: none; }
  .total-row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 12px 0;
  }
  .total-label { font-size: 16px; }
  .total-sum,
  .total-value {
    text-align: left;
    align-items: flex-start;
    font-size: 16px;
  }
  .total-sum::before,
  .total-value::before {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
  }
  .total-sum::before { content: "Страховая сумма"; }
  .total-value::before { content: "Премия"; }

  .total-row.two-col {
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 10px;
  }
  .total-row.two-col .total-label {
    grid-column: auto;
    font-size: 18px;
  }
  .total-row.two-col .total-sum { display: none; }
  .total-row.two-col .total-value.big {
    font-size: 38px;
    text-align: right;
    white-space: nowrap;
  }
  .total-row.two-col .total-value.big::before { display: none; }

  .annuity-row {
    grid-template-columns: 1fr;
    gap: 4px;
    font-size: 16px;
  }
  .annuity-val { font-size: 26px; }
}
</style>
