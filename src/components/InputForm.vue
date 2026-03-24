<template>
  <div class="input-form">
    <h2 class="form-title">ДАННЫЕ</h2>

    <div class="form-grid">
      <!-- Дата рождения | Пол -->
      <div class="form-group">
        <label for="dob">Дата рождения</label>
        <input
          ref="dobInput"
          id="dob"
          type="text"
          placeholder="ДД.ММ.ГГГГ"
          maxlength="10"
          @input="onDobInput"
          @blur="onDobBlur"
          class="neu-input"
        />
        <span v-if="local.dob" class="hint">Возраст: {{ currentAge }} лет</span>
      </div>

      <div class="form-group">
        <label>Пол</label>
        <div class="radio-group">
          <label class="radio-pill">
            <input type="radio" v-model="local.gender" value="male" />
            <span>Мужской</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="local.gender" value="female" />
            <span>Женский</span>
          </label>
        </div>
      </div>

      <!-- Срок страхования — слайдер, на всю ширину -->
      <div class="form-group term-group full-width">
        <div class="term-header">
          <label class="label-row">Срок страхования <InfoTooltip v-bind="TIP.term" /></label>
          <span class="term-badge">{{ local.term }} лет</span>
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
          Возраст на конец: {{ exitAge }} лет
          <span v-if="exitAge > maxExitAge" class="hint-warn"> (превышает {{ maxExitAge }})</span>
        </span>
      </div>

      <!-- Режим расчёта — на всю ширину, обе кнопки в одну строку -->
      <div class="form-group full-width">
        <label class="label-row">Режим расчёта <InfoTooltip v-bind="TIP.mode" /></label>
        <div class="mode-toggle">
          <label class="radio-pill">
            <input type="radio" v-model="local.mode" value="premium_to_sa" />
            <span>Взнос → Страховая сумма</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="local.mode" value="sa_to_premium" />
            <span>Страховая сумма → Взнос</span>
          </label>
        </div>
      </div>

      <!-- Валюта взносов -->
      <div class="form-group full-width">
        <label class="label-row">Валюта взносов и результатов</label>
        <div class="mode-toggle">
          <label class="radio-pill" :class="{ 'pill-faded': !usdRate }">
            <input type="radio" v-model="currencyMode" value="USD" />
            <span>$ Доллар (USD)</span>
          </label>
          <label class="radio-pill">
            <input type="radio" v-model="currencyMode" value="KZT" />
            <span>₸ Тенге (KZT)</span>
          </label>
        </div>
      </div>

      <!-- Периодичность | Курс доллара | Сумма — в одну строку -->
      <div class="three-col-row full-width">
        <div class="form-group three-col-item three-col-item--wide">
          <label for="frequency" class="label-row">Периодичность взносов <InfoTooltip v-bind="TIP.frequency" /></label>
          <select id="frequency" v-model="local.frequency" class="neu-input" :class="{ 'placeholder-shown': !local.frequency }">
            <option value="" disabled>Выберите частоту пополнения</option>
            <option value="annual">Раз в год</option>
            <option value="semiannual">Раз в полгода</option>
            <option value="quarterly">Раз в квартал</option>
            <option value="monthly">Ежемесячно</option>
            <option value="single">Единовременный</option>
          </select>
        </div>

        <div class="form-group three-col-item three-col-item--slim">
          <label class="label-row">
            Курс доллара
            <button
              class="cw-refresh-label"
              type="button"
              :disabled="cwRef?.isLoading"
              :title="cwRef?.isManual ? 'Сбросить к курсу НБРК' : 'Обновить курс НБРК'"
              @click="cwRef?.fetchRate()"
            >
              <span :class="{ 'cw-spin': cwRef?.isLoading }">↻</span>
            </button>
          </label>
          <CurrencyWidget ref="cwRef" />
        </div>

        <div class="form-group three-col-item three-col-item--narrow" v-if="local.mode === 'sa_to_premium'">
          <label for="sumAssured" class="label-row">
            Страховая сумма ({{ isUsdInput ? 'USD' : 'KZT' }}) <InfoTooltip v-bind="TIP.sumAssured" />
          </label>
          <div class="input-wrap">
            <span class="input-suffix">{{ isUsdInput ? '$' : '₸' }}</span>
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
          </div>
        </div>

        <div class="form-group three-col-item three-col-item--narrow" v-if="local.mode === 'premium_to_sa'">
          <label for="premium" class="label-row">
            Сумма взноса ({{ isUsdInput ? 'USD' : 'KZT' }}) <InfoTooltip v-bind="TIP.premium" />
          </label>
          <div class="input-wrap">
            <span class="input-suffix">{{ isUsdInput ? '$' : '₸' }}</span>
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
          </div>
        </div>
      </div>
    </div>

    <div class="annuity-toggle-wrap">
      <label class="annuity-toggle-label">
        <span class="toggle-icon-wrap">
          <input type="checkbox" v-model="local.enableAnnuity" class="annuity-chk" />
          <span class="custom-chk"></span>
        </span>
        <span class="toggle-text">Включить аннуитетные выплаты</span>
        <InfoTooltip v-bind="TIP.annuity" />
        <span class="toggle-arrow">{{ local.enableAnnuity ? '▲' : '▼' }}</span>
      </label>
    </div>

    <div v-if="local.enableAnnuity" class="form-grid annuity-grid">
      <!-- Периодичность выплат -->
      <div class="form-group full-width">
        <label for="annuityFrequency" class="label-row">Периодичность выплат <InfoTooltip v-bind="TIP.annuityFrequency" /></label>
        <select id="annuityFrequency" v-model="local.annuityFrequency" class="neu-input" required>
          <option value="annual">Раз в год</option>
          <option value="semiannual">Раз в полгода</option>
          <option value="quarterly">Раз в квартал</option>
          <option value="monthly">Раз в месяц</option>
        </select>

      </div>

      <!-- Срок выплат — слайдер -->
      <div class="form-group term-group full-width">
        <div class="term-header">
          <label class="label-row">Срок выплат <InfoTooltip v-bind="TIP.annuityTerm" /></label>
          <span class="term-badge">{{ local.annuityTerm }} лет</span>
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
          <label class="label-row">Гарантированный период <InfoTooltip v-bind="TIP.guaranteedPeriod" /></label>
          <span class="term-badge">{{ local.guaranteedPeriod }} лет</span>
        </div>
        <input
          type="range"
          v-model.number="local.guaranteedPeriod"
          min="0"
          :max="local.annuityTerm"
          :style="guaranteedPeriodSliderStyle"
          class="term-slider"
        />
        <span v-if="local.guaranteedPeriod === 0" class="hint">Без гарантированного периода</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { PolicyCalculator } from '../core/calculator.js';
