<template>
  <div class="insurance-calculator">

    <!-- Форма ввода -->
    <div class="calc-panel form-panel">
      <InputForm v-model="formData" />

      <div class="riders-wrapper">
        <RidersSection v-model="formData.riders" />
      </div>

      <!-- Ошибки валидации -->
      <div class="errors" v-if="errors.length > 0">
        <div v-for="err in errors" :key="err" class="error-item">⚠ {{ err }}</div>
      </div>

      <!-- Кнопка расчёта -->
      <button
        class="calc-btn"
        :class="{ loading }"
        :disabled="loading"
        @click="onCalculate"
      >
        <span v-if="loading">Считаю…</span>
        <span v-else>Рассчитать</span>
      </button>
    </div>

    <!-- Результаты -->
    <div class="calc-panel results-panel" v-if="result">
      <ResultsSummary :result="result" />
      <ReservesTable  :result="result" />
    </div>

    <!-- Ошибка расчёта -->
    <div class="calc-error" v-if="error && !loading && errors.length === 0">
      {{ error }}
    </div>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useInsuranceCalc } from '../composables/useInsuranceCalc.js';
import InputForm     from './InputForm.vue';
import RidersSection from './RidersSection.vue';
import ResultsSummary from './ResultsSummary.vue';
import ReservesTable  from './ReservesTable.vue';

const { result, loading, error, errors, calculate } = useInsuranceCalc();

// Начальные значения формы
const formData = ref({
  dob:              '',
  gender:           'male',
  term:             20,
  frequency:        'annual',
  deathBenefitType: 'full_sum_assured',
  mode:             'sa_to_premium',
  sumAssured:       10_000_000,
  premium:          150_000,
  usdRate:          500,
  annuityFrequency: 'annual',
  annuityTerm:      0,
  guaranteedPeriod: 0,
  riders: {
    accidental_death:            { enabled: false },
    disability_accident_lumpsum: { enabled: false },
    trauma:                      { enabled: false, sum: 1_000_000, multiplier: 1 },
    temporary_disability:        { enabled: false, sum: 1_000_000 },
    hospitalization:              { enabled: false, sum: 1_000_000 },
    disability_waiver:            { enabled: false },
    critical_illness:             { enabled: false, sum: 1_000_000 },
  },
});

function onCalculate() {
  calculate(formData.value);
}
</script>

<style scoped>
.insurance-calculator {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.calc-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.riders-wrapper {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e5e7eb;
}

.errors {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.error-item {
  font-size: 0.85rem;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
}

.calc-btn {
  margin-top: 1.25rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

.calc-btn:hover:not(:disabled) {
  background: #4338ca;
}

.calc-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.calc-btn:disabled,
.calc-btn.loading {
  background: #a5b4fc;
  cursor: not-allowed;
}

.calc-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #dc2626;
  font-size: 0.88rem;
}
</style>
