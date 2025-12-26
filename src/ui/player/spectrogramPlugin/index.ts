// Import centralized FFT functionality
/**
 * Spectrogram plugin for wavesurfer.
 */
import BasePlugin, { type BasePluginEvents } from 'wavesurfer.js/dist/base-plugin.js'
import createElementOrig from 'wavesurfer.js/dist/dom.js'
import {
  createWrapperClickHandler,
  freqType,
  getLabelFrequency,
  hzToScale,
  setupColorMap,
  unitType,
} from 'wavesurfer.js/dist/fft.js'

// Import the worker using rollup-plugin-web-worker-loader
import SpectrogramWorker from './worker?worker'

/**
 * Spectrogram plugin
 *
 * Render a spectrogram visualisation of the audio.
 *
 * @author Pavel Denisov (https://github.com/akreal)
 * @see https://github.com/wavesurfer-js/wavesurfer.js/pull/337
 *
 * @example
 * // ... initialising wavesurfer with the plugin
 * var wavesurfer = WaveSurfer.create({
 *   // wavesurfer options ...
 *   plugins: [
 *     SpectrogramPlugin.create({
 *       // plugin options ...
 *     })
 *   ]
 * });
 */

// Modified by @Linho1219

const COLOR_LUT: [number, number, number, number][] = Array.from({ length: 256 }, (_, i) =>
  getIcyBlueColor(i / 255),
)

const createElement = createElementOrig as (
  ...args: Parameters<typeof createElementOrig>
) => HTMLElement

export type SpectrogramPluginOptions = {
  /** Element in which to render */
  container?: HTMLElement
  /** Number of samples to fetch to FFT. Must be a power of 2. */
  fftSamples: number
  /** Height of the spectrogram view in CSS pixels */
  height: number

  hopSize: number
  /** The window function to be used. */
  windowFunc:
    | 'bartlett'
    | 'bartlettHann'
    | 'blackman'
    | 'cosine'
    | 'gauss'
    | 'hamming'
    | 'hann'
    | 'lanczoz'
    | 'rectangular'
    | 'triangular'
  /** Some window functions have this extra value. (Between 0 and 1) */
  alpha: number
  /** Min frequency to scale spectrogram. */
  frequencyMin: number
  /** Max frequency to scale spectrogram. Set this to samplerate/2 to draw whole range of spectrogram. */
  frequencyMax: number
  /** Sample rate of the audio when using pre-computed spectrogram data. Required when using frequenciesDataUrl. */
  sampleRate: number
  /** display gain */
  gain: number
  /** noise floor level */
  noiseFloor: number
  minFreqThresOfMaxMagnitude: number
  logRatio: number
  /** Maximum width of individual canvas elements in pixels (default: 30000) */
  maxCanvasWidth: number
}

export type SpectrogramPluginEvents = BasePluginEvents & {
  ready: []
  click: [relativeX: number]
}

class SpectrogramPlugin extends BasePlugin<SpectrogramPluginEvents, SpectrogramPluginOptions> {
  private static MAX_CANVAS_WIDTH = 30000
  private static MAX_NODES = 10

  private container: HTMLElement | null = null
  private buffer: AudioBuffer | null = null
  private wrapper: HTMLElement | null = null
  // private labelsEl: HTMLCanvasElement | null = null
  private canvases: HTMLCanvasElement[] = []
  private canvasContainer: HTMLElement | null = null
  private optn: SpectrogramPluginOptions = null as any

  // Web worker
  private worker: Worker | null = null
  private workerPromises: Map<string, { resolve: Function; reject: Function }> = new Map()

  // Performance optimization properties
  private cachedFrequencies: Uint8Array[][] | null = null
  private cachedResampledData: Uint8Array[][] | null = null
  private cachedBuffer: AudioBuffer | null = null
  private cachedWidth = 0
  private renderTimeout: number | null = null
  private isRendering = false
  private lastZoomLevel = 0
  private renderThrottleMs = 50 // Reduced frequency for better performance
  private zoomThreshold = 0.05 // More sensitive zoom detection
  private drawnCanvases: Record<number, boolean> = {}
  private pendingBitmaps = new Set<Promise<ImageBitmap>>()
  private isScrollable = false
  private scrollUnsubscribe: (() => void) | null = null
  private _onWrapperClick: ((e: MouseEvent) => void) | null = null
  private _onReady: (() => void) | null = null
  private _onRender: (() => void) | null = null