import { PRODUCT_CONFIG } from '../config/product.js';
import InfoTooltip from './InfoTooltip.vue';
import CurrencyWidget from './CurrencyWidget.vue';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';

const { currencyMode, usdRate } = useCurrencyRate();

const TIP = {
  term: {
    title: 'Срок накопления',
    text: 'Период, в течение которого вы формируете свой капитал по полису.<br><br>Например, при сроке <b>20 лет</b> вы регулярно пополняете полис и к концу срока получаете всю накопленную сумму с инвестиционным доходом.<br><br><b>Чем дольше срок — тем больше итоговый капитал</b>: накопления растут за счёт сложного процента, и каждый дополнительный год значительно увеличивает результат.',
  },
  mode: {
    title: 'Режим расчёта',
    text: 'Выберите удобный способ настройки полиса:<br><br><b>Страховая сумма → Взнос:</b> укажите желаемый масштаб накоплений и защиты — калькулятор рассчитает нужный размер взноса.<br><br><b>Взнос → Страховая сумма:</b> укажите комфортную сумму пополнения — калькулятор покажет, какой капитал вы сформируете за выбранный срок.',
  },
  frequency: {
    title: 'Периодичность взносов',
    text: 'Как часто вы будете пополнять свой накопительный полис:<br><br>• <b>Раз в год</b> — один крупный взнос (самый выгодный вариант)<br>• <b>Раз в полгода</b> — два взноса в год<br>• <b>Раз в квартал</b> — четыре взноса в год<br>• <b>Ежемесячно</b> — небольшие регулярные пополнения<br>• <b>Единовременно</b> — весь взнос за срок сразу<br><br>При дробных выплатах итоговая годовая сумма чуть выше из-за коэффициента рассрочки.',
  },
  sumAssured: {
    title: 'Страховая сумма',
    text: 'Ключевой параметр полиса, определяющий <b>масштаб ваших накоплений и защиты</b>.<br><br>На основе этой суммы рассчитывается ваш взнос, темп роста накоплений и итоговый капитал к концу срока.<br><br>Одновременно она служит финансовой защитой вашей семьи на весь период накоплений — гарантируя, что ваш план будет выполнен в любой ситуации.',
  },
  premium: {
    title: 'Сумма взноса',
    text: 'Ваш регулярный вклад в формирование личного капитала.<br><br>Каждый взнос работает сразу в двух направлениях:<br>• <b>Накопительная часть</b> — растёт с гарантированным доходом и формирует ваши сбережения<br>• <b>Рисковая часть</b> — обеспечивает защиту плана накоплений на весь срок<br><br>По окончании срока весь накопленный капитал выплачивается вам.',
  },
  annuity: {
    title: 'Аннуитетные выплаты',
    text: 'Возможность получать <b>регулярный доход</b> из накоплений в удобный вам период жизни — как персональная рента или пенсия.<br><br>Вы сами задаёте срок и периодичность. Это удобно, если хотите обеспечить себе стабильный денежный поток — например, после выхода на пенсию или при крупных плановых расходах.<br><br>Включение аннуитета немного увеличивает размер взноса.',
  },
  annuityFrequency: {
    title: 'Периодичность выплат',
    text: 'Как часто вы хотите получать выплаты из накоплений:<br><br>• <b>Раз в год</b> — одна крупная выплата<br>• <b>Раз в полгода</b> — две выплаты в год<br>• <b>Раз в квартал</b> — четыре выплаты в год<br>• <b>Ежемесячно</b> — стабильный ежемесячный доход<br><br>Итоговая <b>годовая</b> сумма одинакова при любом варианте — меняется только размер каждой отдельной выплаты.',
  },
  annuityTerm: {
    title: 'Срок выплат',
    text: 'Как долго вы будете получать регулярный доход из своих накоплений.<br><br>Например, при сроке <b>10 лет</b> выплаты поступают 10 лет подряд.<br><br>• Более длинный срок — каждая выплата меньше, но поток дохода продолжительнее<br>• Более короткий срок — выплаты крупнее, капитал возвращается быстрее',
  },
  guaranteedPeriod: {
    title: 'Гарантированный период',
    text: 'Минимальный срок, в течение которого выплаты гарантированы <b>в любом случае</b> — это защита вашего финансового плана для семьи.<br><br>Пример: гарантированный период <b>5 лет</b>, срок выплат <b>10 лет</b>. Если в период выплат наступит непредвиденное — наследники продолжат получать выплаты до конца гарантированного срока.<br><br>Значение <b>0</b> — гарантированный период не предусмотрен.',
  },
};

