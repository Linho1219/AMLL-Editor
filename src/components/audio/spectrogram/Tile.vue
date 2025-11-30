<template>
  <canvas
    ref="canvasRef"
    class="spectrogram-tile"
    :style="{
      position: 'absolute',
      top: '0',
      left: left + 'px',
    }"
  />
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import type { TileEntry } from './useSpectrogramWorker'

const props = defineProps<{
  tile: TileEntry
  left: number
  height: number
}>()

const canvasRef = useTemplateRef('canvasRef')

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const { bitmap, width } = props.tile

  canvas.width = width
  canvas.height = props.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
}

onMounted(draw)
watch(() => props.tile.bitmap, draw)
</script>

<style>
.spectrogram-tile {
  image-rendering: pixelated;
}
</style>
