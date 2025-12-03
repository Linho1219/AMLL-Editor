import { LRUCache } from './lruCache'
import { nextTick, onBeforeUnmount, onMounted, readonly, ref, watch, type ShallowRef } from 'vue'
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
export interface RequestTileParamsWithIndex extends RequestTileParams {
  index: number
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
  const requestedTiles = (() => {
    const set = new Set<string>()
    type Listener = (size: number) => void
    const listeners = new Set<Listener>()
    const notifyAll = () => listeners.forEach((l) => l(set.size))
    return {
      has: (id: string) => set.has(id),
      add: (id: string) => (set.add(id), notifyAll()),
      delete: (id: string) => (set.delete(id), notifyAll()),
      clear: () => (set.clear(), notifyAll()),
      listen: (listener: Listener) => (listeners.add(listener), () => listeners.delete(listener)),
      get size() {
        return set.size
      },
    }
  })()

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

  const TIMEOUT_MS = 10000
  function queueEmptyPromise(): Promise<void> {
    if (requestedTiles.size === 0) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const stopWatch = requestedTiles.listen((size) => {
        if (size === 0) {
          clearTimeout(timeout)
          stopWatch()
          resolve()
        }
      })
      const timeout = setTimeout(() => {
        stopWatch()
        reject(
          new Error(
            'Timeout waiting for spectrogram worker queue to empty, current count: ' +
              requestedTiles.size,
          ),
        )
      }, TIMEOUT_MS)
    })
  }

  async function batchRequestTiles(requests: RequestTileParamsWithIndex[]) {
    if (requests.length > MAX_CACHED_TILES)
      throw new Error('Number of requested tiles exceeds max cache size')
    await workerInitPromise
    await queueEmptyPromise()
    for (const req of requests) requestTileIfNeeded(req)
    await nextTick()
    await queueEmptyPromise()
    return requests.map((req) => {
      const entry = tileCache.get(req.id)
      if (!entry) {
        throw new Error('Tile not found in cache after batch request: ' + req.id)
      }
      return { entry, index: req.index }
    })
  }

  return {
    tileCache,
    batchRequestTiles,
    lastTileTimestamp: readonly(lastTileTimestamp),
    workerInitPromise,
  }
}
