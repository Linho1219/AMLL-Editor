import { type Ref, onUnmounted, ref, watch } from 'vue'

import type {
  SpectrogramWorker as SpectrogramWorkerType,
  TileGenerationParams,
  WorkerResponse,
} from '@core/spectrogram/workers/spectrogram'

import { LRUCache } from './lruCache'
import SpectrogramWorker from './workers/spectrogram.worker.ts?worker'

const MAX_CACHED_TILES = 70

export type TileEntry = {
  bitmap: ImageBitmap
  width: number
  height: number
  gain: number
  paletteId: string
}

class SpectrogramWorkerClient {
  private worker: SpectrogramWorkerType
  private reqIdCounter = 0
  private pendingRequests = new Map<
    number,
    {
      resolve: (bmp: ImageBitmap) => void
      reject: (err: Error) => void
    }
  >()

  constructor() {
    this.worker = new SpectrogramWorker()
    this.worker.onmessage = this.handleMessage.bind(this)
  }

  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const msg = event.data
    if (msg.type === 'TILE_READY') {
      const request = this.pendingRequests.get(msg.reqId)
      if (request) {
        request.resolve(msg.imageBitmap)
        this.pendingRequests.delete(msg.reqId)
      } else {
        msg.imageBitmap.close()
      }
    } else if (msg.type === 'ERROR') {
      const request = this.pendingRequests.get(msg.reqId)
      if (request) {
        console.warn(`Worker Error req ${msg.reqId}:`, msg.message)
        request.reject(new Error(msg.message))
        this.pendingRequests.delete(msg.reqId)
      }
    }
  }

  public getTile(params: TileGenerationParams): Promise<ImageBitmap> {
    const reqId = this.reqIdCounter++
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(reqId, { resolve, reject })
      this.worker.postMessage({
        type: 'GET_TILE',
        reqId,
        params,
      })
    })
  }

  public initAudio(audioData: Float32Array, sampleRate: number) {
    this.worker.postMessage({ type: 'INIT', audioData, sampleRate }, [audioData.buffer])
  }

  public setPalette(palette: Uint8Array) {
    this.worker.postMessage({ type: 'SET_PALETTE', palette })
  }

  public terminate() {
    this.worker.terminate()
    this.pendingRequests.clear()
  }
}

export function useSpectrogramWorker(
  audioBuffer: Ref<AudioBuffer | null>,
  paletteData: Ref<Uint8Array>,
) {
  let client: SpectrogramWorkerClient | null = null

  const tileCache = new LRUCache<string, TileEntry>(MAX_CACHED_TILES, (_key, entry) => {
    entry.bitmap.close()
  })

  const activeRequests = new Set<string>()

  const lastTileTimestamp = ref(0)

  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    client = new SpectrogramWorkerClient()
  }
  if (paletteData.value) {
    client?.setPalette(paletteData.value)
  }

  watch(
    audioBuffer,
    (newBuffer) => {
      if (!newBuffer || !client) return

      tileCache.clear()
      activeRequests.clear()

      const channelData = newBuffer.getChannelData(0)
      const channelDataCopy = channelData.slice()

      client.initAudio(channelDataCopy, newBuffer.sampleRate)

      if (paletteData.value) {
        client.setPalette(paletteData.value)
      }

      lastTileTimestamp.value = Date.now()
    },
    { immediate: true },
  )

  watch(paletteData, (newPalette) => {
    if (client && newPalette) {
      client.setPalette(newPalette)
    }
  })

  onUnmounted(() => {
    client?.terminate()
    client = null
    tileCache.clear()
  })

  const requestTileIfNeeded = async (params: TileGenerationParams) => {
    if (!client) return

    const cacheKey = `tile-${params.tileIndex}`
    const requestFingerprint = `${params.tileIndex}-w${params.tileWidthPx}-h${params.height}-g${params.gain}-p${params.paletteId}`

    const cacheEntry = tileCache.get(cacheKey)

    const isStale =
      !cacheEntry ||
      cacheEntry.width < params.tileWidthPx ||
      cacheEntry.height !== params.height ||
      cacheEntry.gain !== params.gain ||
      cacheEntry.paletteId !== params.paletteId

    if (isStale && !activeRequests.has(requestFingerprint)) {
      activeRequests.add(requestFingerprint)

      try {
        const bitmap = await client.getTile(params)

        tileCache.set(cacheKey, {
          bitmap,
          width: params.tileWidthPx,
          height: params.height,
          gain: params.gain,
          paletteId: params.paletteId,
        })

        lastTileTimestamp.value = Date.now()
      } catch (err) {
        console.error('生成频谱图瓦片失败', err)
      } finally {
        activeRequests.delete(requestFingerprint)
      }
    }
  }

  return {
    tileCache,
    requestTileIfNeeded,
    lastTileTimestamp,
  }
}
