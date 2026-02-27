import { ref } from 'vue';

// ── Module-level singletons (shared across all component instances) ──
const usdRate      = ref(null);       // KZT per 1 USD, e.g. 501.75
const currencyMode = ref('KZT');      // 'KZT' | 'USD'

export function useCurrencyRate() {
  /** Raw USD string: "15 476 $" or "1,10 $" — cents only when non-zero */
  function toUsdStr(kzt) {
    if (!usdRate.value || !kzt) return null;
    const usd = kzt / usdRate.value;
    const hasCents = Math.round(usd * 100) % 100 !== 0;
    const formatted = new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    }).format(usd);
    return formatted + '\u00A0$';
  }

  /** Helper: "≈ 15 476 $" */
  function fmtUsd(kzt) {
    const s = toUsdStr(kzt);
    return s ? '≈\u00A0' + s : null;
  }

  return { usdRate, currencyMode, toUsdStr, fmtUsd };
}
