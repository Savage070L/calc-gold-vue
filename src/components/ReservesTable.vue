<template>
  <div class="reserves-table" v-if="result">
    <h2 class="section-title">Резервы и бонусы по годам</h2>

    <!-- Переключатель вкладок -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Таблица резервов -->
    <div v-if="activeTab === 'reserves'" class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Год</th>
            <th>Возраст</th>
            <th>Резерв</th>
            <th>Выкупная сумма</th>
            <th>Ax:n_k</th>
            <th>ax:n_k</th>
            <th>ax:t_k</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.reserves" :key="row.year">
            <td>{{ row.year }}</td>
            <td>{{ row.age }}</td>
            <td class="money">{{ fmt(row.reserve) }}</td>
            <td class="money">{{ fmt(row.surrender) }}</td>
            <td class="mono">{{ fmt6(row.Ax_n_k) }}</td>
            <td class="mono">{{ fmt6(row.ax_n_k) }}</td>
            <td class="mono">{{ fmt6(row.ax_t_k) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Таблица бонусов -->
    <div v-if="activeTab === 'bonuses'" class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Год</th>
            <th>Бонус (KZT)</th>
            <th>Прирост бонусной СС</th>
            <th>Накопл. бонусная СС</th>
            <th>Итоговая СС с бонусами</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in result.bonuses" :key="row.year">
            <td>{{ row.year }}</td>
            <td class="money">{{ row.bonus > 0 ? fmt(row.bonus) : '—' }}</td>
            <td class="money">{{ row.bonusSAIncrement > 0 ? fmt(row.bonusSAIncrement) : '—' }}</td>
            <td class="money">{{ row.cumulativeBonusSA > 0 ? fmt(row.cumulativeBonusSA) : '—' }}</td>
            <td class="money bold">{{ fmt(row.totalSAWithBonus) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Сводная таблица (резервы + бонусы) -->
    <div v-if="activeTab === 'combined'" class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Год</th>
            <th>Возраст</th>
            <th>Выкупная сумма</th>
            <th>Бонус</th>
            <th>СС с бонусами</th>
            <th>Пониж. СС (reduced SA)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in combined" :key="row.year">
            <td>{{ row.year }}</td>
            <td>{{ row.age }}</td>
            <td class="money">{{ fmt(row.surrender) }}</td>
            <td class="money">{{ row.bonus > 0 ? fmt(row.bonus) : '—' }}</td>
            <td class="money bold">{{ fmt(row.totalSAWithBonus) }}</td>
            <td class="money">{{ fmt(row.reducedSA) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Аннуитет (если есть) -->
    <div v-if="result.annuity && result.annuity.annuityPayment > 0" class="annuity-block">
      <h3 class="sub-title">Аннуитет</h3>
      <div class="params-grid">
        <div class="param-row">
          <span>Аннуитетная выплата</span>
          <span class="bold">{{ fmt(result.annuity.annuityPayment) }}</span>
        </div>
        <div class="param-row">
          <span>Аннуитетный коэффициент (a)</span>
          <span>{{ fmt6(result.annuity.annuityFactor) }}</span>
        </div>
        <div class="param-row">
          <span>Гарантированная часть</span>
          <span>{{ fmt6(result.annuity.guaranteedPart) }}</span>
        </div>
        <div class="param-row">
          <span>Накопительная часть</span>
          <span>{{ fmt6(result.annuity.lifePart) }}</span>
        </div>
        <div class="param-row">
          <span>Срок выплат</span>
          <span>{{ result.annuity.annuityTerm }} лет</span>
        </div>
        <div class="param-row">
          <span>Гарантированный период</span>
          <span>{{ result.annuity.guaranteedPeriod }} лет</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatMoney } from '../composables/useInsuranceCalc.js';

const props = defineProps({
  result: { type: Object, default: null },
});

const tabs = [
  { key: 'combined', label: 'Сводная' },
  { key: 'reserves', label: 'Резервы' },
  { key: 'bonuses',  label: 'Бонусы'  },
];
const activeTab = ref('combined');

const combined = computed(() => {
  if (!props.result?.reserves || !props.result?.bonuses) return [];
  return props.result.reserves.map((r, i) => ({
    ...r,
    ...(props.result.bonuses[i] ?? {}),
  }));
});

function fmt(val) {
  return formatMoney(val, 'KZT');
}

function fmt6(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toFixed(6);
}
</script>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
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

/* Вкладки */
.tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.35rem 0.85rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  font-size: 0.82rem;
  cursor: pointer;
  font-weight: 500;
  color: #374151;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}

.tab-btn:hover:not(.active) {
  background: #f0f0ff;
  border-color: #c7d2fe;
}

/* Таблица */
.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

thead tr {
  background: #f3f4f6;
}

th {
  padding: 0.55rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

td {
  padding: 0.45rem 0.75rem;
  border-top: 1px solid #f3f4f6;
  color: #374151;
  white-space: nowrap;
}

tbody tr:nth-child(even) { background: #fafafa; }
tbody tr:hover           { background: #f0f0ff; }

.money { text-align: right; font-variant-numeric: tabular-nums; }
.mono  { font-family: monospace; font-size: 0.78rem; }
.bold  { font-weight: 600; }

/* Аннуитет */
.annuity-block {
  margin-top: 1.5rem;
}

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
  color: #374151;
}

.param-row:nth-child(odd) { background: #f9fafb; }
</style>