const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(['update:modelValue']);
const { minTerm, maxTerm, maxExitAge } = PRODUCT_CONFIG;

const local = ref({ ...props.modelValue });

// ── DOM refs for manually managed inputs ──────────────────
const dobInput       = ref(null);
const sumAssuredInput = ref(null);
const premiumInput   = ref(null);
const cwRef          = ref(null);

// ── Number formatting ─────────────────────────────────────
// Integer formatter (whole tenge or whole dollars — no decimals)
function fmtNum(n) {
  if (!n) return '';
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

// When USD mode is active and a rate is available, inputs accept/display USD values
const isUsdInput = computed(() => currencyMode.value === 'USD' && !!usdRate.value);

// Stable USD values typed by the user — dollar amount stays fixed when rate changes
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
    // Count digits before cursor in the raw (unformatted) string
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/[^\d]/g, '').length;
    const allDigits = input.value.replace(/[^\d]/g, '');
    const inputNum = parseInt(allDigits, 10) || 0;
    if (isUsdInput.value && usdRate.value) {
      usdInputVal.value[field] = inputNum;          // remember stable USD amount
      local.value[field] = Math.round(inputNum * usdRate.value); // KZT for calculator
    } else {
      usdInputVal.value[field] = null;
      local.value[field] = inputNum;
    }
    // Always display integers (no cents/tiyn in inputs)
    const formatted = fmtNum(inputNum);
    input.value = formatted;
    // Restore cursor after Vue's reactive DOM update (if any)
    nextTick(() => {
      const fmt = input.value; // Use actual current value after Vue flush
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

// ── Date input ────────────────────────────────────────────
function isoToDmY(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function parseDob(raw) {
  const s = raw.trim();
  // Accept DD.MM.YY, DD.MM.YYYY, also / and - as separators
  const match = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (!match) return null;
  let d  = parseInt(match[1], 10);
  let mo = parseInt(match[2], 10);
  let y  = parseInt(match[3], 10);
  // Expand 2-digit year: ≥30 → 19xx, <30 → 20xx
  if (match[3].length <= 2) y = (y >= 30 ? 1900 : 2000) + y;
  const maxYear = new Date().getFullYear();
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > maxYear) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function onDobInput(e) {
  // Allow only digits and date separators while typing
  e.target.value = e.target.value.replace(/[^\d.\/-]/g, '').slice(0, 10);
}

function onDobBlur(e) {
  const parsed = parseDob(e.target.value);
  if (parsed) {
    local.value.dob = parsed;
    e.target.value = isoToDmY(parsed);
    onDobChange();
  } else if (!e.target.value.trim()) {
    local.value.dob = '';
  } else {
    // Invalid input — revert to last valid value
    e.target.value = isoToDmY(local.value.dob);
  }
}

// ── Lifecycle & watchers ──────────────────────────────────
onMounted(() => {
  if (dobInput.value && local.value.dob) {
    dobInput.value.value = isoToDmY(local.value.dob);
  }
});

watch(local, (val) => {
  emit('update:modelValue', { ...val });
}, { deep: true });

// Sync monetary inputs on mode/rate changes; keep dollar amount stable
watch([currencyMode, usdRate], ([newMode, newRate], [oldMode]) => {
  if (newMode === 'USD' && newRate) {
    if (oldMode !== 'USD') {
      // Switching FROM KZT to USD: initialise USD values from current KZT
      usdInputVal.value.sumAssured = local.value.sumAssured ? Math.round(local.value.sumAssured / newRate) : 0;
      usdInputVal.value.premium    = local.value.premium    ? Math.round(local.value.premium    / newRate) : 0;
    } else {
      // Rate changed while already in USD — keep dollar amounts stable, recalculate KZT
      if (usdInputVal.value.sumAssured !== null)
        local.value.sumAssured = Math.round(usdInputVal.value.sumAssured * newRate);
      if (usdInputVal.value.premium !== null)
        local.value.premium    = Math.round(usdInputVal.value.premium    * newRate);
    }
  } else if (newMode === 'KZT') {
    // Switching back to KZT: clear USD memory
    usdInputVal.value.sumAssured = null;
    usdInputVal.value.premium    = null;
  }
  nextTick(() => {
    if (sumAssuredInput.value) sumAssuredInput.value.value = displaySumAssured.value;
    if (premiumInput.value)    premiumInput.value.value    = displayPremium.value;
  });
});


watch(() => props.modelValue, (val) => {
  const prevDob = local.value.dob;
  Object.assign(local.value, val);
  // Sync date display if changed from outside
  if (dobInput.value && val.dob !== prevDob) {
    dobInput.value.value = isoToDmY(val.dob);
  }
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
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.07) 100%)`,
  };
});

const annuityTermSliderStyle = computed(() => {
  const min = 1, max = 50, val = local.value.annuityTerm || 1;
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  return {
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.07) 100%)`,
  };
});

