<template>
  <div class="waveform" ref="waveformEl"></div>
</template>

<script setup lang="ts">
import { useStaticStore } from '@states/stores'
import { ms2str } from '@utils/formatTime'
import { useCssVar } from '@vueuse/core'
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.esm.js'
const { audio } = useStaticStore()
const waveformEl = useTemplateRef('waveformEl')
const primaryColor = useCssVar('--p-primary-color')
let wsInstance: WaveSurfer | null = null

const createWs = () => {
  if (!waveformEl.value) return
  wsInstance = WaveSurfer.create({
    media: audio.audioEl,
    container: waveformEl.value,
    height: waveformEl.value.clientHeight,
    hideScrollbar: true,
    waveColor: primaryColor.value,
    progressColor: primaryColor.value,
    cursorWidth: 0,
    barHeight: 0.8,
    plugins: [
      HoverPlugin.create({
        formatTimeCallback: (v) => ms2str(v * 1000),
      }),
    ],
  })
}

onMounted(createWs)
const refresher = () => {
  wsInstance?.destroy()
  createWs()
}
audio.onLoaded(refresher)
onBeforeUnmount(() => {
  wsInstance?.destroy()
  wsInstance = null
  audio.offLoaded(refresher)
})
</script>

<style lang="scss">
.waveform {
  flex: 1;
  background-color: var(--p-button-secondary-background);
  border-radius: var(--p-border-radius-md);
  overflow: hidden;
  cursor: text;
  ::part(canvases) {
    opacity: 0.3;
  }
  ::part(wrapper) {
    overflow: hidden;
  }
  ::part(progress) {
    background-color: color-mix(in srgb, var(--p-primary-color), transparent 70%);
    opacity: 0.6;
  }
  ::part(cursor) {
    // display: none;
    box-shadow: var(--p-primary-color) 0 0 0 1px;
  }
  ::part(hover) {
    display: flex;
    align-items: center;
    @media (prefers-reduced-motion: reduce) {
      transition: none !important;
    }
  }
  ::part(hover-label) {
    padding: 0 0.5rem;
    font-size: 1rem;
    transition: none;
    font-family: var(--font-monospace);
    text-shadow: 0 0 5px var(--p-form-field-background);
  }
}
</style>
