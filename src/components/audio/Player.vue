<template>
  <Card class="player">
    <template #content>
      <Spectrogram v-if="showSpectrogram" :height="200" />
      <div class="player-toolbar">
        <Button
          icon="pi pi-upload"
          severity="secondary"
          @click="() => handleSelectFile()"
          v-tooltip="tipHotkey('选择音频文件', 'chooseMedia')"
        />
        <Button
          icon="pi pi-sliders-v"
          severity="secondary"
          @click="tooglePopover"
          v-tooltip="'播放选项'"
        />
        <Popover ref="popover"> <PopoverPane /> </Popover>
        <Button
          :icon="playingRef ? 'pi pi-pause' : 'pi pi-play'"
          @click="audio.togglePlay()"
          :disabled="!activatedRef"
          v-tooltip="tipHotkey(playingRef ? '暂停' : '播放', 'playPauseAudio')"
        />
        <div class="audio-progress-canvas-wrapper" ref="audioProgressWrapperEl">
          <canvas
            v-show="canvasReady"
            class="audio-progress-canvas"
            ref="audioProgressCanvas"
          ></canvas>
          <div
            :style="{ visibility: canvasReady ? 'hidden' : 'visible' }"
            class="audio-progress-ghost"
          >
            <div class="audio-progress-primary" :style="{ fontSize: primarySize + 'rem' }">
              00:00.000
            </div>
            <div
              class="audio-progress-secondary"
              :style="{ fontSize: secondarySize + 'rem', opacity: secondaryOpacity }"
            >
              <span class="audio-percentage-text">0%</span>
              <span class="audio-length-text">00:00.000</span>
            </div>
          </div>
        </div>
        <Waveform :audio="audio" :key="refresher" />
        <Button
          icon="pi pi-chart-bar"
          :severity="showSpectrogram ? 'primary' : 'secondary'"
          @click="showSpectrogram = !showSpectrogram"
          v-tooltip="showSpectrogram ? '隐藏频谱图' : '显示频谱图'"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { useDark, useFileDialog } from '@vueuse/core'
import { Button, Card, Popover } from 'primevue'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import PopoverPane from './Popover.vue'
import { ms2str } from '@/utils/timeModel'
import Waveform from './Waveform.vue'
import { useStaticStore } from '@/stores/static'
import { useGlobalKeyboard } from '@/utils/hotkey'
import { tipHotkey } from '@/utils/tooltip'
import Spectrogram from './spectrogram/Spectrogram.vue'

const audio = useStaticStore().audio
const {
  progressComputed: progressRef,
  amendmentRef,
  lengthComputed: lengthRef,
  playingComputed: playingRef,
  activatedRef,
} = audio

const { open: handleSelectFile, onChange: onFileChange } = useFileDialog({
  accept: 'audio/*,.ncm',
  multiple: false,
})
useGlobalKeyboard('chooseMedia', () => handleSelectFile())
useGlobalKeyboard('playPauseAudio', () => {
  if (activatedRef.value) audio.togglePlay()
})
useGlobalKeyboard('seekBackward', () => {
  audio.seekBy(-5000)
})
useGlobalKeyboard('seekForward', () => {
  audio.seekBy(5000)
})
useGlobalKeyboard('volumeDown', () => {
  audio.volumeRef.value = Math.max(0, audio.volumeRef.value - 0.1)
})
useGlobalKeyboard('volumeUp', () => {
  audio.volumeRef.value = Math.min(1, audio.volumeRef.value + 0.1)
})

const refresher = ref(Symbol())
onFileChange((files) => {
  const file = files?.[0]
  if (!file) return
  if (file.name.endsWith('.ncm')) audio.mountNcm(file)
  else audio.mount(file)
})
audio.audioEl.onloadeddata = () => {
  nextTick(() => {
    refresher.value = Symbol()
  })
}

const displayProgress = computed(() => progressRef.value - amendmentRef.value)
const percentageRef = computed(() => {
  if (lengthRef.value === 0) return 0
  return Math.round((displayProgress.value / lengthRef.value) * 100)
})

const popover = useTemplateRef('popover')
const tooglePopover = (e: MouseEvent) => popover.value?.toggle(e)

const showSpectrogram = ref(false)

