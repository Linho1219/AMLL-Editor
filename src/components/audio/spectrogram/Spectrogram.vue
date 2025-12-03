<template>
  <div
    class="spectrogram-container"
    style="position: relative; overflow: hidden"
    ref="containerEl"
    :style="{ height: userSetContainerHeight + 'px' }"
    @wheel.prevent="handleWheel"
  >
    <canvas class="spectrogram-canvas" ref="canvasEl"></canvas>
  </div>
</template>

<script setup lang="ts">
import {
  shallowRef,
  computed,
  ref,
  watch,
  useTemplateRef,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'
import stableStringify from 'fast-json-stable-stringify'
import {
  useSpectrogramWorker,
  type TileEntry,
  type RequestTileParamsWithIndex,
} from './useSpectrogramWorker'
import { useStaticStore } from '@/stores/static'
import { generatePalette, getIcyBlueColor } from './colors'
import { useElementSize } from '@vueuse/core'
const { audio } = useStaticStore()

const userSetContainerHeight = ref(250)

const scrollLeft = ref(0)
const containerEl = useTemplateRef('containerEl')
const { width: containerWidth, height: containerHeight } = useElementSize(containerEl)
const scaleRatio = ref(2)
const MINSCALE = 1,
  MAXSCALE = 20

const clamper = (min: number, max: number) => (value: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}
const clampScale = clamper(MINSCALE, MAXSCALE)
const RATIO_STEP = 0.005
const detltaToRatio = (delta: number) => {
  delta *= RATIO_STEP
  const factor = delta < 0 ? 1 - delta : 1 / (1 + delta)
  return factor
}
function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey) {
    scrollLeft.value += event.deltaY
    if (scrollLeft.value < 0) scrollLeft.value = 0
    if (scrollLeft.value > maxScrollLeft.value) scrollLeft.value = maxScrollLeft.value
  } else {
    const oldScale = scaleRatio.value
    const newScale = clampScale(oldScale * detltaToRatio(event.deltaY))
    if (newScale === oldScale) return
    // adjust scrollLeft to keep the point under the cursor stationary
    if (!containerEl.value) return
    const rect = containerEl.value.getBoundingClientRect()
    if (!rect) return
    const cursorX = event.clientX - rect.left
    const cursorRatio = cursorX / rect.width
    const contentX = scrollLeft.value + cursorRatio * rect.width
    const newContentX = (contentX / oldScale) * newScale
    scrollLeft.value = newContentX - cursorRatio * rect.width
    if (scrollLeft.value < 0) scrollLeft.value = 0
    if (newScale < oldScale && scrollLeft.value > maxScrollLeft.value)
      scrollLeft.value = maxScrollLeft.value
    scaleRatio.value = newScale
  }
}
const maxScrollLeft = computed(() => {
  if (!audio.lengthComputed.value) return 0
  if (!containerWidth.value) return 0
  return (audio.lengthComputed.value / TILE_DURATION_MS) * tileWidth.value - containerWidth.value
})
const firstVisibleIndex = computed(() => Math.floor(scrollLeft.value / tileWidth.value))
const lastVisibleIndex = computed(() =>
  Math.ceil((scrollLeft.value + containerWidth.value) / tileWidth.value),
)

const TILE_DURATION_MS = 5000
const tileWidth = computed(() => Math.round(256 * scaleRatio.value))
const GAIN = 5.0

const paletteData = shallowRef(generatePalette(getIcyBlueColor))

// worker composable
const { batchRequestTiles, workerInitPromise } = useSpectrogramWorker(
  audio.audioBufferComputed,
  paletteData,
)

const canvasEl = useTemplateRef('canvasEl')
let revokeListeners: (() => void) | null = null
onMounted(async () => {
  if (!containerEl.value || !canvasEl.value) return
  nextTick(() => drawTiles())

  window.addEventListener('resize', drawTiles)
  const mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
  mq.addEventListener('change', drawTiles)
  revokeListeners = () => {
    window.removeEventListener('resize', drawTiles)
    mq.removeEventListener('change', drawTiles)
  }
})
onUnmounted(() => revokeListeners?.())

let tiles: { entry: TileEntry; index: number }[] = []
const obj2id = (obj: Object) => stableStringify(obj)
const VISIBLE_TILE_BUFFER = 0
watch([audio.audioBufferComputed, scrollLeft, scaleRatio], requestTiles, {
  immediate: true,
  flush: 'post',
})

async function requestTiles() {
  await workerInitPromise
  const requests = Array.from(
    {
      length: lastVisibleIndex.value - firstVisibleIndex.value + 2 * VISIBLE_TILE_BUFFER + 1,
    },
    (_, i) => {
      const index = firstVisibleIndex.value - VISIBLE_TILE_BUFFER + i
      const start = index * TILE_DURATION_MS
      if (start >= audio.lengthComputed.value) return null
      const end = start + TILE_DURATION_MS
      const clampedEnd = Math.min(end, audio.lengthComputed.value)
      const clampedWidth =
        clampedEnd !== end
          ? Math.ceil(tileWidth.value * ((clampedEnd - start) / TILE_DURATION_MS))
          : tileWidth.value
      const paramsWithoutId: Omit<RequestTileParamsWithIndex, 'id'> = {
        startTime: start,
        endTime: clampedEnd,
        gain: GAIN,
        tileWidthPx: clampedWidth,
        paletteId: 'default',
        index,
      }
      const id = obj2id(paramsWithoutId)
      return { ...paramsWithoutId, id }
    },
  ).filter((req): req is RequestTileParamsWithIndex => req !== null)
  tiles = await batchRequestTiles(requests)
  drawTiles()
}

function drawTiles() {
  if (!canvasEl.value || !containerEl.value) return
  const canvas = canvasEl.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = devicePixelRatio || 1
  const width = containerWidth.value
  const height = containerHeight.value
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.imageSmoothingEnabled = false
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)
  console.log('Drawing tiles', tiles.length)
  tiles.forEach(({ entry, index }) => {
    const x = index * tileWidth.value - scrollLeft.value
    ctx.drawImage(entry.bitmap, x, 0, tileWidth.value, containerHeight.value)
  })
}
watch([containerWidth, containerHeight], drawTiles)
</script>

<style>
.spectrogram-container {
  background: #000;
  position: relative;
  overflow: hidden;
}
.spectrogram-canvas {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
