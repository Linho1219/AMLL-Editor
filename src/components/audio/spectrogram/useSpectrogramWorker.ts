import { LRUCache } from './lruCache'
import { onBeforeUnmount, onMounted, readonly, ref, watch, type ShallowRef } from 'vue'
import SpectrogramWorker from './spectrogram.worker?worker'
import type { WorkerEmitMsg, WorkerGetMsg } from './spectrogram.worker'
import { nanoid } from 'nanoid'

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

interface ReadonlyInitManager {
  isInited: () => boolean
  getInitPromise: () => Promise<void>
}
interface InitManager extends ReadonlyInitManager {
  setInited: () => void
  quitInited: () => void
}
function getInitManager(): InitManager {
  let workerInited = false
  const resolvers = new Set<() => void>()
  function setInited() {
    workerInited = true
    resolvers.forEach((res) => res())
    resolvers.clear()
  }
  function quitInited() {
    workerInited = false
  }
  const isInited = () => workerInited
  function getInitPromise() {
    if (workerInited) return Promise.resolve()
    return new Promise<void>((resolve) => {
      resolvers.add(resolve)
    })
  }
  return {
    setInited,
    quitInited,
    isInited,
    getInitPromise,
  }
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

  const initManager = getInitManager()

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
        initManager.setInited()
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
    initManager.quitInited()
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

  const TIMEOUT_MS = 5000

  let currentTransaction = undefined as string | undefined
  async function batchRequestTiles(requests: RequestTileParamsWithIndex[]) {
    const transactionId = nanoid()
    currentTransaction = transactionId
    if (requests.length > MAX_CACHED_TILES)
      throw new Error('Number of requested tiles exceeds max cache size')
    await initManager.getInitPromise()
    for (const req of requests) requestTileIfNeeded(req)
    if (!requests.every((req) => tileCache.has(req.id)))
      await new Promise<void>((resolve, reject) => {
        const unwatch = tileCache.listen(() => {
          if (requests.every((req) => tileCache.has(req.id))) {
            unwatch()
            clearTimeout(timeout)
            resolve()
          }
        })
        const timeout = setTimeout(() => {
          reject(
            new Error(
              'Time exceeded waiting for spectrogram tiles, missing tiles: ' +
                requests
                  .filter((req) => !tileCache.has(req.id))
                  .map((req) => req.id)
                  .join(', '),
            ),
          )
          unwatch()
        }, TIMEOUT_MS)
      })
    if (currentTransaction !== transactionId) {
      return null
    }
    return requests.map((req) => {
      const entry = tileCache.get(req.id)
      if (!entry) throw new Error('Tile not found in cache after batch request: ' + req.id)
      return { entry, index: req.index }
    })
  }

  return {
    tileCache,
    batchRequestTiles,
    lastTileTimestamp: readonly(lastTileTimestamp),
    initManager: initManager as ReadonlyInitManager,
  }
}
