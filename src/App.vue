<template>
  <div id="app">
    <header class="app-header">
      <div class="header-left">
        <div class="logo-pill">
          <span class="logo-icon">🛡</span>
          <span class="logo-text">Pro Life</span>
        </div>
      </div>
      <div class="header-center">
        <h1 class="app-title">РАСЧЁТ СТРАХОВОЙ ПРЕМИИ</h1>
      </div>
      <div class="header-right">
        <span class="header-badge">НСЖ</span>
      </div>
    </header>

    <main class="app-main">
      <InsuranceCalculator />
    </main>
  </div>
</template>

<script setup>
import InsuranceCalculator from './components/InsuranceCalculator.vue';
</script>

<style>
:root {
  /* Blue / Green palette */
  --primary:         #1976D2;
  --primary-dark:    #1565C0;
  --primary-light:   #42A5F5;
  --primary-pale:    #E3F2FD;
  --secondary:       #2E7D32;
  --secondary-light: #43A047;
  --secondary-pale:  #E8F5E9;

  /* Surfaces */
  --bg:          #EEF2F7;
  --surface:     #F5F8FF;
  --panel-dark:  #0B1F35;
  --panel-dark-2:#152D4A;
  --panel-light: #F5F8FF;

  /* Text */
  --text-main:   #1A2E3F;
  --text-light:  #5A7A96;
  --accent:      #1976D2;
  --accent-hover:#42A5F5;

  /* Borders */
  --border-color: rgba(25,118,210,0.14);

  /* Neumorphic shadows (blue-tinted) */
  --shadow-out:    6px 6px 14px rgba(150,175,210,0.4), -6px -6px 14px rgba(255,255,255,0.92);
  --shadow-out-sm: 3px 3px 7px  rgba(150,175,210,0.36), -3px -3px 7px  rgba(255,255,255,0.88);
  --shadow-in:     inset 3px 3px 7px rgba(150,175,210,0.32), inset -3px -3px 7px rgba(255,255,255,0.85);
  --shadow-btn:    4px 4px 9px  rgba(150,175,210,0.38), -4px -4px 9px  rgba(255,255,255,0.88);
  --shadow-btn-press: inset 2px 2px 5px rgba(150,175,210,0.3), inset -2px -2px 5px rgba(255,255,255,0.75);

  --radius: 20px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

/* ── Global range slider ─── */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 5px;
  border-radius: 5px;
  outline: none;
  cursor: pointer;
  width: 100%;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  box-shadow: 0 2px 8px rgba(25,118,210,0.45), 0 0 0 2px rgba(66,165,245,0.3);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 10px rgba(25,118,210,0.55), 0 0 0 3px rgba(66,165,245,0.4);
}
input[type="range"]::-moz-range-thumb {
  width: 22px; height: 22px;
  border: none; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  box-shadow: 0 2px 8px rgba(25,118,210,0.45);
  cursor: pointer;
}
</style>

<style scoped>
.app-header {
  background: var(--panel-dark);
  padding: 13px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 20px rgba(0,0,0,0.45);
  position: relative;
}
.app-header::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(to right, transparent 0%, var(--primary) 25%, var(--primary-light) 50%, var(--secondary-light) 75%, transparent 100%);
  opacity: 0.7;
}

.logo-pill {
  display: flex; align-items: center; gap: 7px;
  background: var(--panel-dark-2);
  border: 1px solid rgba(66,165,245,0.2);
  border-radius: 14px;
  padding: 7px 16px;
}
.logo-icon { font-size: 16px; }
.logo-text {
  font-size: 14px; font-weight: 700;
  background: linear-gradient(135deg, #90CAF9, #42A5F5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.03em;
}

.header-center { flex: 1; text-align: center; }
.app-title {
  font-size: 20px; font-weight: 800; letter-spacing: 0.06em;
  background: linear-gradient(135deg, #90CAF9 0%, #42A5F5 40%, #1976D2 70%, #43A047 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-wrap: balance;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-badge {
  background: linear-gradient(135deg, var(--primary-light), var(--primary));
  color: white;
  font-size: 12px; font-weight: 800;
  padding: 5px 14px;
  border-radius: 20px;
  letter-spacing: 0.1em;
  flex-shrink: 0;
}

.app-main { min-height: calc(100vh - 64px); background: var(--bg); }

@media (max-width: 720px) {
  .app-header { padding: 10px 14px; flex-wrap: wrap; gap: 6px; }
  .app-title { font-size: 14px; }
  .header-center { order: 3; flex: 100%; }
  .logo-text { font-size: 13px; }
}
</style>
