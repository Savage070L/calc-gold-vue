<template>
  <div class="riders-section">
    <div class="rider-group-label">СМЕРТЬ И ИНВАЛИДНОСТЬ</div>
    <div class="rider-check-row">
      <label class="rider-chk-wrap">
        <input type="checkbox" v-model="local.accidental_death.enabled" class="rider-chk" />
        <span class="rider-chk-box"></span>
      </label>
      <span class="rider-name">Смерть в результате НС <InfoTooltip v-bind="TIP.accidental_death" /></span>
    </div>
    <div class="rider-check-row">
      <label class="rider-chk-wrap">
        <input type="checkbox" v-model="local.disability_accident_lumpsum.enabled" class="rider-chk" />
        <span class="rider-chk-box"></span>
      </label>
      <span class="rider-name">Полная выплата при инвалидности (I, II группы) в результате НС <InfoTooltip v-bind="TIP.disability" /></span>
    </div>

    <div class="rider-group-label">ТРАВМЫ И ГОСПИТАЛИЗАЦИЯ</div>
    <div class="rider-check-row with-select">
      <label class="rider-chk-wrap">
        <input type="checkbox" v-model="local.trauma.enabled" class="rider-chk" />
        <span class="rider-chk-box"></span>
      </label>
      <div class="rider-row-content">
        <span class="rider-name">
          Телесные травмы в результате НС
          <span class="rider-hint">(выберите сумму)</span>
          <InfoTooltip v-bind="TIP.trauma" />
        </span>
        <select v-model.number="local.trauma.sum">
          <option :value="500000">500 000 ₸</option>
          <option :value="1000000">1 000 000 ₸</option>
          <option :value="1500000">1 500 000 ₸</option>
          <option :value="2000000">2 000 000 ₸</option>
        </select>
      </div>
    </div>

    <div class="rider-check-row with-select">
      <label class="rider-chk-wrap">
        <input type="checkbox" v-model="local.hospitalization.enabled" class="rider-chk" />
        <span class="rider-chk-box"></span>
      </label>
      <div class="rider-row-content">
        <span class="rider-name">
          Госпитализация в результате НС
          <span class="rider-hint">(выберите сумму)</span>
          <InfoTooltip v-bind="TIP.hospitalization" />
        </span>
        <select v-model.number="local.hospitalization.sum">
          <option :value="500000">500 000 ₸</option>
          <option :value="1000000">1 000 000 ₸</option>
          <option :value="2000000">2 000 000 ₸</option>
          <option :value="3000000">3 000 000 ₸</option>
          <option :value="5000000">5 000 000 ₸</option>
        </select>
      </div>
    </div>
    <div class="rider-legend">НС — Несчастный случай</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import InfoTooltip from './InfoTooltip.vue';

const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(['update:modelValue']);

const TIP = {
  accidental_death: {
    title: 'Смерть от НС',
    text: 'Дополнительная защита вашего накопительного плана на случай непредвиденных обстоятельств.<br><br>Если вследствие НС (ДТП, травма и т.п.) застрахованный уйдёт из жизни до окончания полиса — семья получит <b>вдвое больше</b>: основную страховую сумму плюс столько же дополнительно.<br><br>Это гарантирует, что ваш финансовый план будет выполнен для близких в полном объёме.',
  },
  disability: {
    title: 'Инвалидность от НС',
    text: 'Защита вашего дохода и накоплений при наступлении инвалидности I или II группы вследствие НС.<br><br>Единовременно выплачивается <b>100% страховой суммы</b> — это позволяет не прерывать финансовый план даже при значительном снижении трудоспособности.<br><br>Полис при этом продолжает действовать в полном объёме.',
  },
  trauma: {
    title: 'Телесные травмы от НС',
    text: 'Финансовая поддержка при лечении травм, полученных в результате НС: переломы, ожоги, вывихи, сотрясение мозга и другие повреждения.<br><br>Выплата рассчитывается по таблице в зависимости от характера травмы. Это позволяет <b>покрыть расходы на лечение, не затрагивая свои накопления</b>.<br><br>Чем выше выбранная страховая сумма — тем больше компенсация при каждой конкретной травме.',
  },
  hospitalization: {
    title: 'Госпитализация от НС',
    text: 'Компенсация расходов при экстренной госпитализации вследствие НС.<br><br>Покрывает:<br>• Платные медицинские услуги и лечение<br>• Потерю дохода в период нетрудоспособности<br>• Расходы на реабилитацию<br><br>Благодаря этому покрытию вы <b>не будете вынуждены тратить накопления</b> на непредвиденные медицинские расходы.',
  },
};

