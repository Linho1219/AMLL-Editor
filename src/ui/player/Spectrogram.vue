<template>
  <div
    class="spectrogram-container"
    ref="containerEl"
    @wheel.prevent="handleWheel"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :style="{ height: displayHeight + 'px' }"
  >
    <div class="resize-handle" v-bind="resizeHandleProps">
      <div class="handle-bar"></div>
    </div>

    <div
      class="spectrogram-content"
      :style="{
        width: `${ctx.totalContentWidth.value}px`,
        transform: `translate3d(${-Math.round(ctx.scrollLeft.value)}px, 0, 0)`,
      }"
    >
      <SpectrogramTile
        v-for="{ id: key, left, width, height, canvasHeight, canvasWidth, bitmap } in visibleTiles"
        :key
        :left
        :width
        :height
        :canvas-height
        :canvas-width
        :bitmap
      />
    </div>

    <EmptyTip
      v-if="!audioEngine.audioBuffer"
      icon="pi pi-volume-off"
      title="没有音频数据"
      tip="加载音频文件后将渲染频谱图"
      compact
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import { audioEngine } from '@core/audio/index.ts'
import { useSpectrogramProvider } from '@core/spectrogram/SpectrogramContext'
import { generatePalette, getIcyBlueColor } from '@core/spectrogram/colors'
import { useSpectrogramInteraction } from '@core/spectrogram/useSpectrogramInteraction'
import { useSpectrogramResize } from '@core/spectrogram/useSpectrogramResize'
import { useSpectrogramWorker } from '@core/spectrogram/useSpectrogramWorker'

import SpectrogramTile from './SpectrogramTile.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'

const TILE_DURATION_S = 5
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192]

const containerEl = ref<HTMLElement | null>(null)
// TODO: 从 store 获取
const gain = ref(3.0)
const palette = ref<Uint8Array>(generatePalette(getIcyBlueColor))

const audioBufferRef = computed(() => audioEngine.audioBuffer)
const ctx = useSpectrogramProvider({ audioBuffer: audioBufferRef })

const { handleWheel, handleMouseMove, handleMouseLeave, handleMouseEnter } =
  useSpectrogramInteraction({ ctx, containerEl })

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

const { requestTileIfNeeded, tileCache, lastTileTimestamp } = useSpectrogramWorker(
  audioBufferRef,
  palette,
)

interface VisibleTile {
  id: string
  left: number
  width: number
  height: number
  canvasHeight: number
  canvasWidth: number
  bitmap?: ImageBitmap
}

const visibleTiles = shallowRef<VisibleTile[]>([])

const updateVisibleTiles = () => {
  const duration = ctx.duration.value
  if (duration === 0 || ctx.containerWidth.value === 0) return

  const pixelsPerSecond = ctx.zoom.value
  const tileDisplayWidthPx = TILE_DURATION_S * pixelsPerSecond
  const totalTiles = Math.ceil(duration / TILE_DURATION_S)

  const viewStart = ctx.scrollLeft.value
  const viewEnd = viewStart + ctx.containerWidth.value

  const firstVisibleIndex = Math.floor(viewStart / tileDisplayWidthPx)
  const lastVisibleIndex = Math.ceil(viewEnd / tileDisplayWidthPx)

  const newVisibleTiles: VisibleTile[] = []

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
    ctx.scrollLeft,
    ctx.zoom,
    ctx.containerWidth,
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