  static create(options?: Partial<SpectrogramPluginOptions>) {
    return new SpectrogramPlugin(options || {})
  }

  constructor(options: Partial<SpectrogramPluginOptions>) {
    super(options as SpectrogramPluginOptions)

    this.optn = {
      fftSamples: 512,
      height: 200,
      hopSize: 512,
      windowFunc: 'rectangular',
      alpha: 0,
      frequencyMin: 0,
      frequencyMax: 0,
      gain: 8,
      noiseFloor: 1e-3,
      minFreqThresOfMaxMagnitude: 0,
      logRatio: 0.3,
      sampleRate: 1024,
      maxCanvasWidth: SpectrogramPlugin.MAX_CANVAS_WIDTH,
      ...options,
    }
    this.options = this.optn

    // Override the default max canvas width if provided
    if (options.maxCanvasWidth) {
      SpectrogramPlugin.MAX_CANVAS_WIDTH = options.maxCanvasWidth
    }

    // Set default performance settings
    this.renderThrottleMs = 50
    this.zoomThreshold = 0.05

    this.createWrapper()
    this.createCanvas()

    // Initialize worker if enabled
    this.initializeWorker()
  }

  private initializeWorker() {
    // Skip worker initialization in SSR environments (Next.js server-side)
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      console.warn('Worker not available in this environment, using main thread calculation')
      return
    }

