<template>
  <div
    class="spectrogram-tile"
    :style="{
      left: `${props.left}px`,
      width: `${props.width}px`,
      height: `${props.height}px`,
    }"
  >
    <canvas ref="canvasRef" :width="props.canvasWidth" :height="props.canvasHeight"></canvas>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  left: number
  width: number
  height: number
  canvasWidth: number
  canvasHeight: number
  bitmap?: ImageBitmap | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const draw = () => {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || !props.bitmap) return

  ctx.clearRect(0, 0, props.canvasWidth, props.canvasHeight)
  ctx.drawImage(props.bitmap, 0, 0, props.canvasWidth, props.canvasHeight)
}

watch(
  [() => props.bitmap, () => props.canvasWidth, () => props.canvasHeight],
  () => nextTick(draw),
  { immediate: true },
)

onMounted(draw)
</script>

<style scoped>
.spectrogram-tile {
  position: absolute;
  top: 0;
  overflow: hidden;
  pointer-events: none;
  image-rendering: pixelated;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
