<template>
  <div class="results-summary" v-if="result">
    <div class="result-section-header" aria-hidden="true">
      <span class="rsh-line"></span>
      <span class="rsh-text">{{ t('results.sectionHeader') }}</span>
      <span class="rsh-line"></span>
    </div>

    <div class="top-badges" :class="{ 'has-annuity': result.annuityPayment > 0 }">
      <div class="summary-badge badge-sa">
        <span class="badge-label" v-fit-text="{ min: 9, max: 15 }">{{ t('results.sumAssured') }} <InfoTooltip v-bind="tip('sumAssured')" /></span>
        <span class="badge-value" v-fit-text="badgeFitOpts">{{ fmtTopValue(animated.sumAssured) }}</span>
      </div>

      <div class="summary-badge badge-annuity" v-if="result.annuityPayment > 0">
        <span class="badge-label" v-fit-text="{ min: 9, max: 15 }">{{ t('results.annuity') }} <InfoTooltip v-bind="tip('annuityTop')" /></span>
        <span class="badge-value" v-fit-text="badgeFitOpts">{{ fmtTopValue(animated.annuityPayment) }}</span>
      </div>

      <div class="summary-badge badge-premium">
        <span class="badge-label" v-fit-text="{ min: 9, max: 15 }">{{ t('results.totalPremium') }} <InfoTooltip v-bind="tip('totalPremium')" /></span>
        <span class="badge-value" v-fit-text="badgeFitOpts">{{ fmtTopValue(animated.totalPremium) }}</span>
      </div>
    </div>

    <div class="total-block">
      <h3 class="detail-toggle" @click="showDetails = !showDetails">
        <span class="icon">💰</span> {{ t('results.detailsTitle') }} <InfoTooltip v-bind="tip('details')" />
        <span class="detail-arrow">{{ showDetails ? '▲' : '▼' }}</span>
      </h3>
      <div v-show="showDetails" class="detail-body">
        <div class="total-header-row">
          <span class="hcol-label"><span class="hcol-full">{{ t('results.colCoverage') }}</span><span class="hcol-short">{{ t('results.colCoverageShort') }}</span> <InfoTooltip v-bind="tip('colCoverage')" /></span>
          <span class="hcol-sum"><span class="hcol-full">{{ t('results.colSum') }}</span><span class="hcol-short">{{ t('results.colSumShort') }}</span> <InfoTooltip v-bind="tip('colSum')" /></span>
          <span class="hcol-prem"><span class="hcol-full">{{ t('results.colPremium') }}</span><span class="hcol-short">{{ t('results.colPremiumShort') }}</span> <InfoTooltip v-bind="tip('colPremium')" /></span>
        </div>

        <div class="total-row">
          <span class="total-label">{{ t('results.baseCoverage') }}</span>
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
            <span class="dsc-title">{{ t('results.annuityCard') }}</span>
            <span class="dsc-sub">{{ t('results.annuityCardSub', { term: annuityTermText, gp: guaranteedPeriodText, freq: annuityFreqLabel }) }}</span>
          </div>
          <span class="dsc-value">{{ fmtP(animated.annuityPayment) }}</span>
        </div>

        <div class="detail-summary-card sa-card">
          <div class="dsc-left">
            <span class="dsc-title">{{ t('results.saCard') }}</span>
            <span class="dsc-sub">{{ saDescription }}</span>
          </div>
          <span class="dsc-value">{{ fmtP(animated.sumAssured) }}</span>
        </div>

        <div class="detail-summary-card premium-card">
          <div class="dsc-left">
            <span class="dsc-title">{{ t('results.premiumCard') }}</span>
            <span class="dsc-sub">{{ t('results.premiumCardSub', { term: termText, freq: premiumFreqLabel }) }}</span>
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
import { useI18n } from '../i18n/index.js';

const { t, tip, pluralYears, dict } = useI18n();

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
    return '$\u00A0' + new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(usd);
  }
  const kztVal = Math.round(Number(kzt) || 0);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(kztVal) + '\u00A0₸';
}

const KZT_FIXED_RIDERS = new Set(['trauma', 'hospitalization']);
function fmtRiderSum(key, kzt) {
  return KZT_FIXED_RIDERS.has(key) ? fmt(kzt) : fmtP(kzt);
}

const props = defineProps({ result: { type: Object, default: null } });

// Options for v-fit-text on the main badge values — shrinks to fit container
const badgeFitOpts = computed(() => ({
  min: 18,
  max: props.result?.annuityPayment > 0 ? 52 : 86,
}));

const FREQ_LABELS = computed(() => dict.value.form.freq);
const ANNUITY_FREQ_LABELS = computed(() => dict.value.form.annuityFreq);
const RIDER_LABELS = computed(() => dict.value.results.riderLabels);

