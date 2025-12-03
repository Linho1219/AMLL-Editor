<template>
  <div
    class="spectrogram-container"
    style="position: relative; overflow: hidden"
    ref="containerEl"
    :style="{ height: props.height + 'px' }"
    @wheel="handleWheel"
  >
    <div class="spectrogram-scroller" :style="{ transform: `translateX(${-scrollLeft}px)` }">
      <Tile
        v-for="(tile, index) in tiles"
        :key="index"
        :tile="tile"
        :left="index * TILE_WIDTH_PX"
        :height="props.height"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef, computed, ref, watch, useTemplateRef } from 'vue'
import Tile from './Tile.vue'
import stringify from 'fast-json-stable-stringify'
import {
  useSpectrogramWorker,
  type TileEntry,
  type RequestTileParams,
} from './useSpectrogramWorker'
import { useStaticStore } from '@/stores/static'
import { generatePalette, getIcyBlueColor } from './colors'
import { useElementSize } from '@vueuse/core'
const { audio } = useStaticStore()

const props = defineProps<{
  height: number
}>()
const scrollLeft = ref(0)
const containerEl = useTemplateRef('containerEl')
const { width: containerWidth } = useElementSize(containerEl)

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  scrollLeft.value += event.deltaY
  // clamp
  if (scrollLeft.value < 0) {
    scrollLeft.value = 0
  }
}
const scrollLeftEnd = computed(() => scrollLeft.value + containerWidth.value)
const firstVisibleTileIndex = computed(() => Math.floor(scrollLeft.value / TILE_WIDTH_PX))
const lastVisibleTileIndex = computed(() => Math.ceil(scrollLeftEnd.value / TILE_WIDTH_PX))

// ======== temporary constants ========
const TILE_DURATION_S = 5
const TILE_WIDTH_PX = 512
const GAIN = 5.0

const paletteData = shallowRef(generatePalette(getIcyBlueColor))

// worker composable
const { tileCache, requestTileIfNeeded, workerInitPromise } = useSpectrogramWorker(
  audio.audioBufferComputed,
  paletteData,
)

// ---- 预生成 5 个 tile ----
const tileCount = 5
const obj2id = (obj: Object) => stringify(obj)

const tileRequests = computed((): RequestTileParams[] => {
  return Array.from({ length: tileCount }, (_, i) => {
    const start = i * TILE_DURATION_S
    const end = start + TILE_DURATION_S

    const paramsWithoutId: Omit<RequestTileParams, 'id'> = {
      startTime: start,
      endTime: end,
      gain: GAIN,
      tileWidthPx: TILE_WIDTH_PX,
      paletteId: 'default',
    }
    const id = obj2id(paramsWithoutId)
    return { ...paramsWithoutId, id }
  })
})

const tiles = ref<TileEntry[]>([])
watch(
  tileRequests,
  async () => {
    await workerInitPromise
    console.log('Requesting tiles')
    tileRequests.value.forEach((params) => {
      requestTileIfNeeded(params)
    })
  },
  { immediate: true },
)
tileCache.onSet(() => {
  console.log('Tile cache updated')
  tiles.value = tileRequests.value
    .map((r) => tileCache.get(r.id))
    .filter((x): x is TileEntry => !!x)
})
</script>

<style>
.spectrogram-container {
  background: #000;
}
</style>
