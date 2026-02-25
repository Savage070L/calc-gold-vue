<template>
  <div id="app">
    <header class="app-header">
      <div class="header-inner">
        <h1 class="app-title">Pro Life Gold</h1>
        <span class="app-subtitle">Калькулятор накопительного страхования жизни</span>
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
/* Глобальные стили */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #f1f5f9;
  color: #111827;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  line-height: 1.5;
}
</style>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #4f46e5 100%);
  color: #fff;
  padding: 1.25rem 1.5rem;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.app-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 0.85rem;
  opacity: 0.75;
}

.app-main {
  min-height: calc(100vh - 70px);
  padding: 1.5rem 0;
}
</style>
