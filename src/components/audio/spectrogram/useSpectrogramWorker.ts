import { LRUCache } from './lruCache'
import { onBeforeUnmount, onMounted, readonly, ref, watch, type ShallowRef } from 'vue'
import SpectrogramWorker from './spectrogram.worker?worker'
import type { WorkerEmitMsg, WorkerGetMsg } from './spectrogram.worker'

const MAX_CACHED_TILES = 70

export type TileEntry = {
  bitmap: ImageBitmap
  width: number
  gain: number
  paletteId: string
}

export interface RequestTileParams {
  id: string
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
  const postMessage = (msg: WorkerGetMsg, transfer?: Transferable[]) =>
    transfer ? worker?.postMessage(msg, transfer) : worker?.postMessage(msg)

  const tileCache = new LRUCache<string, TileEntry>(MAX_CACHED_TILES, (_key, entry) => {
    entry.bitmap.close()
  })
  const requestedTiles = new Set<string>()

  const lastTileTimestamp = ref(0)

  let workerInitResolve = null as (() => void) | null
  const workerInitPromise = new Promise<void>((resolve) => {
    workerInitResolve = resolve
  })

  onMounted(() => {
    worker = new SpectrogramWorker()
    tryMountAudioBuffer()
    worker.onmessage = (event: MessageEvent<WorkerEmitMsg>) => {
      const { type } = event.data
      if (type === 'TILE_READY') {
        const {
          id,
          imageBitmap,
          renderedWidth,
          gain: renderedGain,
          paletteId: renderedPaletteId,
        } = event.data

        if (id) requestedTiles.delete(id)

        if (
          id &&
          imageBitmap &&
          renderedWidth &&
          renderedGain != null &&
          renderedPaletteId != null
        ) {
          if (!id) {
            imageBitmap.close()
            return
          }
          const existingEntry = tileCache.get(id)

          if (
            !existingEntry ||
            renderedWidth >= existingEntry.width ||
            renderedGain !== existingEntry.gain ||
            renderedPaletteId !== existingEntry.paletteId
          ) {
            tileCache.set(id, {
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

    postMessage(
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
    postMessage({
      type: 'SET_PALETTE',
      palette: paletteDataRef.value,
    })
  }
  watch(paletteDataRef, tryMountPaletteData)

  function requestTileIfNeeded({
    id,
    startTime,
    endTime,
    gain,
    tileWidthPx,
    paletteId,
  }: RequestTileParams) {
    const cacheEntry = tileCache.get(id)
    const currentWidth = cacheEntry?.width ?? 0
    const currentGain = cacheEntry?.gain
    const currentPaletteId = cacheEntry?.paletteId

    const needsRequest =
      (tileWidthPx > currentWidth || currentGain !== gain || currentPaletteId !== paletteId) &&
      tileWidthPx > 0

    if (needsRequest && !requestedTiles.has(id)) {
      requestedTiles.add(id)
      if (!worker) console.warn('Spectrogram worker is not initialized')
      console.log('id:', id)
      worker?.postMessage({
        type: 'GET_TILE',
        id,
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