const canvasReady = ref(false)
const audioProgressWrapperEl = useTemplateRef('audioProgressWrapperEl')
const audioProgressCanvas = useTemplateRef('audioProgressCanvas')
const fontFamily = ref('')

let revokeListeners: (() => void) | null = null
onMounted(async () => {
  await document.fonts.ready
  if (!audioProgressWrapperEl.value || !audioProgressCanvas.value) return
  fontFamily.value = getComputedStyle(audioProgressWrapperEl.value).fontFamily
  canvasReady.value = true
  nextTick(() => drawProgress())

  window.addEventListener('resize', drawProgress)
  const mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
  mq.addEventListener('change', drawProgress)
  revokeListeners = () => {
    window.removeEventListener('resize', drawProgress)
    mq.removeEventListener('change', drawProgress)
  }
})
onUnmounted(() => revokeListeners?.())
watch([displayProgress, lengthRef], () => drawProgress())

const isDark = useDark()
// Where sizes from:
// Primary:   00:00.000      <- 9 ch
// Secondary: 100% 00:00.000 <- 13 ch + space (use 0.6ch)
// So to align, it should be: 9 x primarySize == 13.6 x secondarySize
// => primarySize / 13.6 == secondarySize / 9 == fontSizeUnit
// => primarySize = fontSizeUnit * 13.6
//    secondarySize = fontSizeUnit * 9
const fontSizeUnit = 0.085
const primarySize = fontSizeUnit * 13.6
const secondarySize = fontSizeUnit * 9

const primaryOffset = 1.5
const secondaryOffset = 0.8
const secondaryOpacity = 0.7

let cachedDPR = -1
const drawProgress = () => {
  if (!canvasReady.value || !audioProgressCanvas.value) return
  if (cachedDPR !== devicePixelRatio) {
    // Recalculate canvas size
    if (!audioProgressWrapperEl.value) return
    const width = audioProgressWrapperEl.value.clientWidth
    const height = audioProgressWrapperEl.value.clientHeight
    audioProgressCanvas.value.width = Math.ceil(width * devicePixelRatio)
    audioProgressCanvas.value.height = Math.ceil(height * devicePixelRatio)
    audioProgressCanvas.value.style.width = `${width}px`
    audioProgressCanvas.value.style.height = `${height}px`
    cachedDPR = devicePixelRatio
  }
  const ctx = audioProgressCanvas.value.getContext('2d')
  if (!ctx) return
  const width = audioProgressCanvas.value.clientWidth * devicePixelRatio
  const height = audioProgressCanvas.value.clientHeight * devicePixelRatio
  ctx.clearRect(0, 0, width, height)
  // Top: progress 00:00.000
  ctx.font = `${primarySize * devicePixelRatio}rem ${fontFamily.value}`
  ctx.fillStyle = isDark.value ? 'white' : 'black'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const progressStr = ms2str(displayProgress.value)
  ctx.fillText(progressStr, 0, primaryOffset * devicePixelRatio)
  // Bottom: percentage and length
  ctx.font = `${secondarySize * devicePixelRatio}rem ${fontFamily.value}`
  ctx.fillStyle = isDark.value
    ? `rgba(255, 255, 255, ${secondaryOpacity})`
    : `rgba(0, 0, 0, ${secondaryOpacity})`
  ctx.textBaseline = 'bottom'
  const percentageStr = `${percentageRef.value}%`
  const lengthStr = ms2str(lengthRef.value)
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText(percentageStr, 0, height + secondaryOffset * devicePixelRatio)
  ctx.textAlign = 'right'
  ctx.fillText(lengthStr, width, height + secondaryOffset * devicePixelRatio)
}
</script>

<style lang="scss">
.player {
  border: 1px solid color-mix(in srgb, var(--p-zinc-600), transparent 85%);
  overflow: hidden;
  margin: 0 0.5rem;
  .p-card-body {
    padding: 0;
  }
  .player-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
  }
}
.audio-progress-canvas-wrapper {
  margin: auto 0.3rem;
  height: 31px;
  display: flex;
  font-family: var(--font-monospace);
  position: relative;
}
.audio-progress-canvas {
  position: absolute;
  top: 0;
  left: 0;
}
.audio-progress-ghost {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  text-align: center;
  line-height: 1;
}
.audio-progress-secondary {
  display: flex;
  width: 13.6ch;
  justify-content: space-between;
}
</style>
