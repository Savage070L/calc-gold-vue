<template>
  <div class="input-form">
    <h2 class="form-title">Параметры договора</h2>

    <div class="form-grid">

      <!-- Дата рождения -->
      <div class="form-group">
        <label for="dob">Дата рождения</label>
        <input
          id="dob"
          type="date"
          v-model="local.dob"
          :max="maxDob"
          @change="onDobChange"
        />
        <span v-if="local.dob" class="hint">Возраст: {{ currentAge }} лет</span>
      </div>

      <!-- Пол -->
      <div class="form-group">
        <label>Пол</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="local.gender" value="male" />
            Мужской
          </label>
          <label class="radio-label">
            <input type="radio" v-model="local.gender" value="female" />
            Женский
          </label>
        </div>
      </div>

      <!-- Срок договора -->
      <div class="form-group">
        <label for="term">Срок договора (лет)</label>
        <input
          id="term"
          type="number"
          v-model.number="local.term"
          :min="minTerm"
          :max="maxTermAllowed"
          placeholder="15–40"
        />
        <span v-if="local.dob && local.term" class="hint">
          Возраст выхода: {{ exitAge }} лет
          <span v-if="exitAge > maxExitAge" class="hint-warn"> (превышает {{ maxExitAge }}!)</span>
        </span>
      </div>

      <!-- Периодичность взносов -->
      <div class="form-group">
        <label for="frequency">Периодичность взносов</label>
        <select id="frequency" v-model="local.frequency">
          <option value="annual">Ежегодно</option>
          <option value="semiannual">Полугодовой</option>
          <option value="quarterly">Квартальный</option>
          <option value="monthly">Ежемесячно</option>
          <option value="single">Единовременно</option>
        </select>
      </div>

      <!-- Тип выплаты при смерти -->
      <div class="form-group">
        <label>Выплата при смерти</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="local.deathBenefitType" value="full_sum_assured" />
            Страховая сумма
          </label>
          <label class="radio-label">
            <input type="radio" v-model="local.deathBenefitType" value="paid_premiums" />
            Уплаченные взносы
          </label>
        </div>
      </div>

      <!-- Режим расчёта -->
      <div class="form-group">
        <label>Режим расчёта</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="local.mode" value="sa_to_premium" />
            СС → Взнос
          </label>
          <label class="radio-label">
            <input type="radio" v-model="local.mode" value="premium_to_sa" />
            Взнос → СС
          </label>
        </div>
      </div>

      <!-- Страховая сумма (если mode = sa_to_premium) -->
      <div class="form-group" v-if="local.mode === 'sa_to_premium'">
        <label for="sumAssured">Страховая сумма (тенге)</label>
        <input
          id="sumAssured"
          type="number"
          v-model.number="local.sumAssured"
          min="0"
          step="100000"
          placeholder="Например: 10 000 000"
        />
      </div>

      <!-- Взнос (если mode = premium_to_sa) -->
      <div class="form-group" v-if="local.mode === 'premium_to_sa'">
        <label for="premium">Сумма взноса (тенге)</label>
        <input
          id="premium"
          type="number"
          v-model.number="local.premium"
          min="0"
          step="1000"
          placeholder="Например: 150 000"
        />
      </div>

      <!-- Курс USD -->
      <div class="form-group">
        <label for="usdRate">Курс USD/KZT</label>
        <input
          id="usdRate"
          type="number"
          v-model.number="local.usdRate"
          min="1"
          step="0.01"
          placeholder="Например: 499.88"
        />
      </div>

    </div>

    <!-- Аннуитет (расширенные настройки) -->
    <div class="section-annuity">
      <button type="button" class="toggle-btn" @click="showAnnuity = !showAnnuity">
        {{ showAnnuity ? '▼' : '▶' }} Параметры аннуитета
      </button>
      <div v-if="showAnnuity" class="form-grid annuity-grid">
        <div class="form-group">
          <label for="annuityFrequency">Периодичность выплат</label>
          <select id="annuityFrequency" v-model="local.annuityFrequency">
            <option value="annual">Ежегодно</option>
            <option value="semiannual">Полугодовой</option>
            <option value="quarterly">Квартальный</option>
            <option value="monthly">Ежемесячно</option>
          </select>
        </div>
        <div class="form-group">
          <label for="annuityTerm">Срок выплат аннуитета (лет, 0 = нет)</label>
          <input
            id="annuityTerm"
            type="number"
            v-model.number="local.annuityTerm"
            min="0"
            max="50"
          />
        </div>
        <div class="form-group">
          <label for="guaranteedPeriod">Гарантированный период (лет)</label>
          <input
            id="guaranteedPeriod"
            type="number"
            v-model.number="local.guaranteedPeriod"
            min="0"
            max="30"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { PolicyCalculator } from '../core/calculator.js';
import { PRODUCT_CONFIG }   from '../config/product.js';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const { minTerm, maxTerm, maxExitAge } = PRODUCT_CONFIG;

const showAnnuity = ref(false);

// Локальная копия — изменения прокидываем вверх через v-model
const local = ref({ ...props.modelValue });

watch(
  local,
  (val) => emit('update:modelValue', { ...val }),
  { deep: true }
);

watch(
  () => props.modelValue,
  (val) => {
    // Обновляем только если изменилось снаружи
    Object.assign(local.value, val);
  },
  { deep: true }
);

// Максимальная дата рождения — сегодня
const maxDob = computed(() => new Date().toISOString().slice(0, 10));

const currentAge = computed(() => {
  if (!local.value.dob) return null;
  return PolicyCalculator.calculateAge(local.value.dob);
});

const exitAge = computed(() => {
  if (!currentAge.value || !local.value.term) return null;
  return currentAge.value + local.value.term;
});

const maxTermAllowed = computed(() => {
  if (!currentAge.value) return maxTerm;
  return Math.min(maxTerm, maxExitAge - currentAge.value);
});

function onDobChange() {
  // Автоматически корректируем срок если выход превышает maxExitAge
  if (currentAge.value && local.value.term) {
    const allowed = maxExitAge - currentAge.value;
    if (local.value.term > allowed) {
      local.value.term = Math.max(minTerm, Math.min(local.value.term, allowed));
    }
  }
}
</script>

<style scoped>
.form-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group input[type="date"],
.form-group select {
  padding: 0.45rem 0.65rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  background: #fff;
  transition: border-color 0.15s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.radio-group {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.45rem 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  cursor: pointer;
  color: #333;
  text-transform: none;
  font-weight: 400;
  letter-spacing: 0;
}

.radio-label input[type="radio"] {
  cursor: pointer;
}

.hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.hint-warn {
  color: #dc2626;
  font-weight: 600;
}

.section-annuity {
  margin-top: 1.25rem;
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: #4f46e5;
  padding: 0.25rem 0;
  font-weight: 500;
}

.toggle-btn:hover {
  text-decoration: underline;
}

.annuity-grid {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f8f9ff;
  border-radius: 8px;
  border: 1px solid #e0e7ff;
}
</style>
