<template>
  <div
    class="spectrogram-container"
    style="position: relative; overflow: hidden"
    :style="{ height: props.height + 'px' }"
  >
    <Tile
      v-for="(tile, index) in tiles"
      :key="index"
      :tile="tile"
      :left="index * TILE_WIDTH_PX"
      :height="props.height"
    />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, computed, watchEffect, ref, watch } from 'vue'
import Tile from './Tile.vue'
import {
  useSpectrogramWorker,
  type TileEntry,
  type RequestTileParams,
} from './useSpectrogramWorker'
import { useStaticStore } from '@/stores/static'
import { generatePalette, getIcyBlueColor } from './colors'
const { audio } = useStaticStore()

const props = defineProps<{
  height: number
}>()

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

const tileRequests = computed(() => {
  return Array.from({ length: tileCount }, (_, i) => {
    const start = i * TILE_DURATION_S
    const end = start + TILE_DURATION_S

    return {
      reqId: start,
      startTime: start,
      endTime: end,
      gain: GAIN,
      tileWidthPx: TILE_WIDTH_PX,
      paletteId: 'default',
    } satisfies RequestTileParams
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
    .map((r) => tileCache.get(r.reqId))
    .filter((x): x is TileEntry => !!x)
})
</script>

<style>
.spectrogram-container {
  background: #000;
}
</style>
