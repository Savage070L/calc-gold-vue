<template>
  <div class="input-form">
    <h2 class="form-title">{{ t('dataHeader') }}</h2>

    <div class="form-grid">
      <!-- Дата рождения | Пол -->
      <div class="form-group">
        <label for="dob">{{ t('form.dob') }}</label>
        <input
          id="dob"
          type="date"
          v-model="local.dob"
          :max="todayIso"
          min="1900-01-01"
          class="neu-input"
        />
        <span v-if="local.dob" class="hint">{{ t('form.age') }}: {{ currentAge }} {{ t('form.ageYears') }}</span>
      </div>

      <div class="form-group">
        <label>{{ t('form.gender') }}</label>
        <div class="radio-group">
          <label class="radio-pill">
            <input type="radio" v-model="local.gender" value="male" />
            <span>{{ t('form.male') }}</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="local.gender" value="female" />
            <span>{{ t('form.female') }}</span>
          </label>
        </div>
      </div>

      <!-- Срок страхования — слайдер, на всю ширину -->
      <div class="form-group term-group full-width">
        <div class="term-header">
          <label class="label-row">{{ t('form.term') }} <InfoTooltip v-bind="tip('term')" /></label>
          <span class="term-badge">{{ pluralYears(local.term) }}</span>
        </div>
        <input
          type="range"
          v-model.number="local.term"
          :min="minTerm"
          :max="maxTermAllowed"
          :style="termSliderStyle"
          class="term-slider"
        />
        <span v-if="local.dob && local.term" class="hint">
          {{ t('form.exitAge') }}: {{ exitAge }} {{ t('form.ageYears') }}
          <span v-if="exitAge > maxExitAge" class="hint-warn"> ({{ t('form.exceeds') }} {{ maxExitAge }})</span>
        </span>
      </div>

      <!-- Периодичность | Курс доллара | Сумма — в одну строку -->
      <div class="three-col-row full-width">
        <div class="form-group three-col-item three-col-item--wide">
          <label for="frequency" class="label-row">{{ t('form.frequency') }} <InfoTooltip v-bind="tip('frequency')" /></label>
          <select id="frequency" v-model="local.frequency" class="neu-input" :class="{ 'placeholder-shown': !local.frequency }">
            <option value="" disabled>{{ t('form.freqPlaceholder') }}</option>
            <option value="annual">{{ t('form.freq.annual') }}</option>
            <option value="semiannual">{{ t('form.freq.semiannual') }}</option>
            <option value="quarterly">{{ t('form.freq.quarterly') }}</option>
            <option value="monthly">{{ t('form.freq.monthly') }}</option>
            <option value="single">{{ t('form.freq.single') }}</option>
          </select>
        </div>

        <div class="form-group three-col-item three-col-item--slim">
          <label class="label-row">
            {{ t('form.usdRate') }}
            <button
              class="cw-refresh-label"
              type="button"
              :disabled="cwRef?.isLoading"
              :title="cwRef?.isManual ? t('form.resetRate') : t('form.refreshRate')"
              @click="cwRef?.fetchRate()"
            >
              <span :class="{ 'cw-spin': cwRef?.isLoading }">↻</span>
            </button>
          </label>
          <CurrencyWidget ref="cwRef" />
        </div>

        <div class="form-group three-col-item three-col-item--narrow" v-if="local.mode === 'sa_to_premium'">
          <label for="sumAssured" class="label-row">
            {{ t('form.sumAssured') }} ({{ isUsdInput ? 'USD' : 'KZT' }}) <InfoTooltip v-bind="tip('sumAssured')" />
          </label>
          <div class="input-wrap">
            <span v-if="isUsdInput" class="input-affix input-prefix">$</span>
            <input
              ref="sumAssuredInput"
              id="sumAssured"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :value="displaySumAssured"
              @input="onSumInput"
              class="neu-input"
            />
            <span v-if="!isUsdInput" class="input-affix input-suffix">₸</span>
          </div>
        </div>

        <div class="form-group three-col-item three-col-item--narrow" v-if="local.mode === 'premium_to_sa'">
          <label for="premium" class="label-row">
            {{ t('form.premium') }} ({{ isUsdInput ? 'USD' : 'KZT' }}) <InfoTooltip v-bind="tip('premium')" />
          </label>
          <div class="input-wrap">
            <span v-if="isUsdInput" class="input-affix input-prefix">$</span>
            <input
              ref="premiumInput"
              id="premium"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :value="displayPremium"
              @input="onPremInput"
              class="neu-input"
            />
            <span v-if="!isUsdInput" class="input-affix input-suffix">₸</span>
          </div>
        </div>
      </div>

      <!-- Режим расчёта — на всю ширину, обе кнопки в одну строку -->
      <div class="form-group full-width">
        <label class="label-row">{{ t('form.mode') }} <InfoTooltip v-bind="tip('mode')" /></label>
        <div class="mode-toggle">
          <label class="radio-pill">
            <input type="radio" v-model="local.mode" value="premium_to_sa" />
            <span>{{ t('form.modePremiumToSa') }}</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="local.mode" value="sa_to_premium" />
            <span>{{ t('form.modeSaToPremium') }}</span>
          </label>
        </div>
      </div>

      <!-- Валюта взносов -->
      <div class="form-group full-width">
        <label class="label-row">{{ t('form.currencyToggleLabel') }}</label>
        <div class="mode-toggle">
          <label class="radio-pill" :class="{ 'pill-faded': !usdRate }">
            <input type="radio" v-model="currencyMode" value="USD" />
            <span>{{ t('form.currencyUsd') }}</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="currencyMode" value="KZT" />
            <span>{{ t('form.currencyKzt') }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="annuity-toggle-wrap">
      <label class="annuity-toggle-label">
        <span class="toggle-icon-wrap">
          <input type="checkbox" v-model="local.enableAnnuity" class="annuity-chk" />
          <span class="custom-chk"></span>
        </span>
        <span class="toggle-text">{{ t('form.enableAnnuity') }}</span>
        <InfoTooltip v-bind="tip('annuity')" />
        <span class="toggle-arrow">{{ local.enableAnnuity ? '▲' : '▼' }}</span>
      </label>
    </div>

    <div v-if="local.enableAnnuity" class="form-grid annuity-grid">
      <!-- Периодичность выплат -->
      <div class="form-group full-width">
        <label for="annuityFrequency" class="label-row">{{ t('form.annuityFrequency') }} <InfoTooltip v-bind="tip('annuityFrequency')" /></label>
        <select id="annuityFrequency" v-model="local.annuityFrequency" class="neu-input" required>
          <option value="annual">{{ t('form.annuityFreq.annual') }}</option>
          <option value="semiannual">{{ t('form.annuityFreq.semiannual') }}</option>
          <option value="quarterly">{{ t('form.annuityFreq.quarterly') }}</option>
          <option value="monthly">{{ t('form.annuityFreq.monthly') }}</option>
        </select>
      </div>

      <!-- Срок выплат — слайдер -->
      <div class="form-group term-group full-width">
        <div class="term-header">
          <label class="label-row">{{ t('form.annuityTerm') }} <InfoTooltip v-bind="tip('annuityTerm')" /></label>
          <span class="term-badge">{{ pluralYears(local.annuityTerm) }}</span>
        </div>
        <input
          type="range"
          v-model.number="local.annuityTerm"
          min="1"
          max="50"
          :style="annuityTermSliderStyle"
          class="term-slider"
        />
      </div>

      <!-- Гарантированный период — слайдер -->
      <div class="form-group term-group full-width">
        <div class="term-header">
          <label class="label-row">{{ t('form.guaranteedPeriod') }} <InfoTooltip v-bind="tip('guaranteedPeriod')" /></label>
          <span class="term-badge">{{ pluralYears(local.guaranteedPeriod) }}</span>
        </div>
        <input
          type="range"
          v-model.number="local.guaranteedPeriod"
          min="0"
          :max="local.annuityTerm"
          :style="guaranteedPeriodSliderStyle"
          class="term-slider"
        />
        <span v-if="local.guaranteedPeriod === 0" class="hint">{{ t('form.noGuaranteedPeriod') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { PolicyCalculator } from '../core/calculator.js';
import { PRODUCT_CONFIG } from '../config/product.js';
import InfoTooltip from './InfoTooltip.vue';
import CurrencyWidget from './CurrencyWidget.vue';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';
import { useI18n } from '../i18n/index.js';

const { t, tip, pluralYears } = useI18n();
const { currencyMode, usdRate } = useCurrencyRate();

const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(['update:modelValue']);
const { minTerm, maxTerm, maxExitAge } = PRODUCT_CONFIG;

const local = ref({ ...props.modelValue });

const todayIso = computed(() => new Date().toISOString().slice(0, 10));

// ── DOM refs ─────────────────────────────────────
const sumAssuredInput = ref(null);
const premiumInput   = ref(null);
const cwRef          = ref(null);

// ── Number formatting ─────────────────────────────
function fmtNum(n) {
  if (!n) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

const isUsdInput = computed(() => currencyMode.value === 'USD' && !!usdRate.value);

const usdInputVal = ref({ sumAssured: null, premium: null });

const displaySumAssured = computed(() => {
  if (isUsdInput.value) {
    const usd = usdInputVal.value.sumAssured ?? (local.value.sumAssured ? Math.round(local.value.sumAssured / usdRate.value) : 0);
    return fmtNum(usd);
  }
  return fmtNum(local.value.sumAssured);
});
const displayPremium = computed(() => {
  if (isUsdInput.value) {
    const usd = usdInputVal.value.premium ?? (local.value.premium ? Math.round(local.value.premium / usdRate.value) : 0);
    return fmtNum(usd);
  }
  return fmtNum(local.value.premium);
});

function makeNumHandler(field) {
  return function (e) {
    const input = e.target;
    const cursor = input.selectionStart;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/[^\d]/g, '').length;
    const allDigits = input.value.replace(/[^\d]/g, '');
    const inputNum = parseInt(allDigits, 10) || 0;
    if (isUsdInput.value && usdRate.value) {
      usdInputVal.value[field] = inputNum;
      local.value[field] = Math.round(inputNum * usdRate.value);
    } else {
      usdInputVal.value[field] = null;
      local.value[field] = inputNum;
    }
    const formatted = fmtNum(inputNum);
    input.value = formatted;
    nextTick(() => {
      const fmt = input.value;
      let digitsSeen = 0, newPos = fmt.length;
      for (let i = 0; i < fmt.length; i++) {
        if (/\d/.test(fmt[i])) {
          digitsSeen++;
          if (digitsSeen === digitsBeforeCursor) { newPos = i + 1; break; }
        }
      }
      if (digitsBeforeCursor === 0) newPos = 0;
      input.setSelectionRange(newPos, newPos);
    });
  };
}

const onSumInput  = makeNumHandler('sumAssured');
const onPremInput = makeNumHandler('premium');

// ── Lifecycle & watchers ──────────────────────────────────
watch(local, (val) => {
  emit('update:modelValue', { ...val });
}, { deep: true });

watch([currencyMode, usdRate], ([newMode, newRate], [oldMode]) => {
  if (newMode === 'USD' && newRate) {
    if (oldMode !== 'USD') {
      usdInputVal.value.sumAssured = local.value.sumAssured ? Math.round(local.value.sumAssured / newRate) : 0;
      usdInputVal.value.premium    = local.value.premium    ? Math.round(local.value.premium    / newRate) : 0;
    } else {
      if (usdInputVal.value.sumAssured !== null)
        local.value.sumAssured = Math.round(usdInputVal.value.sumAssured * newRate);
      if (usdInputVal.value.premium !== null)
        local.value.premium    = Math.round(usdInputVal.value.premium    * newRate);
    }
  } else if (newMode === 'KZT') {
    usdInputVal.value.sumAssured = null;
    usdInputVal.value.premium    = null;
  }
  nextTick(() => {
    if (sumAssuredInput.value) sumAssuredInput.value.value = displaySumAssured.value;
    if (premiumInput.value)    premiumInput.value.value    = displayPremium.value;
  });
});

watch(() => props.modelValue, (val) => {
  Object.assign(local.value, val);
}, { deep: true });

// ── Computed ──────────────────────────────────────────────
const currentAge     = computed(() => local.value.dob ? PolicyCalculator.calculateAge(local.value.dob) : null);
const exitAge        = computed(() => currentAge.value && local.value.term ? currentAge.value + local.value.term : null);
const maxTermAllowed = computed(() => currentAge.value ? Math.min(maxTerm, maxExitAge - currentAge.value) : maxTerm);

watch(maxTermAllowed, (max) => {
  if (local.value.term > max) {
    local.value.term = Math.max(minTerm, max);
  }
});

const termSliderStyle = computed(() => {
  const min = minTerm, max = maxTermAllowed.value, val = local.value.term;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  return {
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(25,60,110,0.12) ${pct}%, rgba(25,60,110,0.07) 100%)`,
  };
});

const annuityTermSliderStyle = computed(() => {
  const min = 1, max = 50, val = local.value.annuityTerm || 1;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  return {
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(25,60,110,0.12) ${pct}%, rgba(25,60,110,0.07) 100%)`,
  };
});

const guaranteedPeriodSliderStyle = computed(() => {
  const min = 0, max = local.value.annuityTerm || 1, val = local.value.guaranteedPeriod || 0;
  const pct = max > 0 ? (val / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(25,60,110,0.12) ${pct}%, rgba(25,60,110,0.07) 100%)`,
  };
});
</script>

<style scoped>
.form-title {
  font-size: 15px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 2px;
  color: var(--text-main);
  margin-bottom: 16px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.full-width { grid-column: 1 / -1; }

.three-col-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-end;
}
.three-col-row .label-row {
  min-height: 30px;
  display: flex;
  align-items: flex-end;
}
.three-col-item {
  flex: 1 1 160px;
  min-width: 0;
}
.three-col-item--wide {
  flex: 1.07 1 160px;
}
.three-col-item--narrow {
  flex: 1.05 1 170px;
}
.three-col-item--slim {
  flex: 0.85 1 140px;
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label {
  font-size: 12px; font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.label-row {
  display: flex; align-items: center; gap: 5px;
}

.cw-refresh-label {
  background: none; border: none; color: rgba(255,255,255,0.5);
  cursor: pointer; font-size: 14px; padding: 0 2px;
  transition: color 0.2s;
}
.cw-refresh-label:hover { color: #BBD034; }
.cw-refresh-label:disabled { opacity: 0.3; cursor: not-allowed; }
@keyframes cw-spin-anim { to { transform: rotate(360deg); } }
.cw-spin { display: inline-block; animation: cw-spin-anim 0.8s linear infinite; }

/* ── Inputs ─────────────────────────── */
.neu-input {
  width: 100%; padding: 10px 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 12px; font-weight: 600;
  background: var(--surface);
  box-shadow: var(--shadow-in);
  color: var(--text-main);
  outline: none;
  transition: border-color 0.2s ease;
  height: 40px;
  box-sizing: border-box;
  font-family: inherit;
}
.neu-input:focus { border-color: var(--accent); box-shadow: var(--shadow-btn-press); }
select#frequency.placeholder-shown { font-weight: 400; font-size: 12px; }
select#frequency:not(.placeholder-shown) { font-weight: 600; font-size: 14px; }
select#annuityFrequency { font-size: 14px; font-weight: 600; }

input[type="date"].neu-input {
  font-size: 14px; font-weight: 600;
  color-scheme: dark;
}
input[type="date"].neu-input::-webkit-calendar-picker-indicator {
  filter: invert(0.85);
  cursor: pointer;
  opacity: 0.7;
}
input[type="date"].neu-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }

.input-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 10px 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow-in);
  transition: border-color 0.2s ease;
  height: 40px;
  box-sizing: border-box;
}
.input-wrap:focus-within { border-color: var(--accent); box-shadow: var(--shadow-btn-press); }
.input-wrap .neu-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  font-size: 16px;
  font-weight: 700;
}
.input-wrap .neu-input:focus { border: none; box-shadow: none; }
.input-affix {
  font-size: 14px; font-weight: 600; color: #E7F4FD; flex-shrink: 0;
}

/* ── Radio pills ─────────────────────── */
.radio-group { display: flex; gap: 7px; }
.mode-toggle { display: flex; gap: 7px; }
.radio-pill { flex: 1; position: relative; }
.radio-pill input { display: none; }
.radio-pill span {
  display: flex; align-items: center; justify-content: center;
  text-align: center; white-space: nowrap;
  padding: 10px 14px; border-radius: 10px;
  cursor: pointer; font-size: 12px; font-weight: 600;
  background: var(--surface);
  box-shadow: var(--shadow-btn);
  color: var(--text-light);
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
  height: 42px;
}
.radio-pill input:checked + span {
  background: linear-gradient(135deg, #BBD034, #47903C);
  color: white; border: none;
}
.pill-faded span { opacity: 0.45; }

/* ── Term slider ─────────────────────── */
.term-header { display: flex; align-items: center; justify-content: space-between; padding-right: 4px; }
.term-badge {
  background: linear-gradient(135deg, #BBD034, #47903C);
  color: white; font-size: 14px; font-weight: 800;
  padding: 3px 14px; border-radius: 20px;
  margin-right: 2px;
}
.term-slider { margin-top: 10px; width: 100%; }

/* ── Hints ───────────────────────────── */
.hint { font-size: 12px; color: var(--text-light); }
.hint-warn { color: #ff5252; }

/* ── Annuity toggle ─────────────────────── */
.annuity-toggle-wrap { margin-top: 16px; }
.annuity-toggle-label {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 15px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid rgba(66,165,245,0.22);
  background: rgba(66,165,245,0.07);
  transition: background 0.2s ease, border-color 0.2s ease;
  user-select: none;
}
.annuity-toggle-label:hover {
  background: rgba(66,165,245,0.12);
  border-color: rgba(66,165,245,0.4);
}
.toggle-icon-wrap { position: relative; width: 18px; height: 18px; flex-shrink: 0; }
.annuity-chk { position: absolute; opacity: 0; width: 0; height: 0; }
.custom-chk {
  display: block; width: 18px; height: 18px;
  border-radius: 5px;
  border: none;
  background: rgba(255,255,255,0.15);
  transition: all 0.2s ease;
  position: relative;
}
.annuity-chk:checked ~ .custom-chk {
  background: linear-gradient(135deg, #BBD034, #47903C);
}
.annuity-chk:checked ~ .custom-chk::after {
  content: '✓';
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px; color: white; font-weight: 800;
}
.toggle-text {
  font-size: 13px; font-weight: 700;
  color: #42A5F5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex: 1;
}
.toggle-arrow { font-size: 10px; color: #7FB3D3; }

.annuity-grid {
  margin-top: 12px; padding: 12px; border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--surface); box-shadow: var(--shadow-in);
}

@media (max-width: 720px) {
  /* Grid/flex children should never overflow their container */
  .input-form,
  .form-grid,
  .form-group,
  .three-col-row,
  .three-col-item,
  .three-col-item--wide,
  .three-col-item--narrow,
  .three-col-item--slim {
    min-width: 0;
    max-width: 100%;
  }
  .neu-input,
  .input-wrap,
  select,
  input {
    min-width: 0;
    max-width: 100%;
  }

  .form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .three-col-row {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  .three-col-item,
  .three-col-item--wide,
  .three-col-item--narrow,
  .three-col-item--slim {
    flex: 0 0 auto;
    width: 100%;
  }
  .three-col-row .label-row {
    min-height: 0;
    align-items: center;
  }

  .term-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .radio-group,
  .mode-toggle {
    flex-direction: row;
  }

  .radio-pill span {
    min-height: 34px;
    height: auto;
    white-space: nowrap;
    line-height: 1.2;
    padding: 6px 8px;
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .radio-pill {
    flex: 1 1 0;
    min-width: 0;
  }

  .annuity-toggle-label {
    align-items: flex-start;
  }

  .toggle-text {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .form-title {
    font-size: 13px;
    letter-spacing: 1px;
    margin-bottom: 10px;
    padding-bottom: 8px;
  }
  .form-group label { font-size: 11px; }
  .neu-input,
  .input-wrap {
    height: 36px;
    padding: 8px 10px;
    font-size: 13px;
  }
  .input-wrap .neu-input { font-size: 15px; }
  .term-badge {
    font-size: 11px;
    padding: 2px 10px;
  }
  .term-header {
    gap: 6px;
    padding-right: 0;
  }
  .form-grid { gap: 10px; }
  .annuity-toggle-label {
    padding: 9px 12px;
    gap: 8px;
  }
  .toggle-text { font-size: 11px; letter-spacing: 0.03em; }
}
</style>
