<template>
  <div class="insurance-calculator">

    <!-- ── LEFT: Form Card + Riders Card ─────────────────── -->
    <div class="left-column">

      <!-- Form Card -->
      <div class="form-card">
        <InputForm v-model="formData" />
        <div class="form-errors" v-if="errors.length > 0 && isFormComplete">
          <div v-for="err in errors" :key="err" class="error-item">⚠ {{ err }}</div>
        </div>
      </div>

      <!-- Riders Card -->
      <div class="riders-card">
        <div class="riders-card-header">
          <span class="rc-icon">🛡️</span>
          <span>ДОПОЛНИТЕЛЬНЫЕ ПОКРЫТИЯ</span>
        </div>
        <RidersSection v-model="formData.riders" />
      </div>

    </div>

    <!-- ── RIGHT: Results ────── -->
    <div class="right-column">

      <!-- Loading state -->
      <div class="calc-loading" v-if="loading">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <span>Рассчитываем…</span>
      </div>

      <!-- Results — shown when calculation is ready -->
      <div class="results-section" v-else-if="result">
        <ResultsSummary :result="result" />
        <ReservesTable :result="result" />
      </div>

      <!-- Placeholder — form not yet complete -->
      <div class="calc-placeholder" v-else>
        <div class="placeholder-icon">🧮</div>
        <span>Заполните данные для расчёта</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useInsuranceCalc } from '../composables/useInsuranceCalc.js';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';
import InputForm from './InputForm.vue';
import RidersSection from './RidersSection.vue';
import ResultsSummary from './ResultsSummary.vue';
import ReservesTable from './ReservesTable.vue';

const { result, loading, errors, calculate, reset } = useInsuranceCalc();
const { usdRate, currencyMode } = useCurrencyRate();

const formData = ref({
  dob: '',
  gender: 'male',
  term: 20,
  frequency: 'annual',
  deathBenefitType: 'full_sum_assured',
  mode: 'premium_to_sa',
  sumAssured: 10_000_000,
  premium: 500_000,
  enableAnnuity: false,
  annuityFrequency: 'annual',
  annuityTerm: 10,
  guaranteedPeriod: 0,
  riders: {
    accidental_death:            { enabled: false },
    disability_accident_lumpsum: { enabled: false },
    trauma:                      { enabled: false, sum: 1_000_000 },
    hospitalization:             { enabled: false, sum: 1_000_000 },
  },
});

currencyMode.value = 'USD';
const usdDefaultApplied = ref(false);
watch(usdRate, (rate) => {
  if (!rate || usdDefaultApplied.value) return;
  formData.value.premium = Math.round(1000 * rate);
  usdDefaultApplied.value = true;
}, { immediate: true });

// Form is "complete" when all minimum required fields are present
const isFormComplete = computed(() => {
  const { dob, gender, term, frequency, mode, sumAssured, premium } = formData.value;
  if (!dob || !gender || !term || !frequency) return false;
  if (mode === 'sa_to_premium' && (!sumAssured || sumAssured <= 0)) return false;
  if (mode === 'premium_to_sa' && (!premium || premium <= 0)) return false;
  return true;
});

// Auto-calculate whenever form data changes (debounced 350ms)
let calcTimer = null;
watch(formData, () => {
  clearTimeout(calcTimer);
  calcTimer = setTimeout(() => {
    if (isFormComplete.value) {
      calculate(formData.value);
    } else {
      reset();
    }
  }, 350);
}, { deep: true });
</script>

<style scoped>
/* ── Page grid ─────────────────────────────── */
.insurance-calculator {
  display: grid;
  grid-template-columns: minmax(620px, 820px) minmax(560px, 1fr);
  gap: 16px;
  padding: 12px;
  max-width: 1880px;
  margin: 0 auto;
  align-items: start;
}

