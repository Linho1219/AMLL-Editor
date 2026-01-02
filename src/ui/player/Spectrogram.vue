<template>
  <div
    class="spectrogram-container"
    ref="containerEl"
    @wheel.prevent="handleWheel"
    :style="{ height: displayHeight + 'px' }"
  >
    <div class="resize-handle" v-bind="resizeHandleProps">
      <div class="handle-bar"></div>
    </div>

    <div
      class="spectrogram-content"
      :style="{
        width: `${totalContentWidth}px`,
        transform: `translate3d(${-scrollLeft}px, 0, 0)`,
      }"
    >
      <SpectrogramTile
        v-for="tile in visibleTiles"
        :key="tile.id"
        :left="tile.left"
        :width="tile.width"
        :height="tile.height"
        :canvas-height="tile.canvasHeight"
        :canvas-width="tile.canvasWidth"
        :bitmap="tile.bitmap"
      />
    </div>

    <div v-if="!audioEngine.audioBuffer" class="empty-state">
      请先加载一个音频文件来渲染频谱图哦
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core'
import { computed, ref, shallowRef, watch } from 'vue'

import { audioEngine } from '@core/audio/index.ts'
import { generatePalette, getIcyBlueColor } from '@core/spectrogram/colors'
import { useSpectrogramResize } from '@core/spectrogram/useSpectrogramResize'
import { useSpectrogramWorker } from '@core/spectrogram/useSpectrogramWorker'

import SpectrogramTile from './SpectrogramTile.vue'

const TILE_DURATION_S = 5
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192]
const MIN_ZOOM = 10
const MAX_ZOOM = 1000
const ZOOM_SENSITIVITY = 1.15

const containerEl = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const scrollLeft = ref(0)
// TODO: 从 store 获取
const zoom = ref(100)
const gain = ref(3.0)
const palette = ref<Uint8Array>(generatePalette(getIcyBlueColor))

const {
  height: displayHeight,
  isResizing,
  resizeHandleProps,
} = useSpectrogramResize({
  initialHeight: 240,
  minHeight: 120,
  maxHeight: 600,
})

const renderHeight = ref(displayHeight.value)

watch(isResizing, (resizing) => {
  if (!resizing) {
    renderHeight.value = displayHeight.value
  }
})

useResizeObserver(containerEl, (entries) => {
  const entry = entries[0]
  if (!entry) return
  const { width } = entry.contentRect
  containerWidth.value = width
})

const audioBufferRef = computed(() => audioEngine.audioBuffer)
const { requestTileIfNeeded, tileCache, lastTileTimestamp } = useSpectrogramWorker(
  audioBufferRef,
  palette,
)

const visibleTiles = shallowRef<
  Array<{
    id: string
    left: number
    width: number
    height: number
    canvasHeight: number
    canvasWidth: number
    bitmap?: ImageBitmap
  }>
>([])

const totalContentWidth = computed(() => {
  const duration = audioEngine.audioBuffer?.duration || 0
  return duration * zoom.value
})

const updateVisibleTiles = () => {
  const buffer = audioEngine.audioBuffer
  if (!buffer || containerWidth.value === 0) return

  const pixelsPerSecond = zoom.value
  const tileDisplayWidthPx = TILE_DURATION_S * pixelsPerSecond
  const totalTiles = Math.ceil(buffer.duration / TILE_DURATION_S)

  const viewStart = scrollLeft.value
  const viewEnd = viewStart + containerWidth.value

  const firstVisibleIndex = Math.floor(viewStart / tileDisplayWidthPx)
  const lastVisibleIndex = Math.ceil(viewEnd / tileDisplayWidthPx)

  const newVisibleTiles = []

  const renderH = renderHeight.value

  for (let i = firstVisibleIndex - 2; i <= lastVisibleIndex + 2; i++) {
    if (i < 0 || i >= totalTiles) continue

    const targetLodWidth =
      LOD_WIDTHS.find((w) => w >= tileDisplayWidthPx) ?? LOD_WIDTHS[LOD_WIDTHS.length - 1]!

    const cacheId = `tile-${i}`
    // TODO: 从 store 获取
    const currentPaletteId = 'default'

    requestTileIfNeeded({
      tileIndex: i,
      startTime: i * TILE_DURATION_S,
      endTime: i * TILE_DURATION_S + TILE_DURATION_S,
      gain: gain.value,
      height: renderH,
      tileWidthPx: targetLodWidth,
      paletteId: currentPaletteId,
    })

    const cacheEntry = tileCache.get(cacheId)

    newVisibleTiles.push({
      id: cacheId,
      left: i * tileDisplayWidthPx,
      width: tileDisplayWidthPx,
      height: displayHeight.value,
      canvasHeight: renderH,
      canvasWidth: targetLodWidth,
      bitmap: cacheEntry?.bitmap,
    })
  }

  visibleTiles.value = newVisibleTiles
}

watch(
  [
    scrollLeft,
    zoom,
    containerWidth,
    displayHeight,
    renderHeight,
    gain,
    lastTileTimestamp,
    audioBufferRef,
  ],
  () => {
    updateVisibleTiles()
  },
  { immediate: true },
)

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    if (!containerEl.value) return
    const rect = containerEl.value.getBoundingClientRect()
    const mouseX = e.clientX - rect.left

    const timeAtCursor = (scrollLeft.value + mouseX) / zoom.value

    let newZoom = zoom.value
    if (e.deltaY < 0) {
      newZoom *= ZOOM_SENSITIVITY
    } else {
      newZoom /= ZOOM_SENSITIVITY
    }

    newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM))

    if (newZoom !== zoom.value) {
      const newScrollLeft = timeAtCursor * newZoom - mouseX

      zoom.value = newZoom
      const maxScroll = Math.max(
        0,
        (audioEngine.audioBuffer?.duration || 0) * newZoom - containerWidth.value,
      )
      scrollLeft.value = Math.max(0, Math.min(newScrollLeft, maxScroll))
    }
  } else {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY

    const maxScroll = Math.max(0, totalContentWidth.value - containerWidth.value)
    const newScroll = scrollLeft.value + delta

    scrollLeft.value = Math.max(0, Math.min(newScroll, maxScroll))
  }
}
</script>

<style lang="scss" scoped>
.spectrogram-container {
  width: 100%;
  flex: none;
  min-height: 120px;
  position: relative;
  overflow: hidden;
}

.spectrogram-content {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #c2c2c2;
}

.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 18px;
  z-index: 100;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover,
  &:active {
    background-color: rgba(255, 255, 255, 0.1);

    .handle-bar {
      background-color: var(--p-primary-color);
    }
  }
  :root:has(&:active) * {
    cursor: ns-resize;
  }

  .handle-bar {
    width: 40px;
    height: 3px;
    border-radius: 2px;
    background-color: rgba(255, 255, 255, 0.2);
    transition: background-color 0.2s;
  }
}
</style>