const animated = reactive({ sumAssured: 0, grossPremium: 0, totalPremium: 0, annuityPayment: 0 });
const animatedRiders = reactive({});

const annuityFreqLabel = computed(() => ANNUITY_FREQ_LABELS.value[props.result?.annuity?.annuityFrequency] ?? ANNUITY_FREQ_LABELS.value.annual);

const saDescription = computed(() => {
  const parts = [t('results.byBase')];
  const riders = props.result?.riders ?? {};
  if (riders.accidental_death?.riderPremium > 0) parts.push(t('results.atAccidentalDeath'));
  if (riders.disability_accident_lumpsum?.riderPremium > 0) parts.push(t('results.atDisability'));
  return parts.join(', ');
});
const premiumFreqLabel = computed(() => FREQ_LABELS.value[props.result?.frequency] ?? '');
const termText = computed(() => pluralYears(Number(props.result?.term ?? 0)));
const annuityTermText = computed(() => pluralYears(Number(props.result?.annuity?.annuityTerm ?? 0)));
const guaranteedPeriodText = computed(() => pluralYears(Number(props.result?.annuity?.guaranteedPeriod ?? 0)));

const coverageRows = computed(() =>
  Object.entries(props.result?.riders ?? {})
    .filter(([n, r]) => RIDER_LABELS.value[n] && (r?.riderPremium ?? 0) > 0)
    .map(([n, r]) => ({ key: n, label: RIDER_LABELS.value[n], sum: r.riderSum ?? 0, premium: r.riderPremium ?? 0 }))
);

function fmt(v) { return formatMoney(v) + '\u00A0₸'; }

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

/* Section header — shown only when columns stack (≤1120px) */
.result-section-header { display: none; }
@media (max-width: 1120px) {
  .result-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 2px 0 4px;
  }
  .rsh-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, transparent, rgba(25,118,210,0.25), rgba(25,118,210,0.25), transparent);
  }
  .rsh-text {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--primary, #1976D2);
    white-space: nowrap;
  }
}

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
  justify-content: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  max-width: 100%;
}

.badge-value {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 86px;
  font-weight: 800;
  line-height: 1.02;
  white-space: nowrap;
  max-width: 100%;
}
.top-badges.has-annuity .badge-value {
  font-size: 52px;
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
.top-badges.has-annuity .badge-freq {
  font-size: 14px;
}
.top-badges.has-annuity .badge-sub {
  font-size: 13px;
}

.total-block {
  background: var(--surface, #F5F8FF);
  color: #1B2838;
  border: 2px solid rgba(25,118,210,0.40);
  border-radius: var(--radius, 20px);
  padding: 20px;
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
    overflow: hidden;
  }
  .top-badges.has-annuity .summary-badge {
    min-height: auto;
    padding: 10px 12px;
  }
  .badge-freq { font-size: 14px; }
  .badge-sub { font-size: 12px; }
  .badge-meta { margin-top: 2px; gap: 2px; }
}

@media (max-width: 720px) {
  .detail-summary-card {
    padding: 12px 14px;
    gap: 10px;
  }
  .dsc-left {
    margin-right: 0;
    gap: 2px;
  }
  .dsc-title { font-size: 15px; }
  .dsc-sub { font-size: 11px; }
  .dsc-value {
    font-size: 18px;
  }

  .total-block { padding: 10px; border-radius: 14px; overflow: hidden; }
  .total-block h3 { font-size: 15px; gap: 6px; margin-bottom: 8px; }
  .total-block h3 .icon { width: 28px; height: 28px; font-size: 15px; }

  .total-header-row, .total-row {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.9fr);
    gap: 4px;
  }
  .total-header-row { padding-bottom: 6px; margin-bottom: 4px; }
  .hcol-full { display: none; }
  .hcol-short { display: inline; }
  .hcol-label, .hcol-sum, .hcol-prem {
    font-size: 10px;
    letter-spacing: 0.3px;
  }
  .total-row {
    padding: 7px 0;
  }
  .total-label { font-size: 12px; opacity: 1; }
  .total-sum,
  .total-value {
    font-size: 13px;
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
  .total-block { padding: 8px; max-width: 100%; }
  .total-header-row, .total-row {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.85fr);
    gap: 3px;
  }
  .total-label { font-size: 11px; min-width: 0; overflow: hidden; text-overflow: ellipsis; opacity: 1; }
  .total-sum, .total-value { font-size: 11px; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .hcol-label, .hcol-sum, .hcol-prem { font-size: 9px; }
  .dsc-title { font-size: 14px; }
  .dsc-sub { font-size: 10px; }
  .dsc-value { font-size: 16px; }
}
</style>
