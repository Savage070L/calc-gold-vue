<template>
  <div class="reserves-table" v-if="result?.reserves?.length">

    <!-- Toggle button -->
    <button class="toggle-btn" @click="showTable = !showTable">
      <span class="btn-icon">📋</span>
      <span>{{ t('table.toggle') }}</span>
      <InfoTooltip v-bind="tip('table')" />
      <span class="btn-arrow">{{ showTable ? '▲' : '▼' }}</span>
    </button>

    <!-- Table (collapsible) -->
    <div v-if="showTable" class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <colgroup>
            <col class="c-year" />
            <col class="c-date" />
            <col class="c-surrender" />
          </colgroup>
          <thead>
            <tr>
              <th class="th-year">{{ t('table.year') }} <InfoTooltip v-bind="tip('colYear')" /></th>
              <th class="th-date">{{ t('table.date') }} <InfoTooltip v-bind="tip('colDate')" /></th>
              <th class="th-surrender">{{ t('table.surrender') }} <InfoTooltip v-bind="tip('colSurrender')" /></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in tableRows" :key="row.year" :class="{ even: idx % 2 === 0 }">
              <td class="col-year">{{ row.year }}</td>
              <td class="col-date">{{ policyDate(row.year) }}</td>
              <td class="col-surrender">
                {{ fmtP(row.surrender) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatMoney } from '../composables/useInsuranceCalc.js';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';
import InfoTooltip from './InfoTooltip.vue';
import { useI18n } from '../i18n/index.js';

const { t, tip } = useI18n();
const { usdRate, currencyMode, toUsdStr } = useCurrencyRate();

const isUsdMode = computed(() => currencyMode.value === 'USD' && !!usdRate.value);

function fmtP(kzt) {
  return isUsdMode.value ? (toUsdStr(kzt) ?? fmt(kzt)) : fmt(kzt);
}

const props = defineProps({ result: { type: Object, default: null } });

const showTable = ref(window.innerWidth > 720);

const tableRows = computed(() => props.result?.reserves ?? []);

function policyDate(yearNum) {
  const base = props.result?.calcDate || new Date().toISOString().slice(0, 10);
  const [y, m, d] = base.split('-');
  return `${d}.${m}.${parseInt(y, 10) + yearNum}`;
}

function fmt(v) { return formatMoney(v) + '\u00A0₸'; }
</script>

<style scoped>
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Toggle button ─────────────────── */
.toggle-btn {
  width: 100%;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px;
  background: var(--surface, #F5F8FF);
  border: 2px solid rgba(25,118,210,0.40);
  border-radius: 16px;
  font-size: 15px; font-weight: 600;
  color: var(--text-main, #1A2E3F);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.toggle-btn:hover {
  background: var(--primary-pale, #E3F2FD);
  border-color: var(--primary, #1976D2);
  color: var(--primary, #1976D2);
}
.btn-icon { font-size: 18px; }
.toggle-btn span:nth-child(2) { flex: 1; }
.btn-arrow { font-size: 11px; color: var(--text-light, #5A7A96); }

/* ── Table card ────────────────────── */
.table-card {
  background: var(--surface, #F5F8FF);
  border: 2px solid rgba(25,118,210,0.40);
  border-radius: 16px;
  animation: slideDown 0.3s ease-out both;
  overflow: hidden;
  margin-top: 6px;
}
.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Table ─────────────────────────── */
.data-table {
  width: 100%;
  min-width: 420px;
  table-layout: fixed;
  border-collapse: collapse;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.data-table col.c-year      { width: 100px; }
.data-table col.c-date      { width: 300px; }
.data-table col.c-surrender { width: auto; }

/* Header */
.data-table thead tr {
  background: linear-gradient(135deg, #3E6487, #2D5171);
}
.data-table th {
  color: white;
  padding: 13px 12px;
  text-align: center;
  font-weight: 700; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.5px;
  white-space: normal;
  border: none;
}

/* Rows */
.data-table tbody tr {
  border-bottom: 1px solid rgba(62, 100, 135, 0.1);
  transition: background 0.13s ease;
}
.data-table tbody tr:nth-child(odd) td {
  background: rgba(124, 186, 66, 0.06);
}
.data-table tbody tr:nth-child(even) td {
  background: rgba(62, 100, 135, 0.06);
}
.data-table tbody tr:hover td {
  background: var(--primary-pale, #E3F2FD);
}

.data-table td {
  padding: 11px 12px;
  text-align: center;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 16px; font-weight: 600;
  color: var(--text-main, #1A2E3F);
  border: none;
  border-right: 1px solid rgba(25, 118, 210, 0.08);
}
.data-table td:last-child { border-right: none; }

/* Year — bold blue */
.col-year {
  font-size: 18px; font-weight: 800;
  color: #1565C0;
}

/* Date — same weight/font as others, slightly muted */
.col-date {
  font-size: 16px; font-weight: 600;
  color: #3A5A7A;
}

/* Surrender value */
.col-surrender {
  font-size: 18px; font-weight: 700;
  color: #1B5E20;
}

/* Info button inside blue header — white style */
.data-table th :deep(.info-btn) {
  border-color: rgba(255,255,255,0.6);
  color: rgba(255,255,255,0.7);
  opacity: 1;
}
.data-table th :deep(.info-btn:hover),
.data-table th :deep(.info-btn.active) {
  background: rgba(255,255,255,0.25);
  border-color: white;
  color: white;
  transform: scale(1.1);
}
/* Info button in toggle button row */
.toggle-btn :deep(.info-btn) {
  border-color: rgba(25,118,210,0.5);
  color: rgba(25,118,210,0.6);
}
.toggle-btn :deep(.info-btn:hover),
.toggle-btn :deep(.info-btn.active) {
  background: #1976D2;
  border-color: #1976D2;
  color: white;
}

@media (max-width: 720px) {
  .data-table { min-width: 0; }

  .toggle-btn {
    padding: 12px;
    font-size: 14px;
  }

  .data-table col.c-year      { width: 40px; }
  .data-table col.c-date      { width: 110px; }
  .data-table col.c-surrender { width: auto; }

  .data-table th {
    font-size: 10px;
    padding: 8px 4px;
  }

  .data-table td {
    font-size: 12px;
    padding: 8px 4px;
  }

  .col-year {
    font-size: 13px;
  }
  .col-surrender {
    font-size: 13px;
  }
}
</style>
