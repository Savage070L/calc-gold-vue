<template>
  <div class="currency-widget" :class="{ 'cw--manual': isManual }">

    <!-- Chip: icon + currency name -->
    <div class="cw-chip">
      <span class="cw-chip-icon">💵</span>
      <span class="cw-chip-label">Доллар США</span>
    </div>

    <!-- Editable rate -->
    <div class="cw-rate-wrap">
      <input
        ref="inputRef"
        class="cw-input"
        type="text"
        inputmode="decimal"
        :value="inputVal"
        :placeholder="isLoading ? '…' : '—'"
        :disabled="isLoading"
        autocomplete="off"
        spellcheck="false"
        title="Введите курс вручную"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown.enter.prevent="($event.target).blur()"
      />
      <span class="cw-unit">₸</span>
    </div>

    <!-- Date + source label -->
    <span class="cw-meta" v-if="displayDate">{{ displayDate }} (НБРК)</span>
    <span class="cw-meta cw-meta--manual" v-else-if="isManual">вручную</span>

    <!-- Refresh button -->
    <button
      class="cw-refresh"
      type="button"
      :disabled="isLoading"
      :title="isManual ? 'Сбросить к курсу НБРК' : 'Обновить курс НБРК'"
      @click="fetchRate"
    >
      <span :class="{ 'cw-spin': isLoading }">↻</span>
    </button>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCurrencyRate } from '../composables/useCurrencyRate.js';

const { usdRate } = useCurrencyRate();

// ── State ─────────────────────────────────
const inputVal   = ref('');
const nbrkRate   = ref(null);
const fetchDate  = ref('');
const isLoading  = ref(false);
const isManual   = ref(false);
const inputRef   = ref(null);

