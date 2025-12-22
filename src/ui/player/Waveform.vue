<template>
  <div
    class="waveform"
    ref="container"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseenter="handleMounseEnter"
    @mouseleave="handleContainerMouseMove"
  >
    <div class="wavesurfer-container" ref="wavesurferEl" :class="{ active: isMouseDown }"></div>
    <div
      class="waveform-interact"
      :style="{ transform: `translateX(${cursorLeftPxRef}px)` }"
      :class="{ active: isMouseDown }"
    >
      <div class="cursor"></div>
      <div class="time" ref="timeEl" :class="{ rev: timeAlignRev }">{{ displayCursorTimeRef }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStaticStore } from '@states/stores'
import { ms2str } from '@utils/formatTime'
import { useCssVar } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import WaveSurfer from 'wavesurfer.js'
const { audio } = useStaticStore()

const containerEl = useTemplateRef('container')
const timeEl = useTemplateRef('timeEl')
const timeAlignRev = ref(false)
const isMouseDown = ref(false)
let playingWhenMouseDown = false
const cursorTimeRef = ref(0)
const displayCursorTimeRef = computed(() => ms2str(cursorTimeRef.value))
const cursorLeftPxRef = ref(0)
const hoverCursorShown = ref(false)
let containRect: DOMRect | null = null
let timeRect: DOMRect | null = null

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
function handleMounseEnter() {
  if (!containerEl.value || !timeEl.value) return
  containRect = containerEl.value.getBoundingClientRect()
  timeRect = timeEl.value.getBoundingClientRect()
}
function handleContainerMouseMove(event: MouseEvent) {
  if (isMouseDown.value) return
  handleMouseMove(event)
}
function handleDocumentMouseMove(event: MouseEvent) {
  if (!isMouseDown.value) return
  handleMouseMove(event)
}
function handleMouseMove(event: MouseEvent) {
  if (!containerEl.value || !timeEl.value) return
  if (!containRect || !timeRect) return
  const x = clamp(event.clientX - containRect.left, 0, containRect.width)
  const percentage = x / containRect.width
  const time = percentage * audio.lengthComputed.value
  cursorTimeRef.value = time
  cursorLeftPxRef.value = x
  timeAlignRev.value = x + timeRect.width > containRect.width
  hoverCursorShown.value = true
  return time
}
function handleMouseDown() {
  isMouseDown.value = true
  playingWhenMouseDown = audio.playingComputed.value
  if (playingWhenMouseDown) audio.pause()
  document.addEventListener('mousemove', handleDocumentMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}
function handleMouseUp() {
  if (!isMouseDown.value) return
  isMouseDown.value = false
  audio.seek(cursorTimeRef.value)
  if (playingWhenMouseDown) audio.play()
  document.removeEventListener('mousemove', handleDocumentMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

const wavesurferEl = useTemplateRef('wavesurferEl')
const primaryColor = useCssVar('--p-primary-color')
let wsInstance: WaveSurfer | null = null
const createWs = () => {
  if (!wavesurferEl.value || !containerEl.value) return
  wsInstance = WaveSurfer.create({
    media: audio.audioEl,
    container: wavesurferEl.value,
    height: containerEl.value.clientHeight,
    hideScrollbar: true,
    waveColor: primaryColor.value,
    progressColor: primaryColor.value,
    cursorWidth: 0,
    barHeight: 0.8,
    interact: false,
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
  position: relative;
  --hover-cursor-color: color-mix(
    in srgb,
    var(--p-primary-color),
    var(--p-button-text-plain-color) 70%
  );
}
.waveform-interact {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 2;
  .cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    box-shadow: var(--hover-cursor-color) 0 0 0 0.5px;
  }
  &.active .cursor {
    box-shadow: var(--hover-cursor-color) 0 0 0 1px;
  }
  .time {
    position: absolute;
    top: 0;
    bottom: 0;
    font-family: var(--font-monospace);
    display: flex;
    align-items: center;
    line-height: 1;
    padding: 0 0.75rem;
    color: var(--hover-cursor-color);
    &.rev {
      right: 0;
    }
  }
  &.active .time {
    font-weight: bold;
  }
  opacity: 0;
  transition: opacity 0.2s;
  .waveform:hover &,
  &.active {
    opacity: 1;
  }
}
.wavesurfer-container {
  width: 100%;
  height: 100%;
  ::part(canvases) {
    opacity: 0.3;
  }
  ::part(wrapper) {
    overflow: hidden;
  }
  ::part(progress) {
    background-color: color-mix(in srgb, var(--p-primary-color), transparent 70%);
    opacity: 0.5;
  }
  ::part(cursor) {
    box-shadow: var(--p-primary-color) 0 0 0 1px;
  }
  &.active ::part(cursor) {
    opacity: 0.6;
  }
}
</style>