const local = ref({
  accidental_death:            { enabled: false, ...props.modelValue.accidental_death },
  disability_accident_lumpsum: { enabled: false, ...props.modelValue.disability_accident_lumpsum },
  trauma:                      { enabled: false, sum: 1_000_000, ...props.modelValue.trauma },
  hospitalization:             { enabled: false, sum: 1_000_000, ...props.modelValue.hospitalization },
});
watch(local, (val) => emit('update:modelValue', { ...val }), { deep: true });
</script>

<style scoped>
.rider-group-label {
  font-size: 15px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--accent, #47903C);
  margin: 10px 0 5px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color, rgba(66,165,245,0.2));
}

.rider-check-row {
  display: grid; grid-template-columns: 22px 1fr;
  gap: 12px; align-items: center;
  padding: 8px 0;
  min-height: 52px;
}
.rider-check-row.with-select { align-items: center; }

.rider-chk-wrap {
  position: relative; display: inline-flex; align-items: center; cursor: pointer; flex-shrink: 0;
}
.rider-chk {
  position: absolute; opacity: 0; width: 0; height: 0;
}
.rider-chk-box {
  display: block; width: 20px; height: 20px;
  border-radius: 5px;
  border: none;
  background: rgba(255,255,255,0.15);
  transition: all 0.2s ease;
  position: relative;
}
.rider-chk:checked ~ .rider-chk-box {
  background: linear-gradient(135deg, #BBD034, #47903C);
}
.rider-chk:checked ~ .rider-chk-box::after {
  content: '✓';
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px; color: white; font-weight: 800;
}

.rider-name {
  font-size: 17px; color: var(--text-main, #E8F4FD); font-weight: 500;
  line-height: 1.3; flex: 1; min-width: 0;
}
.rider-hint {
  font-size: 13px; color: var(--text-light, #7FB3D3);
  font-weight: 400; display: inline; margin-left: 6px;
  white-space: nowrap;
}

/* Name (flex:1) fills space — select stays pinned right with no floating gap */
.rider-row-content {
  display: flex; align-items: center;
  gap: 16px; flex-wrap: nowrap;
  min-width: 0;
}

.rider-row-content select {
  flex-shrink: 0; width: 160px; padding: 8px 12px;
  border: 1px solid var(--border-color, rgba(66,165,245,0.2));
  border-radius: 8px; font-size: 16px;
  background: var(--surface, #1E3A5A);
  box-shadow: var(--shadow-in);
  color: var(--text-main, #E8F4FD);
  outline: none;
  font-family: 'SF Mono', 'Menlo', monospace; font-weight: 600;
  cursor: pointer;
}
.rider-row-content select:focus { border-color: var(--accent, #47903C); }

/* Info button override for dark background */
.rider-name :deep(.info-btn) {
  border-color: rgba(255,255,255,0.5);
  color: rgba(255,255,255,0.6);
}
.rider-name :deep(.info-btn:hover),
.rider-name :deep(.info-btn.active) {
  background: rgba(255,255,255,0.9);
  border-color: white;
  color: #1565C0;
}
.rider-legend {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color, rgba(66,165,245,0.2));
  font-size: 14px;
  font-weight: 600;
  color: var(--text-light, #7FB3D3);
}

@media (max-width: 720px) {
  .rider-group-label {
    font-size: 13px;
  }

  .rider-name {
    font-size: 16px;
    line-height: 1.25;
  }

  .rider-hint {
    display: inline;
    margin-left: 0;
    font-size: 12px;
    white-space: nowrap;
  }

  .rider-row-content { flex-wrap: wrap; gap: 8px; }
  .rider-row-content select { width: 100%; }
}
</style>
