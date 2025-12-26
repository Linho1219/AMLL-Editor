<template>
  <div class="audio-popover-pane">
    <span class="audio-popover-label">
      <i class="pi pi-volume-down audio-popover-icon"></i> 音量
    </span>
    <Slider class="audio-popover-slider" :max="100" :min="0" v-model="volumeInputRef" />
    <InputGroup>
      <InputNumber
        class="monospace audio-popover-input"
        fluid
        :min="0"
        :max="100"
        suffix="%"
        size="small"
        placeholder="100%"
        v-model="volumeInputRef"
      />
      <InputGroupAddon class="audio-popover-addon">
        <Button
          class="audio-popover-reset"
          icon="pi pi-refresh"
          severity="secondary"
          variant="text"
          size="small"
          fluid
          @click="volumeInputRef = 100"
        />
      </InputGroupAddon>
    </InputGroup>

    <span class="audio-popover-label"> <i class="pi pi-forward audio-popover-icon"></i> 速率 </span>
    <Slider
      class="audio-popover-slider from-middle"
      :min="-DOMAIN"
      :max="DOMAIN"
      :step="1"
      v-model="rateSliderRef"
    />
    <InputGroup>
      <InputNumber
        class="monospace audio-popover-input"
        fluid
        :min="MINRATE"
        :max="MAXRATE"
        :step="0.01"
        :minFractionDigits="2"
        size="small"
        placeholder="1.00"
        v-model="rateInputRef"
      />
      <InputGroupAddon class="audio-popover-addon">
        <Button
          class="audio-popover-reset"
          icon="pi pi-refresh"
          severity="secondary"
          variant="text"
          size="small"
          fluid
          @click="rateInputRef = 1"
        />
      </InputGroupAddon>
    </InputGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useStaticStore } from '@states/stores'

import { Button, InputGroup, InputGroupAddon, InputNumber, Slider } from 'primevue'

const audio = useStaticStore().audio
const { volumeRef, playbackRateRef } = audio

const volumeInputRef = ref<number | undefined>(Math.round(volumeRef.value * 100))
const rateInputRef = ref<number | undefined>(parseFloat(playbackRateRef.value.toFixed(2)))

const MAXRATE = 2
const MINRATE = 0.25
const DOMAIN = 100
const SMOOTH = 1.8

const sliderToRate = (x: number) => {
  if (x > 0) return 1 + (MAXRATE - 1) * (x / DOMAIN) ** SMOOTH
  if (x < 0) return 1 - (1 - MINRATE) * (-x / DOMAIN) ** SMOOTH
  return 1
}
const rateToSlider = (r: number) => {
  if (r > 1) return DOMAIN * ((r - 1) / (MAXRATE - 1)) ** (1 / SMOOTH)
  if (r < 1) return -DOMAIN * ((1 - r) / (1 - MINRATE)) ** (1 / SMOOTH)
  return 0
}

watch(volumeRef, (value) => {
  volumeInputRef.value = Math.round(value * 100)
})
watch(volumeInputRef, (value) => {
  if (value === undefined) volumeInputRef.value = 100
  else volumeRef.value = Math.min(Math.max(value / 100, 0), 1)
})

watch(playbackRateRef, (value) => {
  rateInputRef.value = parseFloat(value.toFixed(2))
})
watch(rateInputRef, (value) => {
  if (value === undefined) rateInputRef.value = 1.0
  else playbackRateRef.value = Math.min(Math.max(value, MINRATE), MAXRATE)
})

const rateSliderRef = computed({
  get: () => rateToSlider(playbackRateRef.value),
  set: (v: number) => (playbackRateRef.value = sliderToRate(v)),
})
</script>

<style lang="scss">
.audio-popover-pane {
  display: grid;
  grid-template-columns: auto 10rem 6.5rem;
  align-items: center;
  column-gap: 1.5rem;
  row-gap: 0.5rem;
}
.audio-popover-label {
  font-size: 1.1rem;
}
.audio-popover-icon {
  color: var(--p-navigation-item-icon-focus-color);
  margin: 0 0.4rem;
}
.audio-popover-input .p-inputtext {
  font-size: 1rem !important;
  --p-inputtext-sm-padding-x: 0;
  --p-inputtext-sm-padding-y: 0;
  text-align: center;
}
.audio-popover-slider.from-middle {
  background: linear-gradient(
    90deg,
    var(--p-slider-range-background) 5rem,
    var(--p-slider-track-background) 5rem
  );
  .p-slider-range {
    background: linear-gradient(
      90deg,
      var(--p-slider-track-background) 5rem,
      var(--p-slider-range-background) 5rem
    );
  }
}
</style>