const guaranteedPeriodSliderStyle = computed(() => {
  const min = 0, max = local.value.annuityTerm || 1, val = local.value.guaranteedPeriod || 0;
  const pct = max > 0 ? (val / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, #47903C 0%, #BBD034 ${pct}%, rgba(255,255,255,0.12) ${pct}%, rgba(255,255,255,0.07) 100%)`,
  };
});

function onDobChange() {
  if (currentAge.value && local.value.term) {
    const allowed = maxExitAge - currentAge.value;
    if (local.value.term > allowed) local.value.term = Math.max(minTerm, Math.min(local.value.term, allowed));
  }
}

function normalizeTermInput() {
  const max = maxTermAllowed.value;
  const parsed = parseInt(local.value.term, 10);
  if (!Number.isFinite(parsed)) {
    local.value.term = minTerm;
    return;
  }
  local.value.term = Math.max(minTerm, Math.min(max, parsed));
}
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

.cw-date-hint {
  font-size: 10px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.35);
  margin-left: 4px;
}
.cw-date-hint--manual {
  color: rgba(255, 183, 77, 0.6);
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

.required-star {
  color: #ff8a80;
  font-weight: 800;
}

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
}
.neu-input:focus { border-color: var(--accent); box-shadow: var(--shadow-btn-press); }
select#frequency.placeholder-shown { font-weight: 400; font-size: 12px; }
select#frequency:not(.placeholder-shown) { font-weight: 600; font-size: 14px; }
select#annuityFrequency { font-size: 14px; font-weight: 600; }

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
.input-suffix {
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
  box-shadow: 0 2px 8px rgba(71,144,60,0.4);
}
.pill-faded span { opacity: 0.45; }

/* ── Term slider ─────────────────────── */
.term-header { display: flex; align-items: center; justify-content: space-between; padding-right: 4px; }
.term-badge {
  background: linear-gradient(135deg, #BBD034, #47903C);
  color: white; font-size: 14px; font-weight: 800;
  padding: 3px 14px; border-radius: 20px;
  box-shadow: 0 2px 8px rgba(71,144,60,0.4);
  margin-right: 2px;
}
.term-slider { margin-top: 10px; width: 100%; }
.term-input-wrap {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #BBD034, #47903C);
  border-radius: 20px;
  padding: 3px 10px;
  box-shadow: 0 2px 8px rgba(71,144,60,0.4);
  margin-right: 2px;
}
.term-number-input {
  width: 44px;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-align: right;
  outline: none;
}
.term-number-input::-webkit-outer-spin-button,
.term-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.term-number-input[type=number] {
  -moz-appearance: textfield;
}
.term-input-suffix {
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

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
  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .term-header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .term-input-wrap {
    margin-left: auto;
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
  }

  .radio-pill {
    flex: 1 1 0;
    min-width: 0;
  }

  .radio-pill span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .annuity-toggle-label {
    align-items: flex-start;
  }

  .toggle-text {
    font-size: 12px;
  }
}
</style>
