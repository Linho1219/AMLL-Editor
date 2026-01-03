import { type Ref, shallowRef, watch } from 'vue'

import { useSpectrogramWorker } from '@core/spectrogram/useSpectrogramWorker'

import type { SpectrogramContext } from './SpectrogramContext'

const TILE_DURATION_S = 5
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192]

export interface VisibleTile {
  id: string
  left: number
  width: number
  height: number
  canvasHeight: number
  canvasWidth: number
  bitmap?: ImageBitmap
}

interface UseSpectrogramTilesOptions {
  ctx: SpectrogramContext
  audioBuffer: Ref<AudioBuffer | null>
}

export function useSpectrogramTiles({ ctx, audioBuffer }: UseSpectrogramTilesOptions) {
  const { requestTileIfNeeded, tileCache, lastTileTimestamp } = useSpectrogramWorker(
    audioBuffer,
    ctx.palette,
  )

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

    const renderH = ctx.renderHeight.value
    const displayH = ctx.displayHeight.value
    const currentGain = ctx.gain.value
    const currentPaletteId = ctx.paletteId.value

    for (let i = firstVisibleIndex - 2; i <= lastVisibleIndex + 2; i++) {
      if (i < 0 || i >= totalTiles) continue

      const targetLodWidth =
        LOD_WIDTHS.find((w) => w >= tileDisplayWidthPx) ?? LOD_WIDTHS[LOD_WIDTHS.length - 1]!

      const cacheId = `tile-${i}`

      requestTileIfNeeded({
        tileIndex: i,
        startTime: i * TILE_DURATION_S,
        endTime: i * TILE_DURATION_S + TILE_DURATION_S,
        gain: currentGain,
        height: renderH,
        tileWidthPx: targetLodWidth,
        paletteId: currentPaletteId,
      })

      const cacheEntry = tileCache.get(cacheId)

      newVisibleTiles.push({
        id: cacheId,
        left: i * tileDisplayWidthPx,
        width: tileDisplayWidthPx,
        height: displayH,
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
      ctx.gain,
      ctx.palette,
      ctx.paletteId,
      ctx.displayHeight,
      ctx.renderHeight,
      lastTileTimestamp,
      audioBuffer,
    ],
    () => {
      updateVisibleTiles()
    },
    { immediate: true },
  )

  return {
    visibleTiles,
  }
}
