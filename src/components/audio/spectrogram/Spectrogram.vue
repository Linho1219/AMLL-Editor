<template>
  <div class="spectrogram-comp">
    <div class="spectrogram-toolbar">
      <Slider
        orientation="vertical"
        v-model="userGain"
        :min="MINUSERGAIN"
        :max="MAXUSERGAIN"
        :step="0.05"
      />
    </div>
    <div
      class="spectrogram-container"
      style="position: relative; overflow: hidden"
      ref="containerEl"
      :style="{ height: userSetContainerHeight + 'px' }"
      @wheel.prevent="handleWheel"
    >
      <canvas class="spectrogram-canvas" ref="canvasEl"></canvas>
    </div>
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
import { Slider } from 'primevue'
import { nanoid } from 'nanoid'
const { audio } = useStaticStore()

const userSetContainerHeight = ref(250)

const containerEl = useTemplateRef('containerEl')
const { width: containerWidth, height: containerHeight } = useElementSize(containerEl)
const halfContainerWidth = computed(() => containerWidth.value / 2)

const scaleRatio = ref(0.5)
const MINSCALE = 0.25
const MAXSCALE = 8

const userGain = ref(0.5)
const MINUSERGAIN = 0.1
const MAXUSERGAIN = 1.2
const gain = computed(() => userGain.value ** 2 * 10)

const TILE_DURATION_MS = 5000
const baseTileWidth = 1024
const maxTileWidth = baseTileWidth * MAXSCALE
const vTileWidth = computed(() => Math.round(baseTileWidth * scaleRatio.value))
const vTileWidthPerMs = computed(() => vTileWidth.value / TILE_DURATION_MS)

const scrollCenter = computed(() => audio.amendedProgressComputed.value * vTileWidthPerMs.value)

const clamper = (min: number, max: number) => (value: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}
const clampScale = clamper(MINSCALE, MAXSCALE)
const clampUserGain = clamper(MINUSERGAIN, MAXUSERGAIN)
const RATIO_STEP = 0.005
const detltaToRatio = (delta: number) => {
  delta *= RATIO_STEP
  const factor = delta < 0 ? 1 - delta : 1 / (1 + delta)
  return factor
}

let zoomAccum = 0
const ZOOMACCUMTHRES = 25
function handleWheel(event: WheelEvent) {
  if (event.ctrlKey) {
    let deltaY = event.deltaY
    if (Math.abs(event.deltaY) > ZOOMACCUMTHRES) zoomAccum = 0
    else {
      zoomAccum += event.deltaY
      if (Math.abs(zoomAccum) < ZOOMACCUMTHRES) return
      deltaY = zoomAccum * 3
      zoomAccum = 0
    }
    const newScale = clampScale(scaleRatio.value * detltaToRatio(deltaY))
    scaleRatio.value = newScale
  } else if (event.shiftKey) {
    userGain.value = clampUserGain(userGain.value + (event.deltaY > 0 ? -0.05 : 0.05))
  } else {
    zoomAccum = 0
    const delta = event.deltaX || event.deltaY
    audio.seekBy(delta / vTileWidthPerMs.value)
  }
}

const firstVisibleIndex = computed(() =>
  Math.floor((scrollCenter.value - halfContainerWidth.value) / vTileWidth.value),
)
const lastVisibleIndex = computed(() =>
  Math.ceil((scrollCenter.value + halfContainerWidth.value) / vTileWidth.value),
)

const paletteData = shallowRef(generatePalette(getIcyBlueColor))

// worker composable
const { batchRequestTiles } = useSpectrogramWorker(audio.audioBufferComputed, paletteData)

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
watch([audio.audioBufferComputed, audio.amendedProgressComputed, scaleRatio, gain], requestTiles)
onMounted(requestTiles)

let currentRequestId = ''
async function requestTiles() {
  const reqId = nanoid()
  currentRequestId = reqId
  const expectedTileWidth = scaleRatio.value > 1 ? maxTileWidth : baseTileWidth
  const requests = Array.from(
    {
      length: lastVisibleIndex.value - firstVisibleIndex.value + 2 * VISIBLE_TILE_BUFFER + 1,
    },
    (_, i) => {
      const index = firstVisibleIndex.value - VISIBLE_TILE_BUFFER + i
      const start = index * TILE_DURATION_MS
      if (start < 0 || start >= audio.lengthComputed.value) return null
      const end = start + TILE_DURATION_MS
      const clampedEnd = Math.min(end, audio.lengthComputed.value)
      const clampedWidth =
        clampedEnd !== end
          ? Math.ceil(expectedTileWidth * ((clampedEnd - start) / TILE_DURATION_MS))
          : expectedTileWidth
      const paramsWithoutId: Omit<RequestTileParamsWithIndex, 'id'> = {
        startTime: start,
        endTime: clampedEnd,
        gain: gain.value,
        tileWidthPx: clampedWidth,
        paletteId: 'default',
        index,
      }
      const id = obj2id(paramsWithoutId)
      return { ...paramsWithoutId, id }
    },
  ).filter((req): req is RequestTileParamsWithIndex => req !== null)
  const requestedTiles = await batchRequestTiles(requests)
  if (!requestedTiles) return
  if (currentRequestId !== reqId) return
  tiles = requestedTiles
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
  canvas.width = Math.ceil(width * dpr)
  canvas.height = Math.ceil(height * dpr)
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)
  tiles.forEach(({ entry, index }) => {
    const x = index * vTileWidth.value - (scrollCenter.value - halfContainerWidth.value)
    ctx.drawImage(entry.bitmap, x, 0, vTileWidth.value, containerHeight.value)
  })
}
watch([containerWidth, containerHeight], drawTiles)
</script>

<style>
.spectrogram-comp {
  display: flex;
}
.spectrogram-toolbar {
  width: 2.5rem;
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}
.spectrogram-container {
  width: 0;
  flex: 1;
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
