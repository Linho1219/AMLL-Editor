import { LRUCache } from './lruCache'
import { onBeforeUnmount, onMounted, readonly, ref, shallowRef, watch, type ShallowRef } from 'vue'
import SpectrogramWorker from './spectrogram.worker.ts?worker'

const MAX_CACHED_TILES = 70

export type TileEntry = {
  bitmap: ImageBitmap
  width: number
  gain: number
  paletteId: string
}

export interface RequestTileParams {
  cacheId: string
  reqId: string
  startTime: number
  endTime: number
  gain: number
  tileWidthPx: number
  paletteId: string
}

export const useSpectrogramWorker = (
  audioBufferRef: ShallowRef<AudioBuffer | null>,
  paletteDataRef: ShallowRef<Uint8Array>,
) => {
  let worker = null as Worker | null
  const tileCache = new LRUCache<string, TileEntry>(MAX_CACHED_TILES, (_key, entry) => {
    entry.bitmap.close()
  })
  const requestedTiles = new Set<string>()

  const lastTileTimestamp = ref(0)

  onMounted(() => {
    worker = new SpectrogramWorker()
    tryMountAudioBuffer()
    worker.onmessage = (event: MessageEvent) => {
      const {
        type,
        tileId,
        imageBitmap,
        renderedWidth,
        gain: renderedGain,
        paletteId: renderedPaletteId,
      } = event.data

      if (type === 'TILE_READY') {
        if (tileId) {
          requestedTiles.delete(tileId)
        }

        if (
          tileId &&
          imageBitmap &&
          renderedWidth &&
          renderedGain != null &&
          renderedPaletteId != null
        ) {
          const tileIndex = tileId.split('-')[1]
          if (tileIndex == null) {
            imageBitmap.close()
            return
          }
          const cacheId = `tile-${tileIndex}`
          const existingEntry = tileCache.get(cacheId)

          if (
            !existingEntry ||
            renderedWidth >= existingEntry.width ||
            renderedGain !== existingEntry.gain ||
            renderedPaletteId !== existingEntry.paletteId
          ) {
            tileCache.set(cacheId, {
              bitmap: imageBitmap,
              width: renderedWidth,
              gain: renderedGain,
              paletteId: renderedPaletteId,
            })
          } else {
            imageBitmap.close()
          }
        }
        lastTileTimestamp.value = Date.now()
      } else if (type === 'INIT_COMPLETE') {
        requestedTiles.clear()
        tryMountPaletteData()
        lastTileTimestamp.value = Date.now()
      }
    }
  })
  onBeforeUnmount(() => {
    if (worker) {
      worker.terminate()
      worker = null
    }
  })

  const tryMountAudioBuffer = () => {
    if (!audioBufferRef.value || !worker) return
    tileCache.clear()
    requestedTiles.clear()
    lastTileTimestamp.value = Date.now()

    const channelData = audioBufferRef.value.getChannelData(0)
    const channelDataCopy = channelData.slice()

    worker.postMessage(
      {
        type: 'INIT',
        audioData: channelDataCopy,
        sampleRate: audioBufferRef.value.sampleRate,
      },
      [channelDataCopy.buffer],
    )
  }
  watch(audioBufferRef, tryMountAudioBuffer)

  const tryMountPaletteData = () => {
    if (!worker || !paletteDataRef.value) return
    worker.postMessage({
      type: 'SET_PALETTE',
      palette: paletteDataRef.value,
    })
  }
  watch(paletteDataRef, tryMountPaletteData)

  function requestTileIfNeeded({
    cacheId,
    reqId,
    startTime,
    endTime,
    gain,
    tileWidthPx,
    paletteId,
  }: RequestTileParams) {
    const cacheEntry = tileCache.get(cacheId)
    const currentWidth = cacheEntry?.width ?? 0
    const currentGain = cacheEntry?.gain
    const currentPaletteId = cacheEntry?.paletteId

    const needsRequest =
      (tileWidthPx > currentWidth || currentGain !== gain || currentPaletteId !== paletteId) &&
      tileWidthPx > 0

    if (needsRequest && !requestedTiles.has(reqId)) {
      requestedTiles.add(reqId)
      worker?.postMessage({
        type: 'GET_TILE',
        tileId: reqId,
        startTime,
        endTime,
        gain,
        tileWidthPx,
        paletteId,
      })
    }
  }

  return { tileCache, requestTileIfNeeded, lastTileTimestamp: readonly(lastTileTimestamp) }
}