    try {
      // Create worker using imported worker constructor
      this.worker = new SpectrogramWorker()

      this.worker.onmessage = (e) => {
        const { type, id, result, error } = e.data

        if (type === 'frequenciesResult') {
          const promise = this.workerPromises.get(id)
          if (promise) {
            this.workerPromises.delete(id)
            if (error) {
              promise.reject(new Error(error))
            } else {
              promise.resolve(result)
            }
          }
        }
      }

      this.worker.onerror = (error) => {
        console.warn('Spectrogram worker error')
        // Fallback to main thread calculation
        this.worker = null
      }
    } catch (error) {
      console.warn('Failed to initialize worker', error)
      this.worker = null
    }
  }

  override onInit() {
    // Recreate DOM elements if they were destroyed
    if (!this.wrapper) {
      this.createWrapper()
      if (!this.wrapper) throw new Error('Wrapper failed')
    }
    if (!this.canvasContainer) {
      this.createCanvas()
    }
    if (!this.wavesurfer) throw new Error('No parent found')

    // Always get fresh container reference to avoid stale references
    this.container = this.wavesurfer.getWrapper()
    this.container.appendChild(this.wrapper)

    if (this.wavesurfer.options.fillParent) {
      Object.assign(this.wrapper.style, {
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'hidden',
      })
    }
    this.subscriptions.push(this.wavesurfer.on('redraw', () => this.throttledRender()))

    // Trigger initial render after re-initialization
    // This ensures the spectrogram appears even if no redraw event is fired
    if (this.wavesurfer.getDecodedData()) {
      // Use setTimeout to ensure DOM is fully ready
      setTimeout(() => {
        this.throttledRender()
      }, 0)
    }
  }

  public override destroy() {
    this.unAll()

    // Clean up any direct event listeners (if they exist)
    if (this.wavesurfer) {
      // Note: _onReady and _onRender methods may not exist, but the original code had these
      // We should be cautious and only call un if the methods exist
      if (typeof this._onReady === 'function') {
        this.wavesurfer.un('ready', this._onReady)
      }
      if (typeof this._onRender === 'function') {
        this.wavesurfer.un('redraw', this._onRender)
      }
    }

    // Clean up performance optimization resources
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout)
      this.renderTimeout = null
    }

    // Clean up scroll listener
    if (this.scrollUnsubscribe) {
      this.scrollUnsubscribe()
      this.scrollUnsubscribe = null
    }

    // Cancel pending bitmap operations
    this.pendingBitmaps.clear()

    // Clean up worker
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.cachedFrequencies = null
    this.cachedResampledData = null
    this.cachedBuffer = null

    // Clean up DOM elements properly
    this.clearCanvases()
    if (this.canvasContainer) {
      this.canvasContainer.remove()
      this.canvasContainer = null
    }
    if (this.wrapper) {
      this.wrapper.remove()
      this.wrapper = null
    }
    // if (this.labelsEl) {
    //   // Properly remove labels canvas from DOM before nullifying reference
    //   this.labelsEl.remove()
    //   this.labelsEl = null
    // }

    // Reset state for potential re-initialization
    this.container = null
    this.isRendering = false
    this.lastZoomLevel = 0
    this.wavesurfer = undefined
    this.optn = null as any

    super.destroy()
  }

  public async loadFrequenciesData(url: string | URL) {
    const resp = await fetch(url)
    if (!resp.ok) {
      throw new Error('Unable to fetch frequencies data')
    }
    const data = await resp.json()
    this.drawSpectrogram(data)
  }

  public async getFrequenciesData(): Promise<Uint8Array[][] | null> {
    const decodedData = this.wavesurfer?.getDecodedData()
    if (!decodedData) {
      return null
    }

    if (this.cachedBuffer === decodedData && this.cachedFrequencies) {
      // Check if we can use cached frequencies
      return this.cachedFrequencies
    } else {
      // Calculate new frequencies and cache them
      const frequencies = await this.getFrequencies(decodedData)
      this.cachedFrequencies = frequencies
      this.cachedBuffer = decodedData
      return frequencies
    }
  }

  /** Clear cached frequency data to force recalculation */
  public clearCache() {
    this.cachedFrequencies = null
    this.cachedResampledData = null
    this.cachedBuffer = null
    this.cachedWidth = 0
    this.lastZoomLevel = 0
  }

  private createWrapper() {
    this.wrapper = createElement('div', {
      style: {
        display: 'block',
        position: 'relative',
        userSelect: 'none',
      },
    })

    // Create wrapper click handler using shared utility
    this._onWrapperClick = createWrapperClickHandler(this.wrapper, this.emit.bind(this) as any)
    this.wrapper.addEventListener('click', this._onWrapperClick)
  }

  private createCanvas() {
    if (!this.wrapper) throw new Error('Wrapper not created')
    this.canvasContainer = createElement(
      'div',
      {
        style: {
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          zIndex: '4',
        },
      },
      this.wrapper,
    )
  }

  private createSingleCanvas(width: number, height: number, offset: number): HTMLCanvasElement {
    if (!this.canvasContainer) throw new Error('Canvas container not created')
    const canvas = createElement('canvas', {
      style: {
        position: 'absolute',
        left: `${Math.round(offset)}px`,
        top: '0',
        width: `${width}px`,
        height: `${height}px`,
        zIndex: '4',
      },
    }) as HTMLCanvasElement

    canvas.width = Math.round(width)
    canvas.height = Math.round(height)

    this.canvasContainer.appendChild(canvas)
    return canvas
  }

  private clearCanvases() {
    this.canvases.forEach((canvas) => canvas.remove())
    this.canvases = []
    this.drawnCanvases = {}
  }

  private clearExcessCanvases() {
    // Clear canvases to avoid too many DOM nodes
    if (Object.keys(this.drawnCanvases).length > SpectrogramPlugin.MAX_NODES) {
      this.clearCanvases()
    }
  }

  private throttledRender() {
    // Clear any pending render
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout)
    }

    // Skip if already rendering
    if (this.isRendering) {
      return
    }

    // Check if zoom level changed significantly
    const currentZoom = this.wavesurfer?.options.minPxPerSec ?? 0
    const zoomDiff =
      Math.abs(currentZoom - this.lastZoomLevel) / Math.max(currentZoom, this.lastZoomLevel, 1)

    if (zoomDiff < this.zoomThreshold && this.cachedFrequencies) {
      // Small zoom change - just re-render with cached data
      this.renderTimeout = window.setTimeout(() => {
        this.fastRender()
      }, this.renderThrottleMs)
    } else {
      // Significant zoom change - full re-render
      this.renderTimeout = window.setTimeout(() => {
        this.render()
      }, this.renderThrottleMs)
    }
  }

  private async render() {
    if (this.isRendering) return
    this.isRendering = true

    try {
      const frequencies = await this.getFrequenciesData()
      if (frequencies) this.drawSpectrogram(frequencies)

      this.lastZoomLevel = this.wavesurfer?.options.minPxPerSec ?? 0
    } finally {
      this.isRendering = false
    }
  }

  private fastRender() {
    if (this.isRendering || !this.cachedFrequencies) return
    this.isRendering = true

    try {
      // Use cached frequencies for fast re-render
      this.drawSpectrogram(this.cachedFrequencies)
      this.lastZoomLevel = this.wavesurfer?.options.minPxPerSec ?? 0
    } finally {
      this.isRendering = false
    }
  }

  private drawSpectrogram(frequenciesData: Uint8Array[][]): void {
    if (!isNaN(frequenciesData?.[0]?.[0] as any)) {
      // data is 1ch [sample, freq] format
      // to [channel, sample, freq] format
      frequenciesData = [frequenciesData] as any
    }

    // Clear existing canvases
    this.clearCanvases()
    const optn = this.optn

    // Set the height to fit all channels
    const totalHeight = optn.height * frequenciesData.length
    if (!this.wrapper) throw new Error('Wrapper not created')
    this.wrapper.style.height = totalHeight + 'px'

    const totalWidth = this.getWidth()
    const maxCanvasWidth = Math.min(SpectrogramPlugin.MAX_CANVAS_WIDTH, totalWidth)

    // Nothing to render
    if (totalWidth === 0 || totalHeight === 0) return

    // Calculate number of canvases needed
    const numCanvases = Math.ceil(totalWidth / maxCanvasWidth)

    // Smart resampling based on zoom level
    let resampledData: Uint8Array[][]
    const originalDataWidth = frequenciesData[0]?.length ?? 0
    const needsResampling = totalWidth !== originalDataWidth

    if (!needsResampling) {
      // At high zoom levels, use original data directly - much faster!
      resampledData = frequenciesData
    } else if (this.cachedResampledData && this.cachedWidth === totalWidth) {
      // Use cached resampled data
      resampledData = this.cachedResampledData
    } else {
      // Only resample when actually needed
      resampledData = this.efficientResample(frequenciesData, totalWidth)
      this.cachedResampledData = resampledData
      this.cachedWidth = totalWidth
    }

    // Maximum frequency represented in `frequenciesData`
    // Use buffer.sampleRate if available (from getFrequencies), otherwise use the provided sampleRate
    const freqFrom = this.buffer?.sampleRate ? this.buffer.sampleRate / 2 : optn.sampleRate / 2

    // Minimum and maximum frequency we want to draw
    const freqMin = optn.frequencyMin
    const freqMax = optn.frequencyMax

    // Draw background if needed
    const shouldDrawBackground = freqMax > freqFrom
    const bgColor = shouldDrawBackground ? COLOR_LUT[COLOR_LUT.length - 1] : null

    // Function to draw a single canvas
    const drawCanvas = (canvasIndex: number) => {
      if (canvasIndex < 0 || canvasIndex >= numCanvases) return
      if (this.drawnCanvases[canvasIndex]) return

      this.drawnCanvases[canvasIndex] = true

      const offset = canvasIndex * maxCanvasWidth
      const canvasWidth = Math.min(maxCanvasWidth, totalWidth - offset)

      if (canvasWidth <= 0) return

      const canvas = this.createSingleCanvas(canvasWidth, totalHeight, offset)
      this.canvases.push(canvas)
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      // Draw background if needed
      if (shouldDrawBackground && bgColor) {
        ctx.fillStyle = `rgba(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]}, ${bgColor[3]})`
        ctx.fillRect(0, 0, canvasWidth, totalHeight)
      }

      // Render each channel for this canvas segment
      for (let c = 0; c < resampledData.length; c++) {
        this.drawSpectrogramSegment(
          resampledData[c]!,
          ctx,
          canvasWidth,
          optn.height,
          c * optn.height,
          offset,
          totalWidth,
          freqFrom,
          freqMin,
          freqMax,
        )
      }
    }

    // Store rendering parameters for lazy loading
    this.isScrollable = totalWidth > this.getWrapperWidth()

    // Clear previous scroll listener
    if (this.scrollUnsubscribe) {
      this.scrollUnsubscribe()
      this.scrollUnsubscribe = null
    }

    if (!this.isScrollable || numCanvases <= 3) {
      // Draw all canvases if not scrollable or few canvases
      for (let i = 0; i < numCanvases; i++) {
        drawCanvas(i)
      }
    } else {
      // Implement lazy rendering with scroll listener
      const renderVisibleCanvases = () => {
        const wrapper = this.wavesurfer?.getWrapper()
        if (!wrapper) return

        const scrollLeft = wrapper.scrollLeft ?? 0
        const containerWidth = wrapper.clientWidth ?? 0

        // Calculate visible range with some buffer
        const bufferRatio = 0.5 // Render 50% extra on each side
        const visibleStart = Math.max(0, scrollLeft - containerWidth * bufferRatio)
        const visibleEnd = Math.min(totalWidth, scrollLeft + containerWidth * (1 + bufferRatio))

        const startCanvasIndex = Math.floor((visibleStart / totalWidth) * numCanvases)
        const endCanvasIndex = Math.min(
          Math.ceil((visibleEnd / totalWidth) * numCanvases),
          numCanvases - 1,
        )

        // Clear excess canvases if we have too many
        if (Object.keys(this.drawnCanvases).length > SpectrogramPlugin.MAX_NODES) {
          this.clearExcessCanvases()
        }

        // Draw visible canvases
        for (let i = startCanvasIndex; i <= endCanvasIndex; i++) {
          drawCanvas(i)
        }
      }

      // Initial render of visible canvases
      renderVisibleCanvases()

      // Set up scroll listener for lazy loading
      let scrollTimeout: number | null = null
      const onScroll = () => {
        if (scrollTimeout) clearTimeout(scrollTimeout)
        scrollTimeout = window.setTimeout(renderVisibleCanvases, 16) // 60fps
      }

      const wrapper = this.wavesurfer?.getWrapper()
      if (wrapper) {
        wrapper.addEventListener('scroll', onScroll, { passive: true })
        this.scrollUnsubscribe = () => {
          wrapper.removeEventListener('scroll', onScroll)
          if (scrollTimeout) clearTimeout(scrollTimeout)
        }
      }
    }

    this.emit('ready')
  }

  private drawSpectrogramSegment(
    resampledPixels: Uint8Array[],
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    height: number,
    yOffset: number,
    xOffset: number,
    totalWidth: number,
    freqFrom: number,
    freqMin: number,
    freqMax: number,
  ): void {
    // Data is already resampled for the total width
    const bitmapHeight = resampledPixels[0]!.length

    // Calculate which portion of the resampled data corresponds to this canvas
    const startIndex = Math.floor((xOffset / totalWidth) * resampledPixels.length)
    const endIndex = Math.min(
      Math.ceil(((xOffset + canvasWidth) / totalWidth) * resampledPixels.length),
      resampledPixels.length,
    )
    const segmentPixels = resampledPixels.slice(startIndex, endIndex)

    if (segmentPixels.length === 0) return

    // Create ImageData for this segment
    const segmentWidth = segmentPixels.length
    const imageData = new ImageData(segmentWidth, bitmapHeight)
    const data = imageData.data

    // Always use quality rendering - users want accurate spectrograms
    this.fillImageDataQuality(data, segmentPixels, segmentWidth, bitmapHeight)

    // Calculate frequency scaling
    const scale = 'linear'
    const rMin = hzToScale(freqMin, scale) / hzToScale(freqFrom, scale)
    const rMax = hzToScale(freqMax, scale) / hzToScale(freqFrom, scale)
    const rMax1 = Math.min(1, rMax)

    // Create and draw the bitmap - manage async properly
    const bitmapPromise = createImageBitmap(
      imageData,
      0,
      Math.round(bitmapHeight * (1 - rMax1)),
      segmentWidth,
      Math.round(bitmapHeight * (rMax1 - rMin)),
    )

    // Track pending bitmap for cleanup
    this.pendingBitmaps.add(bitmapPromise)

    bitmapPromise
      .then((bitmap) => {
        // Remove from pending set
        this.pendingBitmaps.delete(bitmapPromise)

        // Check if canvas is still valid before drawing
        if (ctx.canvas.parentNode) {
          const drawHeight = (height * rMax1) / rMax
          const drawY = yOffset + height * (1 - rMax1 / rMax)

          ctx.drawImage(bitmap, 0, drawY, canvasWidth, drawHeight)

          // Clean up bitmap to free memory
          if ('close' in bitmap) {
            bitmap.close()
          }
        }
      })
      .catch((error) => {
        // Clean up on error
        this.pendingBitmaps.delete(bitmapPromise)
      })
  }

  private getWidth() {
    return this.wavesurfer?.getWrapper().offsetWidth ?? 0
  }

  private getWrapperWidth() {
    return this.wavesurfer?.getWrapper()?.clientWidth ?? 0
  }

  private async calculateFrequenciesWithWorker(buffer: AudioBuffer): Promise<Uint8Array[][]> {
    if (!this.worker) {
      throw new Error('Worker not available')
    }

    // Prepare audio data for worker
    const audioData: Float32Array[] = [buffer.getChannelData(0)]

    // Generate unique ID for this request
    const id = `${Date.now()}_${Math.random()}`

    // Create promise for worker response
    const promise = new Promise<Uint8Array[][]>((resolve, reject) => {
      this.workerPromises.set(id, { resolve, reject })

      // Set timeout to avoid hanging
      setTimeout(() => {
        if (this.workerPromises.has(id)) {
          this.workerPromises.delete(id)
          reject(new Error('Worker timeout'))
        }
      }, 30000) // 30 second timeout
    })

    // Send message to worker
    const optn = this.optn
    this.worker.postMessage({
      type: 'calculateFrequencies',
      id,
      audioData,
      options: {
        startTime: 0,
        endTime: buffer.duration,
        sampleRate: buffer.sampleRate,
        fftSamples: optn.fftSamples,
        windowFunc: optn.windowFunc,
        alpha: optn.alpha,
        hopSize: optn.hopSize,
        gain: optn.gain,
        noiseFloor: optn.noiseFloor,
        maxThresOfMaxMagnitude:
          1 -
          (optn.minFreqThresOfMaxMagnitude - optn.frequencyMin) /
            (optn.frequencyMax - optn.frequencyMin),
        logRatio: optn.logRatio,
        splitChannels: false,
      },
    })

    return promise
  }

  private async getFrequencies(buffer: AudioBuffer): Promise<Uint8Array[][]> {
    this.optn.frequencyMax = this.optn.frequencyMax || buffer.sampleRate / 2
    this.buffer = buffer

    if (!buffer) return []

    try {
      const result = await this.calculateFrequenciesWithWorker(buffer)
      this.worker?.terminate()
      return result
    } catch (error) {
      throw Error('Worker calculation failed, falling back to main thread:' + error)
    }
  }

  private efficientResample(frequenciesData: Uint8Array[][], targetWidth: number): Uint8Array[][] {
    return frequenciesData.map((channelFreq) => this.resampleChannel(channelFreq, targetWidth))
  }

  private resampleChannel(oldMatrix: Uint8Array[], targetWidth: number): Uint8Array[] {
    const oldColumns = oldMatrix.length
    const freqBins = oldMatrix[0]?.length ?? 0

    // Fast path for no resampling needed
    if (oldColumns === targetWidth || targetWidth === 0) {
      return oldMatrix
    }

    const ratio = oldColumns / targetWidth

    // Always use quality resampling for accurate spectrograms
    const newMatrix = new Array(targetWidth)

    if (ratio >= 1) {
      // Downsampling with proper averaging
      for (let i = 0; i < targetWidth; i++) {
        const start = Math.floor(i * ratio)
        const end = Math.min(Math.ceil((i + 1) * ratio), oldColumns)
        const count = end - start

        // Always create new column to avoid reference issues
        const column = new Uint8Array(freqBins)
        if (count === 1) {
          // Single source column - copy data
          column.set(oldMatrix[start]!)
        } else {
          // Average multiple source columns
          for (let k = 0; k < freqBins; k++) {
            let sum = 0
            for (let j = start; j < end; j++) {
              sum += oldMatrix[j]![k]!
            }
            column[k] = Math.round(sum / count)
          }
        }
        newMatrix[i] = column
      }
    } else {
      // Upsampling with linear interpolation for quality
      for (let i = 0; i < targetWidth; i++) {
        const srcIndex = i * ratio
        const leftIndex = Math.floor(srcIndex)
        const rightIndex = Math.min(leftIndex + 1, oldColumns - 1)
        const weight = srcIndex - leftIndex

        const column = new Uint8Array(freqBins)

        if (weight === 0 || leftIndex === rightIndex) {
          // Exact match or at boundary - use nearest neighbor
          column.set(oldMatrix[leftIndex]!)
        } else {
          // Linear interpolation for better quality
          const leftColumn = oldMatrix[leftIndex]
          const rightColumn = oldMatrix[rightIndex]
          const invWeight = 1 - weight
          for (let k = 0; k < freqBins; k++) {
            column[k] = Math.round(leftColumn![k]! * invWeight + rightColumn![k]! * weight)
          }
        }
        newMatrix[i] = column
      }
    }

    return newMatrix
  }

  private fillImageDataQuality(
    data: Uint8ClampedArray,
    segmentPixels: Uint8Array[],
    segmentWidth: number,
    bitmapHeight: number,
  ): void {
    // High quality rendering - process all pixels
    for (let i = 0; i < segmentWidth; i++) {
      const column = segmentPixels[i]!
      for (let j = 0; j < bitmapHeight; j++) {
        const colorIndex = column[j]!
        const color = COLOR_LUT[colorIndex] ?? [0, 0, 0, 0]
        const pixelIndex = ((bitmapHeight - j - 1) * segmentWidth + i) * 4

        // Write RGBA values
        data[pixelIndex] = color[0]
        data[pixelIndex + 1] = color[1]
        data[pixelIndex + 2] = color[2]
        data[pixelIndex + 3] = color[3]
      }
    }
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const gray = Math.round(l * 255)
    return [gray, gray, gray]
  }

  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const hPrime = h / 60
  const secondComponent = chroma * (1 - Math.abs((hPrime % 2) - 1))
  const lightnessModifier = l - chroma / 2

  let rPrime = 0,
    gPrime = 0,
    bPrime = 0
  const hInt = Math.floor(hPrime)
  switch (hInt) {
    case 0:
      rPrime = chroma
      gPrime = secondComponent
      bPrime = 0
      break
    case 1:
      rPrime = secondComponent
      gPrime = chroma
      bPrime = 0
      break
    case 2:
      rPrime = 0
      gPrime = chroma
      bPrime = secondComponent
      break
    case 3:
      rPrime = 0
      gPrime = secondComponent
      bPrime = chroma
      break
    case 4:
      rPrime = secondComponent
      gPrime = 0
      bPrime = chroma
      break
    case 5:
      rPrime = chroma
      gPrime = 0
      bPrime = secondComponent
      break
    default:
      rPrime = 0
      gPrime = 0
      bPrime = 0
      break
  }

  const r = Math.round((rPrime + lightnessModifier) * 255)
  const g = Math.round((gPrime + lightnessModifier) * 255)
  const b = Math.round((bPrime + lightnessModifier) * 255)

  return [r, g, b]
}

function getIcyBlueColor(value: number): [number, number, number, number] {
  const v = Math.min(1, Math.max(0, value)) // clamp 0..1
  const h = ((v * -128 + 191) % 256) * (360 / 255)
  const s = Math.min(1, Math.max(0, (v * 128 + 127) / 255))
  const l = Math.min(1, Math.max(0, (v * 255) / 255))
  const [r, g, b] = hslToRgb(h, s, l)
  return [r, g, b, 255] // a = 255
}

export default SpectrogramPlugin
