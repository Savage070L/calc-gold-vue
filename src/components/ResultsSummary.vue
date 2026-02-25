<template>
  <div class="results-summary" v-if="result">

    <h2 class="section-title">Результаты расчёта</h2>

    <!-- Ключевые показатели -->
    <div class="kpi-grid">

      <div class="kpi-card primary">
        <span class="kpi-label">Страховая сумма</span>
        <span class="kpi-value">{{ fmt(result.sumAssured) }}</span>
        <span class="kpi-sub" v-if="result.sumAssuredUSD">≈ {{ fmt(result.sumAssuredUSD) }} USD</span>
      </div>

      <div class="kpi-card">
        <span class="kpi-label">Взнос ({{ freqLabel }})</span>
        <span class="kpi-value">{{ fmt(result.grossPremium) }}</span>
        <span class="kpi-sub" v-if="result.grossPremiumUSD">≈ {{ fmt(result.grossPremiumUSD) }} USD</span>
      </div>

      <div class="kpi-card highlight" v-if="result.totalRiderPremium > 0">
        <span class="kpi-label">Итоговый взнос с допами</span>
        <span class="kpi-value">{{ fmt(result.totalPremium) }}</span>
        <span class="kpi-sub" v-if="result.totalPremiumUSD">≈ {{ fmt(result.totalPremiumUSD) }} USD</span>
      </div>

      <div class="kpi-card" v-if="result.annuityPayment > 0">
        <span class="kpi-label">Аннуитетная выплата ({{ annuityFreqLabel }})</span>
        <span class="kpi-value">{{ fmt(result.annuityPayment) }}</span>
      </div>

    </div>

    <!-- Технические параметры -->
    <div class="tech-params">
      <h3 class="sub-title">Актуарные параметры</h3>
      <div class="params-grid">
        <div class="param-row">
          <span class="param-name">Возраст застрахованного</span>
          <span class="param-val">{{ result.age }} лет</span>
        </div>
        <div class="param-row">
          <span class="param-name">Срок договора / уплаты</span>
          <span class="param-val">{{ result.term }} / {{ result.paymentTerm }} лет</span>
        </div>
        <div class="param-row">
          <span class="param-name">Ставка доходности</span>
          <span class="param-val">{{ fmtRate(result.interestRate) }}</span>
        </div>
        <div class="param-row">
          <span class="param-name">Брутто-ставка BP (выбранная)</span>
          <span class="param-val">{{ fmtRate(result.BP_rate, 6) }}</span>
        </div>
        <div class="param-row">
          <span class="param-name">BP_1 (страховая сумма)</span>
          <span class="param-val">{{ fmtRate(result.BP_1, 6) }}</span>
        </div>
        <div class="param-row">
          <span class="param-name">BP_2 (уплач. взносы)</span>
          <span class="param-val">{{ fmtRate(result.BP_2, 6) }}</span>
        </div>
        <div class="param-row">
          <span class="param-name">Нетто-ставка NP</span>
          <span class="param-val">{{ fmtRate(result.NP_rate, 6) }}</span>
        </div>
        <div class="param-row">
          <span class="param-name">Коэф. периодичности</span>
          <span class="param-val">{{ result.freqFactor }}</span>
        </div>
        <template v-if="result.actuarial">
          <div class="param-row">
            <span class="param-name">Ax:n</span>
            <span class="param-val">{{ fmt6(result.actuarial.Ax_n) }}</span>
          </div>
          <div class="param-row">
            <span class="param-name">Ex:n</span>
            <span class="param-val">{{ fmt6(result.actuarial.Ex_n) }}</span>
          </div>
          <div class="param-row">
            <span class="param-name">ax:n</span>
            <span class="param-val">{{ fmt6(result.actuarial.ax_n) }}</span>
          </div>
          <div class="param-row">
            <span class="param-name">ax:t</span>
            <span class="param-val">{{ fmt6(result.actuarial.ax_t) }}</span>
          </div>
          <div class="param-row">
            <span class="param-name">IAx:n</span>
            <span class="param-val">{{ fmt6(result.actuarial.IAx_n) }}</span>
          </div>
          <div class="param-row">
            <span class="param-name">alfa (аквизиция)</span>
            <span class="param-val">{{ fmtRate(result.actuarial.alfa, 4) }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Взносы по допам -->
    <div class="riders-summary" v-if="hasRiders">
      <h3 class="sub-title">Дополнительные покрытия</h3>
      <div class="riders-table">
        <div class="rt-header">
          <span>Покрытие</span>
          <span>Сумма покрытия</span>
          <span>Взнос</span>
          <span>Брутто-тариф</span>
        </div>
        <div
          v-for="(rider, name) in result.riders"
          :key="name"
          class="rt-row"
        >
          <span>{{ riderLabel(name) }}</span>
          <span>{{ riderSumLabel(name, rider) }}</span>
          <span>{{ fmt(rider.riderPremium) }}</span>
          <span>{{ rider.grossTariff ? fmtRate(rider.grossTariff, 4) : (rider.BP_ci ? fmtRate(rider.BP_ci, 6) : '—') }}</span>
        </div>
        <div class="rt-total">
          <span>Итого по допам</span>
          <span></span>
          <span>{{ fmt(result.totalRiderPremium) }}</span>
          <span></span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatMoney, formatRate } from '../composables/useInsuranceCalc.js';