// ── Derived ───────────────────────────────
// Date formatted as dd.mm.yy
const displayDate = computed(() => {
  if (isLoading.value) return '';
  if (!fetchDate.value) return '';
  const parts = fetchDate.value.split('.');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2].slice(2)}`;
  }
  return fetchDate.value;
});

// ── Input handlers ────────────────────────
function onFocus(e) {
  e.target.select();
}

function onBlur() {
  const num = parseFloat(String(inputVal.value).replace(',', '.'));
  if (!isNaN(num) && num > 0) {
    inputVal.value = num.toFixed(2);
  } else if (nbrkRate.value) {
    inputVal.value = nbrkRate.value.toFixed(2);
    isManual.value = false;
  }
}

function onInput(e) {
  const raw = e.target.value;
  inputVal.value = raw;
  const num = parseFloat(String(raw).replace(',', '.'));
  if (!isNaN(num) && num > 0) {
    usdRate.value  = num;
    isManual.value = true;
  }
}

// ── Fetch from NBRK ───────────────────────
async function fetchRate() {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const dateStr = todayStr();
    const base    = import.meta.env.DEV ? '/api/nbrk' : 'https://nationalbank.kz';
    const url     = `${base}/rss/get_rates.cfm?fdate=${dateStr}`;
    const res     = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyParsed(await res.text());
  } catch (err) {
    console.warn('[CurrencyWidget] fetch error:', err.message);
    loadFromCache();
  } finally {
    isLoading.value = false;
  }
}

function applyParsed(xml) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xml, 'text/xml');
  const dateEl = doc.querySelector('date');
  if (dateEl) fetchDate.value = dateEl.textContent.trim();
  for (const item of doc.querySelectorAll('item')) {
    if (item.querySelector('title')?.textContent?.trim() === 'USD') {
      const rateStr = item.querySelector('description')?.textContent?.trim() ?? '';
      const num = parseFloat(rateStr);
      if (!isNaN(num) && num > 0) {
        nbrkRate.value = num;
        usdRate.value  = num;
        inputVal.value = num.toFixed(2);
        isManual.value = false;
        cacheData(num);
      }
      break;
    }
  }
}

function cacheData(rate) {
  try {
    localStorage.setItem('nbrk_usd_cache', JSON.stringify({
      rate, date: fetchDate.value, ts: Date.now(),
    }));
  } catch (_) {}
}

function loadFromCache() {
  try {
    const c = JSON.parse(localStorage.getItem('nbrk_usd_cache') || 'null');
    if (c && Date.now() - c.ts < 86_400_000) {
      nbrkRate.value  = c.rate;
      usdRate.value   = c.rate;
      inputVal.value  = Number(c.rate).toFixed(2);
      fetchDate.value = c.date ? c.date : '';
      isManual.value  = false;
    }
  } catch (_) {}
}

function todayStr() {
  const d = new Date();
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    d.getFullYear(),
  ].join('.');
}

onMounted(fetchRate);
</script>

<style scoped>
/* ── Widget container ─────────────────── */
.currency-widget {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(66, 165, 245, 0.18);
  border-radius: 12px;
  padding: 9px 14px;
  width: 100%;
  min-width: 0;
  transition: border-color 0.2s;
}
.currency-widget:hover {
  border-color: rgba(66, 165, 245, 0.32);
}
.cw--manual {
  border-color: rgba(255, 183, 77, 0.35);
}

/* ── Chip: 💵 Доллар США ─────────────── */
.cw-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(66, 165, 245, 0.14);
  border: 1px solid rgba(66, 165, 245, 0.28);
  border-radius: 8px;
  padding: 5px 11px;
  flex-shrink: 0;
}
.cw-chip-icon { font-size: 15px; line-height: 1; }
.cw-chip-label {
  font-size: 12px;
  font-weight: 800;
  color: #90CAF9;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

/* ── Rate input ──────────────────────── */
.cw-rate-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.cw-input {
  background: transparent;
  border: none;
  border-bottom: 1.5px dashed rgba(144, 202, 249, 0.4);
  border-radius: 3px 3px 0 0;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  font-family: 'SF Mono', 'Menlo', monospace;
  letter-spacing: 0.02em;
  width: 84px;
  outline: none;
  padding: 1px 4px 2px;
  text-align: right;
  transition: border-color 0.18s, background 0.18s;
  cursor: text;
}
.cw-input:focus {
  border-bottom-color: #42A5F5;
  border-bottom-style: solid;
  background: rgba(66, 165, 245, 0.08);
}
.cw-input:disabled {
  color: rgba(255,255,255,0.3);
  cursor: not-allowed;
}
.cw-input::placeholder { color: rgba(255,255,255,0.25); }
.cw--manual .cw-input {
  border-bottom-color: rgba(255, 183, 77, 0.5);
}

.cw-unit {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}

/* ── Date / source ────────────────────── */
.cw-meta {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.cw-meta--manual {
  color: rgba(255, 183, 77, 0.6);
}

/* ── Refresh button ───────────────────── */
.cw-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: rgba(66, 165, 245, 0.1);
  border: 1px solid rgba(66, 165, 245, 0.28);
  border-radius: 8px;
  color: rgba(144, 202, 249, 0.75);
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s;
}
.cw-refresh:hover:not(:disabled) {
  background: rgba(66, 165, 245, 0.22);
  border-color: rgba(66, 165, 245, 0.5);
  color: #90CAF9;
}
.cw-refresh:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cw--manual .cw-refresh {
  border-color: rgba(255, 183, 77, 0.35);
  color: rgba(255, 183, 77, 0.7);
  background: rgba(255, 183, 77, 0.08);
}
.cw--manual .cw-refresh:hover:not(:disabled) {
  background: rgba(255, 183, 77, 0.18);
  border-color: rgba(255, 183, 77, 0.6);
}

/* ── Spin animation ───────────────────── */
.cw-spin {
  display: inline-block;
  animation: cwSpin 0.75s linear infinite;
}
@keyframes cwSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .currency-widget {
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px;
  }

  .cw-chip {
    order: 1;
    width: 100%;
    justify-content: center;
  }

  .cw-rate-wrap {
    order: 2;
  }

  .cw-meta {
    order: 3;
    white-space: normal;
  }

  .cw-refresh {
    order: 4;
    margin-left: auto;
  }
}
</style>
