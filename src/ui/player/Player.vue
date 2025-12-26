<template>
  <Card class="player">
    <template #content>
      <Spectrogram v-if="showSpectrogram" :key="refresher" />
      <div class="player-toolbar">
        <Button
          :icon="`pi ${loading ? 'pi-sync' : 'pi-upload'}`"
          :disabled="loading"
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
          :icon="playingComputed ? 'pi pi-pause' : 'pi pi-play'"
          @click="audioEngine.togglePlay()"
          :disabled="!activatedRef"
          v-tooltip="tipHotkey(playingComputed ? '暂停' : '播放', 'playPauseAudio')"
          ref="playPauseButton"
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
        <Waveform :audio="audioEngine" />
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
import { useDark } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import { audioEngine } from '@core/audio'
import { fileBackend } from '@core/file'
import { useGlobalKeyboard } from '@core/hotkey'

import { ms2str } from '@utils/formatTime'
import { tipHotkey } from '@utils/generateTooltip'

import PopoverPane from './Popover.vue'
import Spectrogram from './Spectrogram.vue'
import Waveform from './Waveform.vue'
import { Button, Card, Popover, useToast } from 'primevue'

const { amendedProgressComputed, lengthComputed, playingComputed, activatedRef } = audioEngine
const playPauseButton = useTemplateRef('playPauseButton')

const toast = useToast()

const isUserAbortError = (e: unknown) => {
  const err = e as Error
  return (
    err.message.includes('The user aborted a request') ||
    err.message.includes('is not allowed by the user agent')
  )
}
async function handleSelectFile() {
  try {
    loading.value = true
    const result = await fileBackend.read(
      'amll-editor-audio',
      [{ description: '所有支持的音频', accept: { 'audio/*': ['.mp3', '.flac', '.wav', '.ncm'] } }],
      'music',
    )
    audioEngine.mount(new File([result.blob], result.filename))
    // loading will be set to false on audio loaded event
  } catch (e) {
    loading.value = false
    const detail = isUserAbortError(e) ? '文件访问被用户或平台拒绝' : String(e)
    toast.add({
      severity: 'error',
      summary: '加载音频文件失败',
      detail: detail,
      life: 3000,
    })
  }
}

const refresher = ref(Symbol())
const refresh = () => (refresher.value = Symbol())
audioEngine.onLoaded(refresh)
onUnmounted(() => audioEngine.offLoaded(refresh))

const loading = ref(false)
audioEngine.onLoadStart(() => (loading.value = true))
audioEngine.onLoaded(() => {
  loading.value = false
  toast.add({
    severity: 'success',
    summary: '成功加载音频',
    detail: audioEngine.filenameComputed.value,
    life: 3000,
  })
})

useGlobalKeyboard('chooseMedia', () => handleSelectFile())
useGlobalKeyboard('playPauseAudio', () => {
  if (activatedRef.value) audioEngine.togglePlay()
  if (playPauseButton.value) ((playPauseButton.value as any).$el as HTMLButtonElement).focus()
})
useGlobalKeyboard('seekBackward', () => {
  audioEngine.seekBy(-5000)
})
useGlobalKeyboard('seekForward', () => {
  audioEngine.seekBy(5000)
})
useGlobalKeyboard('volumeDown', () => {
  audioEngine.volumeRef.value = Math.max(0, audioEngine.volumeRef.value - 0.1)
})
useGlobalKeyboard('volumeUp', () => {
  audioEngine.volumeRef.value = Math.min(1, audioEngine.volumeRef.value + 0.1)
})

const percentageRef = computed(() => {
  if (lengthComputed.value === 0) return 0
  return Math.round((amendedProgressComputed.value / lengthComputed.value) * 100)
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
watch([amendedProgressComputed, lengthComputed], () => drawProgress())

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
  const progressStr = ms2str(amendedProgressComputed.value)
  ctx.fillText(progressStr, 0, primaryOffset * devicePixelRatio)
  // Bottom: percentage and length
  ctx.font = `${secondarySize * devicePixelRatio}rem ${fontFamily.value}`
  ctx.fillStyle = isDark.value
    ? `rgba(255, 255, 255, ${secondaryOpacity})`
    : `rgba(0, 0, 0, ${secondaryOpacity})`
  ctx.textBaseline = 'bottom'
  const percentageStr = `${percentageRef.value}%`
  const lengthStr = ms2str(lengthComputed.value)
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