const props = defineProps({
  result: {
    type: Object,
    default: null,
  },
});

const FREQ_LABELS = {
  annual:     'ежегодно',
  semiannual: 'полугодовой',
  quarterly:  'квартальный',
  monthly:    'ежемесячно',
  single:     'единовременно',
};

const RIDER_LABELS = {
  accidental_death:            'Смерть от НС',
  disability_accident_lumpsum: 'Инвалидность I–II гр. от НС',
  trauma:                      'Телесные травмы от НС',
  temporary_disability:        'Временная нетрудоспособность',
  hospitalization:              'Госпитализация от НС',
  disability_waiver:            'Освобождение от взносов',
  critical_illness:             'Критические заболевания',
};

const freqLabel = computed(() => FREQ_LABELS[props.result?.frequency] ?? '');
const annuityFreqLabel = computed(() =>
  FREQ_LABELS[props.result?.annuity?.annuityFrequency] ?? 'ежегодно'
);

const hasRiders = computed(() =>
  props.result?.riders && Object.keys(props.result.riders).length > 0
);

function fmt(val) {
  return formatMoney(val, 'KZT');
}

function fmtRate(val, decimals = 4) {
  return formatRate(val, decimals);
}

function fmt6(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toFixed(6);
}

function riderLabel(name) {
  return RIDER_LABELS[name] ?? name;
}

function riderSumLabel(name, rider) {
  if (rider.riderSum) return formatMoney(rider.riderSum, 'KZT');
  if (rider.ciSum)    return formatMoney(rider.ciSum, 'KZT');
  return '—';
}
</script>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.sub-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin: 1.25rem 0 0.6rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid #e5e7eb;
}

/* KPI карточки */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.kpi-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.kpi-card.primary {
  border-color: #4f46e5;
  background: #f5f3ff;
}

.kpi-card.highlight {
  border-color: #059669;
  background: #ecfdf5;
}

.kpi-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}

.kpi-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111827;
}

.kpi-sub {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Технические параметры */
.params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem 1rem;
}

@media (max-width: 600px) {
  .params-grid { grid-template-columns: 1fr; }
}

.param-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border-radius: 5px;
  font-size: 0.82rem;
}

.param-row:nth-child(odd) {
  background: #f9fafb;
}

.param-name { color: #6b7280; }
.param-val  { font-weight: 600; color: #111827; font-family: monospace; font-size: 0.85rem; }

/* Таблица допов */
.riders-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.82rem;
}

.rt-header {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1.2fr;
  background: #f3f4f6;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rt-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1.2fr;
  padding: 0.45rem 0.75rem;
  border-top: 1px solid #f3f4f6;
  color: #374151;
}

.rt-row:nth-child(even) { background: #fafafa; }

.rt-total {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1.2fr;
  padding: 0.5rem 0.75rem;
  border-top: 2px solid #e5e7eb;
  font-weight: 700;
  background: #f9fafb;
  color: #059669;
}
</style>
