<template>
  <div class="spectrogram-container" ref="containerEl" @wheel.prevent="handleWheel">
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

import { generatePalette, getIcyBlueColor } from '@utils/colors'

import SpectrogramTile from './SpectrogramTile.vue'

import { useSpectrogramWorker } from './useSpectrogramWorker'

const TILE_DURATION_S = 5
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192]

const containerEl = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const scrollLeft = ref(0)
// TODO: 从 store 获取
const spectrogramHeight = ref(200)
const zoom = ref(100)
const gain = ref(3.0)
const palette = ref<Uint8Array>(generatePalette(getIcyBlueColor))

useResizeObserver(containerEl, (entries) => {
  const entry = entries[0]
  if (!entry) return
  const { width, height } = entry.contentRect
  containerWidth.value = width
  spectrogramHeight.value = height
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
      height: Math.floor(spectrogramHeight.value),
      tileWidthPx: targetLodWidth,
      paletteId: currentPaletteId,
    })

    const cacheEntry = tileCache.get(cacheId)

    newVisibleTiles.push({
      id: cacheId,
      left: i * tileDisplayWidthPx,
      width: tileDisplayWidthPx,
      height: spectrogramHeight.value,
      canvasWidth: targetLodWidth,
      bitmap: cacheEntry?.bitmap,
    })
  }

  visibleTiles.value = newVisibleTiles
}

watch(
  [scrollLeft, zoom, containerWidth, spectrogramHeight, gain, lastTileTimestamp, audioBufferRef],
  () => {
    updateVisibleTiles()
  },
  { immediate: true },
)

const handleWheel = (e: WheelEvent) => {
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY

  const maxScroll = Math.max(0, totalContentWidth.value - containerWidth.value)
  const newScroll = scrollLeft.value + delta

  scrollLeft.value = Math.max(0, Math.min(newScroll, maxScroll))
}
</script>

<style lang="scss" scoped>
.spectrogram-container {
  width: 100%;
  height: 100%;
  min-height: 12.5rem;
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
</style>
