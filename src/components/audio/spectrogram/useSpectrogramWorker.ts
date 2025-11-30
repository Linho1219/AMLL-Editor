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
  reqId: number
  startTime: number
  endTime: number
  gain: number
  tileWidthPx: number
  paletteId: string
}

const id2str = (id: number) => `tile-${id}`
const str2id = (str: string) => Number(str.split('-')[1])

export const useSpectrogramWorker = (
  audioBufferRef: ShallowRef<AudioBuffer | null>,
  paletteDataRef: ShallowRef<Uint8Array>,
) => {
  let worker = null as Worker | null
  const tileCache = new LRUCache<number, TileEntry>(MAX_CACHED_TILES, (_key, entry) => {
    entry.bitmap.close()
  })
  const requestedTiles = new Set<number>()

  const lastTileTimestamp = ref(0)

  let workerInitResolve = null as (() => void) | null
  const workerInitPromise = new Promise<void>((resolve) => {
    workerInitResolve = resolve
  })

  onMounted(() => {
    worker = new SpectrogramWorker()
    tryMountAudioBuffer()
    worker.onmessage = (event: MessageEvent) => {
      const {
        type,
        tileId: tileIdStr,
        imageBitmap,
        renderedWidth,
        gain: renderedGain,
        paletteId: renderedPaletteId,
      } = event.data
      console.log(type)

      if (type === 'TILE_READY') {
        if (tileIdStr) {
          requestedTiles.delete(str2id(tileIdStr))
        }

        if (
          tileIdStr &&
          imageBitmap &&
          renderedWidth &&
          renderedGain != null &&
          renderedPaletteId != null
        ) {
          const tileIndex = str2id(tileIdStr)
          if (tileIndex == null) {
            imageBitmap.close()
            return
          }
          const cacheId = tileIndex
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
        if (workerInitResolve) {
          workerInitResolve()
          workerInitResolve = null
        }
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
    reqId,
    startTime,
    endTime,
    gain,
    tileWidthPx,
    paletteId,
  }: RequestTileParams) {
    const cacheEntry = tileCache.get(reqId)
    const currentWidth = cacheEntry?.width ?? 0
    const currentGain = cacheEntry?.gain
    const currentPaletteId = cacheEntry?.paletteId

    const needsRequest =
      (tileWidthPx > currentWidth || currentGain !== gain || currentPaletteId !== paletteId) &&
      tileWidthPx > 0

    if (needsRequest && !requestedTiles.has(reqId)) {
      requestedTiles.add(reqId)
      if (!worker) console.warn('Spectrogram worker is not initialized')
      console.log('reqid:', reqId)
      worker?.postMessage({
        type: 'GET_TILE',
        tileId: id2str(reqId),
        startTime,
        endTime,
        gain,
        tileWidthPx,
        paletteId,
      })
    }
  }

  return {
    tileCache,
    requestTileIfNeeded,
    lastTileTimestamp: readonly(lastTileTimestamp),
    workerInitPromise,
  }
}
