import init, {
  generate_spectrogram_image,
  initThreadPool,
} from '@/lib/spectrogram/wasm_spectrogram'

interface MsgInit {
  type: 'INIT'
  audioData: Float32Array
  sampleRate: number
}
interface MsgSetPalette {
  type: 'SET_PALETTE'
  palette: Uint8Array
}
interface MsgGetTile {
  type: 'GET_TILE'
  id: string
  startTime: number
  endTime: number
  gain: number
  tileWidthPx: number
  paletteId: string
}
export type WorkerGetMsg = MsgInit | MsgSetPalette | MsgGetTile

interface MsgInitComplete {
  type: 'INIT_COMPLETE'
}
interface MsgTileReady {
  type: 'TILE_READY'
  id: string
  imageBitmap: ImageBitmap
  renderedWidth: number
  gain: number
  paletteId: string
}
export type WorkerEmitMsg = MsgInitComplete | MsgTileReady

let fullAudioData: Float32Array | null = null
let audioSampleRate: number = 0
let wasmInitialized: Promise<void> | null = null
let currentPalette: Uint8Array | null = null

async function initializeWasm() {
  if (!wasmInitialized) {
    wasmInitialized = (async () => {
      await init()
      await initThreadPool(navigator.hardwareConcurrency)
    })()
  }
  await wasmInitialized
}

const postMessage = self.postMessage.bind(self) as (
  msg: WorkerEmitMsg,
  options?: WindowPostMessageOptions,
) => void

self.onmessage = async (event: MessageEvent<WorkerGetMsg>) => {
  await initializeWasm()
  const { type } = event.data

  if (type === 'INIT') {
    fullAudioData = event.data.audioData
    audioSampleRate = event.data.sampleRate
    currentPalette = null
    postMessage({ type: 'INIT_COMPLETE' })
  } else if (type === 'SET_PALETTE') {
    currentPalette = event.data.palette
  } else if (type === 'GET_TILE') {
    if (!fullAudioData || !audioSampleRate || !currentPalette) {
      return
    }

    const { id, startTime, endTime, gain, tileWidthPx, paletteId } = event.data

    const startSample = Math.floor(startTime * audioSampleRate)
    const endSample = Math.ceil(endTime * audioSampleRate)

    if (startSample >= fullAudioData.length) return

    const audioSlice = fullAudioData.slice(startSample, Math.min(endSample, fullAudioData.length))

    const TILE_HEIGHT = 256

    const t0 = performance.now()

    const pixelData = generate_spectrogram_image(
      audioSlice,
      audioSampleRate,
      1024,
      64,
      tileWidthPx,
      TILE_HEIGHT,
      gain,
      currentPalette,
    )

    const t1 = performance.now()

    console.log(`[Worker] ${id} width ${tileWidthPx} ${(t1 - t0).toFixed(2)} ms`)

    const canvas = new OffscreenCanvas(tileWidthPx, TILE_HEIGHT)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const imageData = new ImageData(new Uint8ClampedArray(pixelData), tileWidthPx, TILE_HEIGHT)
      ctx.putImageData(imageData, 0, 0)

      const imageBitmap = canvas.transferToImageBitmap()
      postMessage(
        {
          type: 'TILE_READY',
          id,
          imageBitmap,
          renderedWidth: tileWidthPx,
          gain: gain,
          paletteId: paletteId,
        },
        {
          transfer: [imageBitmap],
        },
      )
    }
  }
}
