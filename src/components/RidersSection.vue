<template>
  <div class="riders-section">
    <h2 class="section-title">Дополнительные покрытия</h2>

    <div class="riders-grid">

      <!-- Смерть от НС (SA-linked) -->
      <div class="rider-card" :class="{ active: local.accidental_death?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.accidental_death.enabled" />
            <span class="rider-name">Смерть от НС</span>
          </label>
          <span class="rider-tag">SA-linked</span>
        </div>
        <p class="rider-desc">Дополнительная выплата страховой суммы при смерти от несчастного случая</p>
      </div>

      <!-- Инвалидность I–II гр. от НС (SA-linked) -->
      <div class="rider-card" :class="{ active: local.disability_accident_lumpsum?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.disability_accident_lumpsum.enabled" />
            <span class="rider-name">Инвалидность I–II гр. от НС</span>
          </label>
          <span class="rider-tag">SA-linked</span>
        </div>
        <p class="rider-desc">Единовременная выплата при установлении инвалидности от несчастного случая</p>
      </div>

      <!-- Телесные травмы от НС -->
      <div class="rider-card" :class="{ active: local.trauma?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.trauma.enabled" />
            <span class="rider-name">Телесные травмы от НС</span>
          </label>
          <span class="rider-tag">Фикс. сумма</span>
        </div>
        <p class="rider-desc">Выплата при телесных повреждениях от несчастного случая</p>
        <div v-if="local.trauma.enabled" class="rider-params">
          <div class="param-group">
            <label>Страховая сумма (тенге)</label>
            <input type="number" v-model.number="local.trauma.sum" min="0" step="100000" />
          </div>
          <div class="param-group">
            <label>Множитель выплаты</label>
            <select v-model.number="local.trauma.multiplier">
              <option :value="1">×1</option>
              <option :value="2">×2</option>
              <option :value="3">×3</option>
              <option :value="4">×4</option>
              <option :value="5">×5</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Временная утрата трудоспособности от НС -->
      <div class="rider-card" :class="{ active: local.temporary_disability?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.temporary_disability.enabled" />
            <span class="rider-name">Временная нетрудоспособность от НС</span>
          </label>
          <span class="rider-tag">Фикс. сумма</span>
        </div>
        <p class="rider-desc">Ежедневная выплата при временной нетрудоспособности от несчастного случая</p>
        <div v-if="local.temporary_disability.enabled" class="rider-params">
          <div class="param-group">
            <label>Страховая сумма (тенге)</label>
            <input type="number" v-model.number="local.temporary_disability.sum" min="0" step="100000" />
          </div>
        </div>
      </div>

      <!-- Госпитализация от НС -->
      <div class="rider-card" :class="{ active: local.hospitalization?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.hospitalization.enabled" />
            <span class="rider-name">Госпитализация от НС</span>
          </label>
          <span class="rider-tag">Фикс. сумма</span>
        </div>
        <p class="rider-desc">Суточные выплаты при госпитализации вследствие несчастного случая</p>
        <div v-if="local.hospitalization.enabled" class="rider-params">
          <div class="param-group">
            <label>Страховая сумма (тенге)</label>
            <input type="number" v-model.number="local.hospitalization.sum" min="0" step="100000" />
          </div>
        </div>
      </div>

      <!-- Освобождение от взносов при инвалидности от НС -->
      <div class="rider-card" :class="{ active: local.disability_waiver?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.disability_waiver.enabled" />
            <span class="rider-name">Освобождение от взносов (НС)</span>
          </label>
          <span class="rider-tag">Waiver</span>
        </div>
        <p class="rider-desc">Освобождение от уплаты взносов при установлении инвалидности от НС</p>
      </div>

      <!-- Критические заболевания -->
      <div class="rider-card" :class="{ active: local.critical_illness?.enabled }">
        <div class="rider-header">
          <label class="rider-checkbox">
            <input type="checkbox" v-model="local.critical_illness.enabled" />
            <span class="rider-name">Критические заболевания (КЗ)</span>
          </label>
          <span class="rider-tag">CI актуарный</span>
        </div>
        <p class="rider-desc">Выплата при диагностировании критического заболевания (двойной декремент)</p>
        <div v-if="local.critical_illness.enabled" class="rider-params">
          <div class="param-group">
            <label>Страховая сумма КЗ (тенге)</label>
            <input type="number" v-model.number="local.critical_illness.sum" min="0" step="100000" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

// Инициализируем все допы с дефолтными значениями если не переданы
const local = ref({
  accidental_death:           { enabled: false, ...props.modelValue.accidental_death },
  disability_accident_lumpsum:{ enabled: false, ...props.modelValue.disability_accident_lumpsum },
  trauma:                     { enabled: false, sum: 1_000_000, multiplier: 1, ...props.modelValue.trauma },
  temporary_disability:       { enabled: false, sum: 1_000_000, ...props.modelValue.temporary_disability },
  hospitalization:             { enabled: false, sum: 1_000_000, ...props.modelValue.hospitalization },
  disability_waiver:           { enabled: false, ...props.modelValue.disability_waiver },
  critical_illness:            { enabled: false, sum: 1_000_000, ...props.modelValue.critical_illness },
});

watch(local, (val) => emit('update:modelValue', { ...val }), { deep: true });
</script>

<style scoped>
.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a1a2e;
}

.riders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}

.rider-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 0.85rem;
  background: #fafafa;
  transition: border-color 0.15s, background 0.15s;
}

.rider-card.active {
  border-color: #4f46e5;
  background: #f5f3ff;
}

.rider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.rider-checkbox {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.rider-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.rider-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1f2937;
}

.rider-tag {
  font-size: 0.65rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 20px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
}

.rider-desc {
  font-size: 0.76rem;
  color: #6b7280;
  margin: 0.35rem 0 0;
  line-height: 1.4;
}

.rider-params {
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.param-group label {
  font-size: 0.72rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.param-group input,
.param-group select {
  padding: 0.35rem 0.55rem;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  font-size: 0.88rem;
}

.param-group input:focus,
.param-group select:focus {
  outline: none;
  border-color: #4f46e5;
}
</style>
