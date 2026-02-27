<template>
  <div class="reserves-table" v-if="result?.reserves?.length">

    <!-- Toggle button -->
    <button class="toggle-btn" @click="showTable = !showTable">
      <span class="btn-icon">📋</span>
      <span>Таблица выкупной суммы</span>
      <InfoTooltip v-bind="TIP.table" />
      <span class="btn-arrow">{{ showTable ? '▲' : '▼' }}</span>
    </button>

    <!-- Table (collapsible) -->
    <div v-if="showTable" class="table-card">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="th-year">Год <InfoTooltip v-bind="TIP.colYear" /></th>
              <th class="th-date">Дата <InfoTooltip v-bind="TIP.colDate" /></th>
              <th class="th-age">Возраст <InfoTooltip v-bind="TIP.colAge" /></th>
              <th class="th-surrender">Выкупная сумма <InfoTooltip v-bind="TIP.colSurrender" /></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in tableRows" :key="row.year" :class="{ even: idx % 2 === 0 }">
              <td class="col-year">{{ row.year }}</td>
              <td class="col-date">{{ policyDate(row.year) }}</td>
              <td class="col-age">{{ row.age }}</td>
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

const { usdRate, currencyMode, toUsdStr } = useCurrencyRate();

const isUsdMode = computed(() => currencyMode.value === 'USD' && !!usdRate.value);

function fmtP(kzt) {
  return isUsdMode.value ? (toUsdStr(kzt) ?? fmt(kzt)) : fmt(kzt);
}

const TIP = {
  table: {
    title: 'Таблица выкупной суммы',
    text: '<b>Выкупная сумма</b> — это ваши <b>накопленные средства</b> на каждую конкретную дату полиса.<br><br>Таблица показывает, сколько капитала вы сформируете к каждому году. В начале накопления только набирают темп — это нормально. Год за годом капитал уверенно растёт.<br><br>Для максимального результата рекомендуется держать полис до конца срока или не менее <b>5–7 лет</b>.',
  },
  colYear: {
    title: 'Год страхования',
    text: 'Порядковый номер года с момента начала накоплений по полису.<br><br>Год <b>1</b> — первый год формирования капитала, год <b>20</b> — последний для полиса сроком 20 лет.',
  },
  colDate: {
    title: 'Дата',
    text: 'Конкретная дата завершения каждого года страхования (годовщина заключения договора).<br><br>Именно на эту дату рассчитывается размер ваших накопленных средств.',
  },
  colAge: {
    title: 'Возраст',
    text: 'Ваш возраст на дату завершения каждого года накоплений.<br><br>Используйте этот столбец, чтобы видеть: в каком возрасте вы достигнете той или иной суммы накоплений.',
  },
  colSurrender: {
    title: 'Выкупная сумма',
    text: 'Ваш накопленный капитал к данному году полиса.<br><br>• В первые годы может быть чуть ниже суммы взносов — накопления только набирают темп<br>• Год за годом уверенно растёт<br>• К концу срока достигает <b>максимального значения</b> — это ваш итоговый капитал',
  },
};

const props = defineProps({ result: { type: Object, default: null } });

const showTable = ref(true);

const tableRows = computed(() => props.result?.reserves ?? []);

function policyDate(yearNum) {
  const base = props.result?.calcDate || new Date().toISOString().slice(0, 10);
  const [y, m, d] = base.split('-');
  return `${d}.${m}.${parseInt(y, 10) + yearNum}`;
}

function fmt(v) { return formatMoney(v, 'KZT'); }
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
  border: 1px solid var(--border-color, rgba(25,118,210,0.14));
  border-radius: 16px;
  font-size: 15px; font-weight: 600;
  color: var(--text-main, #1A2E3F);
  cursor: pointer;
  box-shadow: var(--shadow-out);
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
  border-radius: 16px;
  box-shadow: var(--shadow-out);
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
  min-width: 620px;
  table-layout: fixed;       /* equal column widths */
  border-collapse: collapse;
  font-family: 'SF Mono', 'Menlo', monospace;
}

/* Blue header */
.data-table thead tr {
  background: linear-gradient(135deg, #1565C0, #1976D2);
}
.data-table th {
  color: white;
  padding: 13px 12px;
  text-align: center;
  font-weight: 700; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.5px;
  white-space: normal;
  border: none;
  width: 25%;   /* all 4 columns equal */
}

/* Rows */
.data-table tbody tr {
  border-bottom: 1px solid rgba(25, 118, 210, 0.12);
  transition: background 0.13s ease;
}
.data-table tbody tr.even td {
  background: rgba(25, 118, 210, 0.04);
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

/* Age — same as base td */
.col-age {
  font-size: 16px; font-weight: 600;
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
  .toggle-btn {
    padding: 12px;
    font-size: 14px;
  }

  .data-table th {
    font-size: 12px;
    padding: 10px 8px;
  }

  .data-table td {
    font-size: 14px;
    padding: 10px 8px;
  }

  .col-year,
  .col-surrender {
    font-size: 16px;
  }
}
</style>