/* ── Left column: stacked cards ────────────── */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Form Card (dark navy) ─────────────────── */
.form-card {
  /* Dark theme variable overrides for child components */
  --surface:          #1E3A5A;
  --text-main:        #E8F4FD;
  --text-light:       #7FB3D3;
  --accent:           #42A5F5;
  --accent-hover:     #90CAF9;
  --border-color:     rgba(66,165,245,0.22);
  --shadow-btn:       3px 3px 8px rgba(0,0,0,0.55), -1px -1px 4px rgba(20,60,110,0.12);
  --shadow-out-sm:    2px 2px 6px rgba(0,0,0,0.45), -1px -1px 3px rgba(20,60,110,0.1);
  --shadow-in:        inset 3px 3px 7px rgba(0,0,0,0.55), inset -2px -2px 4px rgba(20,60,110,0.1);
  --shadow-btn-press: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(20,60,110,0.1);

  background: linear-gradient(170deg, #163456 0%, #0B1F35 60%, #071525 100%);
  border-radius: 22px;
  padding: 1.4rem 1.3rem 1.6rem;
  box-shadow: 0 10px 36px rgba(0,0,0,0.42), 0 0 0 1px rgba(66,165,245,0.09);
}

/* ── Riders Card (dark navy) ───────────────── */
.riders-card {
  --surface:      #1E3A5A;
  --text-main:    #E8F4FD;
  --text-light:   #7FB3D3;
  --accent:       #42A5F5;
  --border-color: rgba(66,165,245,0.22);
  --shadow-in:    inset 3px 3px 7px rgba(0,0,0,0.55), inset -2px -2px 4px rgba(20,60,110,0.1);
  --shadow-btn:   3px 3px 8px rgba(0,0,0,0.55), -1px -1px 4px rgba(20,60,110,0.12);
  --shadow-btn-press: inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(20,60,110,0.1);

  background: linear-gradient(135deg, #152D4A 0%, #0B1F35 100%);
  border-radius: 22px;
  padding: 16px 18px;
  box-shadow: 0 10px 32px rgba(0,0,0,0.38), 0 0 0 1px rgba(66,165,245,0.09);
}

.riders-card-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(66,165,245,0.15);
  font-size: 18px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1px;
  color: #E8F4FD;
}
.rc-icon { font-size: 22px; }

/* ── Right column ──────────────────────────── */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Results section ───────────────────────── */
.results-section {
  display: flex; flex-direction: column; gap: 16px;
}

/* ── Form errors ───────────────────────────── */
.form-errors { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
.error-item {
  font-size: 13px; color: #ff8a80;
  background: rgba(220,38,38,0.12);
  border-radius: 8px; padding: 7px 10px;
  border: 1px solid rgba(220,38,38,0.2);
}

/* ── Placeholder ───────────────────────────── */
.calc-placeholder {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 52px 20px;
  color: var(--text-light, #5A7A96);
  font-size: 14px; font-weight: 500;
  border: 2px dashed rgba(25,118,210,0.2);
  border-radius: 20px;
  background: var(--surface, #F5F8FF);
}
.placeholder-icon { font-size: 32px; opacity: 0.4; }

/* ── Loading ───────────────────────────────── */
.calc-loading {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; padding: 36px 20px;
  color: var(--text-light, #5A7A96); font-size: 14px; font-weight: 500;
  background: var(--surface, #F5F8FF);
  border-radius: 20px;
  box-shadow: 6px 6px 14px rgba(150,175,210,0.4), -6px -6px 14px rgba(255,255,255,0.92);
}
.loading-dots { display: flex; gap: 5px; }
.loading-dots span {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--primary, #1976D2);
  animation: dotBounce 1.2s infinite ease-in-out;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40%           { transform: scale(1.2); opacity: 1; }
}

/* ── Responsive ────────────────────────────── */
@media (max-width: 1120px) {
  .insurance-calculator {
    grid-template-columns: 1fr;
    padding: 14px;
    gap: 14px;
  }
}

@media (max-width: 720px) {
  .insurance-calculator {
    padding: 10px;
    gap: 10px;
  }

  .form-card,
  .riders-card {
    padding: 12px;
    border-radius: 18px;
  }

  .riders-card-header {
    font-size: 16px;
    letter-spacing: 0.6px;
  }
}
</style>
