<template>
  <div
    class="spectrogram-tile"
    :style="{
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    }"
  >
    <canvas ref="canvasRef" :width="canvasWidth" :height="height"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{
  left: number
  width: number
  height: number
  canvasWidth: number
  bitmap?: ImageBitmap | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const draw = () => {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || !props.bitmap) return

  ctx.clearRect(0, 0, props.canvasWidth, props.height)
  ctx.drawImage(props.bitmap, 0, 0)
}

watch(() => props.bitmap, draw)
onMounted(draw)
</script>

<style scoped>
.spectrogram-tile {
  position: absolute;
  top: 0;
  overflow: hidden;
  pointer-events: none;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
