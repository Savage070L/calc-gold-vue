<template>
  <div class="results-summary" v-if="result">
    <div class="top-badges" :class="{ 'has-annuity': result.annuityPayment > 0 }">
      <div class="summary-badge badge-sa">
        <span class="badge-label">СТРАХОВАЯ СУММА <InfoTooltip v-bind="TIP.sumAssured" /></span>
        <span class="badge-value" :style="badgeFontStyle(animated.sumAssured)">{{ fmtTopValue(animated.sumAssured) }}</span>
      </div>

      <div class="summary-badge badge-annuity" v-if="result.annuityPayment > 0">
        <span class="badge-label">АННУИТЕТНЫЕ ВЫПЛАТЫ <InfoTooltip v-bind="TIP.annuityTop" /></span>
        <span class="badge-value" :style="badgeFontStyle(animated.annuityPayment)">{{ fmtTopValue(animated.annuityPayment) }}</span>
      </div>

      <div class="summary-badge badge-premium">
        <span class="badge-label">ИТОГО ПРЕМИЯ <InfoTooltip v-bind="TIP.totalPremium" /></span>
        <span class="badge-value" :style="badgeFontStyle(animated.totalPremium)">{{ fmtTopValue(animated.totalPremium) }}</span>
      </div>
    </div>

    <div class="total-block">
      <h3 class="detail-toggle" @click="showDetails = !showDetails">
        <span class="icon">💰</span> Детализация по покрытиям <InfoTooltip v-bind="TIP.details" />
        <span class="detail-arrow">{{ showDetails ? '▲' : '▼' }}</span>
      </h3>
      <div v-show="showDetails" class="detail-body">
        <div class="total-header-row">
          <span class="hcol-label"><span class="hcol-full">Покрытие</span><span class="hcol-short">Покрытие</span> <InfoTooltip v-bind="TIP.colCoverage" /></span>
          <span class="hcol-sum"><span class="hcol-full">Страховая сумма</span><span class="hcol-short">Сумма</span> <InfoTooltip v-bind="TIP.colSum" /></span>
          <span class="hcol-prem"><span class="hcol-full">Премия</span><span class="hcol-short">Премия</span> <InfoTooltip v-bind="TIP.colPremium" /></span>
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

        <div v-if="result.annuityPayment > 0" class="detail-summary-card annuity-card">
          <div class="dsc-left">
            <span class="dsc-title">Аннуитетная выплата</span>
            <span class="dsc-sub">в течении {{ annuityTermText }} с гарант. периодом {{ guaranteedPeriodText }}, периодичностью "{{ annuityFreqLabel }}"</span>
          </div>
          <span class="dsc-value">{{ fmtP(animated.annuityPayment) }}</span>
        </div>

        <div class="detail-summary-card sa-card">
          <div class="dsc-left">
            <span class="dsc-title">Страховая сумма</span>
            <span class="dsc-sub">{{ saDescription }}</span>
          </div>
          <span class="dsc-value">{{ fmtP(animated.sumAssured) }}</span>
        </div>

        <div class="detail-summary-card premium-card">
          <div class="dsc-left">
            <span class="dsc-title">Итого премия</span>
            <span class="dsc-sub">в течении {{ termText }} с периодичностью "{{ premiumFreqLabel }}"</span>
          </div>
          <span class="dsc-value">{{ fmtP(animated.totalPremium) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { formatMoney } from '../composables/useInsuranceCalc.js';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';
import InfoTooltip from './InfoTooltip.vue';

const showDetails = ref(true);
const isMobile = ref(false);
onMounted(() => {
  isMobile.value = window.innerWidth <= 720;
  if (isMobile.value) showDetails.value = false;
});

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

// Адаптивный размер шрифта для верхних бейджей
function badgeFontStyle(kzt) {
  const text = fmtTopValue(kzt);
  const len = text.length;
  // Короткие значения — без изменений (CSS по умолчанию)
  if (len <= 9) return {};
  // Чем длиннее — тем меньше шрифт
  const scale = Math.max(0.45, 9 / len);
  return { fontSize: `calc(var(--badge-base-size, 1em) * ${scale.toFixed(2)})` };
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

const saDescription = computed(() => {
  const parts = ['По Основному покрытию'];
  const riders = props.result?.riders ?? {};
  if (riders.accidental_death?.riderPremium > 0) parts.push('при Смерти от НС');
  if (riders.disability_accident_lumpsum?.riderPremium > 0) parts.push('при Инвалидности 1 или 2 гр. от НС');
  return parts.join(', ');
});
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
  border-radius: 16px;
  padding: 14px 20px;
  box-shadow: var(--shadow-out);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 4px;
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
  --badge-base-size: clamp(40px, 4.2vw, 86px);
  font-size: var(--badge-base-size);
  font-weight: 800;
  line-height: 1.02;
  white-space: nowrap;
}
.top-badges.has-annuity .badge-value {
  --badge-base-size: clamp(32px, 2.8vw, 56px);
  font-size: var(--badge-base-size);
}

/* ── Badge color themes ───────────────── */
.badge-sa {
  background: linear-gradient(to right, #BBD034, #47903C);
}
.badge-sa .badge-label,
.badge-sa .badge-value { color: #fff; -webkit-text-fill-color: #fff; }

.badge-annuity {
  background: linear-gradient(to right, #294A69, #293C53);
}
.badge-annuity .badge-label,
.badge-annuity .badge-value { color: #fff; -webkit-text-fill-color: #fff; }

.badge-premium {
  background: linear-gradient(to right, #456E94, #2D5171);
}
.badge-premium .badge-label,
.badge-premium .badge-value { color: #fff; -webkit-text-fill-color: #fff; }

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
  min-height: auto;
  padding: 12px 18px;
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
  background: var(--surface, #F5F8FF);
  color: #1B2838;
  border-radius: var(--radius, 20px);
  padding: 20px;
  box-shadow: var(--shadow-out, 0 4px 16px rgba(0,0,0,0.08));
  animation: fadeInCard 0.55s ease-out both;
}
.detail-toggle {
  cursor: pointer;
  user-select: none;
}
.detail-arrow {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.5;
}
.total-block h3 {
  color: #1B2838; margin-bottom: 0; font-size: 22px;
  display: flex; align-items: center; gap: 8px;
}
.detail-body { margin-top: 12px; }
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
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.hcol-label, .hcol-sum, .hcol-prem {
  font-size: 13px; text-transform: uppercase;
  letter-spacing: 0.5px; opacity: 0.5; font-weight: 700;
}
.hcol-label { text-align: left; }
.hcol-sum, .hcol-prem { text-align: center; }
.hcol-short { display: none; }

.total-row { padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
.total-row:last-of-type { border-bottom: none; }
.total-row.two-col { grid-template-columns: minmax(0, 1fr) auto; border-bottom: none; }
.total-row.two-col .total-label { grid-column: auto; }

.total-label { font-size: 18px; opacity: 0.9; }
.total-label.strong { font-size: 22px; font-weight: 700; opacity: 1; }
.total-sum {
  font-family: 'SF Mono', monospace;
  font-size: 18px; font-weight: 700;
  text-align: center; color: #2E7D32;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.total-value {
  font-family: 'SF Mono', monospace;
  font-size: 18px; font-weight: 700;
  text-align: center; color: #1565C0;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.total-value.big {
  font-size: 32px; text-align: right;
  background: linear-gradient(135deg, #42A5F5, #66BB6A);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  display: block; white-space: nowrap; line-height: 1.1;
}
.total-divider { display: none; }
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
  gap: 10px; align-items: start;
  font-size: 22px; font-weight: 700; opacity: 1;
}
.annuity-label-wrap { display: block; }
.annuity-period-note {
  display: block;
  margin-top: 3px;
  font-size: 15px;
  font-weight: 500;
  opacity: 0.72;
  text-transform: none;
  letter-spacing: 0;
}
.annuity-val {
  font-family: 'SF Mono', monospace;
  font-size: 32px; font-weight: 800;
  background: linear-gradient(135deg, #43A047, #66BB6A, #A5D6A7);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}

/* ── Detail summary cards ───────────────── */
.detail-summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-radius: 14px;
  margin-top: 10px;
}
.dsc-left { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; margin-right: 12px; }
.dsc-title { font-size: 16px; font-weight: 700; }
.dsc-sub { font-size: 12px; opacity: 0.55; }
.dsc-value {
  font-family: 'SF Mono', monospace;
  font-size: 26px; font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
}
.dsc-value.blue {
  background: linear-gradient(135deg, #1565C0, #42A5F5);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.dsc-value.green {
  background: linear-gradient(135deg, #2E7D32, #66BB6A);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
/* Страховая сумма — зелёный */
.sa-card {
  background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
}
.sa-card .dsc-title { color: #1B5E20; }
.sa-card .dsc-sub { color: #4E7D52; opacity: 1; }
.sa-card .dsc-value { color: #1B5E20; -webkit-text-fill-color: #1B5E20; background: none; }

/* Аннуитетная выплата — тёмно-синий */
.annuity-card {
  background: linear-gradient(135deg, #1B2838, #263848);
}
.annuity-card .dsc-title { color: #E8F4FD; }
.annuity-card .dsc-sub { color: #8EAFC4; opacity: 1; }
.annuity-card .dsc-value { color: #fff; -webkit-text-fill-color: #fff; background: none; }

/* Итого премия — синий */
.premium-card {
  background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
}
.premium-card .dsc-title { color: #0D47A1; }
.premium-card .dsc-sub { color: #546E8A; opacity: 1; }
.premium-card .dsc-value { color: #0D47A1; -webkit-text-fill-color: #0D47A1; background: none; }

@media (max-width: 860px) {
  .top-badges, .top-badges.has-annuity {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .summary-badge {
    min-height: auto;
    border-radius: 14px;
    padding: 10px 12px;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .top-badges.has-annuity .summary-badge {
    min-height: auto;
    padding: 10px 12px;
  }
  .badge-value { --badge-base-size: clamp(28px, 12vw, 56px); font-size: var(--badge-base-size); white-space: nowrap; }
  .top-badges.has-annuity .badge-value { --badge-base-size: clamp(24px, 11vw, 50px); font-size: var(--badge-base-size); }
  .badge-freq { font-size: clamp(11px, 3.5vw, 14px); }
  .badge-label { font-size: clamp(11px, 4vw, 16px); white-space: nowrap; }
  .badge-sub { font-size: clamp(9px, 3vw, 12px); }
  .badge-meta { margin-top: 2px; gap: 2px; }
}

@media (max-width: 720px) {
  .total-block { padding: 6px; border-radius: 12px; box-shadow: 0 3px 12px rgba(0,0,0,0.2), 0 0 0 1px rgba(66,165,245,0.08); overflow: hidden; }
  .total-block h3 { font-size: clamp(11px, 3.5vw, 13px); gap: 6px; margin-bottom: 8px; }
  .total-block h3 .icon { width: 26px; height: 26px; font-size: 14px; }

  .total-header-row, .total-row {
    grid-template-columns: 1fr 1fr 0.6fr;
    gap: 2px;
  }
  .total-header-row { padding-bottom: 5px; margin-bottom: 3px; }
  .hcol-full { display: none; }
  .hcol-short { display: inline; }
  .hcol-label, .hcol-sum, .hcol-prem {
    font-size: clamp(5px, 2vw, 7px);
    letter-spacing: 0.2px;
  }
  .total-row {
    padding: 5px 0;
  }
  .total-label { font-size: clamp(7px, 2.8vw, 10px); }
  .total-sum,
  .total-value {
    font-size: clamp(7px, 2.8vw, 10px);
  }

  .total-row.two-col {
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 6px;
  }
  .total-row.two-col .total-label {
    grid-column: auto;
    font-size: 14px;
  }
  .total-row.two-col .total-sum { display: none; }
  .total-row.two-col .total-value.big {
    font-size: clamp(16px, 5.5vw, 24px);
    text-align: right;
    white-space: nowrap;
  }
  .term-period-note {
    font-size: 7px;
    margin-top: 2px;
  }
  .annuity-period-note {
    font-size: 7px;
    margin-top: 2px;
  }
  .annuity-row {
    font-size: clamp(10px, 3.5vw, 14px);
    align-items: start;
  }
  .annuity-val { font-size: clamp(16px, 5.5vw, 24px); }
}

@media (max-width: 400px) {
  .total-block { padding: 4px; max-width: 100%; }
  .total-header-row, .total-row {
    grid-template-columns: 0.9fr 1fr 0.6fr;
    gap: 1px;
  }
  .total-label { font-size: 7px; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .total-sum, .total-value { font-size: 7px; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .hcol-label, .hcol-sum, .hcol-prem { font-size: 5px; }
  .total-row.two-col .total-label { font-size: 11px; }
  .total-row.two-col .total-value.big { font-size: clamp(14px, 5vw, 20px); white-space: nowrap; }
  .annuity-row { font-size: 11px; }
  .annuity-val { font-size: clamp(14px, 5vw, 20px); white-space: nowrap; }
  .annuity-box { overflow: hidden; }
}
</style>
