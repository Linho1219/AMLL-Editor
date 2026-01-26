<template>
  <canvas class="spectrogram-ruler" ref="canvasEl"></canvas>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { nextTick, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

import { ms2strShort } from '@utils/formatTime'

const props = defineProps<{
  zoom: number
  scrollLeft: number
  duration: number
  width: number
}>()

const RULER_HEIGHT = 30
const TICK_INTERVALS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

function getTickInterval(zoom: number) {
  const minPxPerTick = 50
  const minSecondsPerTick = minPxPerTick / zoom
  const majorInterval =
    TICK_INTERVALS.find((i) => i >= minSecondsPerTick) || TICK_INTERVALS[TICK_INTERVALS.length - 1]!
  const ratio = majorInterval > 2 ? 5 : 2
  return {
    major: majorInterval,
    ratio,
    minor: majorInterval / ratio,
  }
}

const canvasEl = useTemplateRef('canvasEl')

const isDark = useDark()
const textOpacity = 0.5
const markOpacity = 0.3
const markFontSize = 12
const textOffsetY = 13
const majorMarkHeight = 8
const minorMarkHeight = 5
const strokeWidth = 1
const giveColor = (opacity: number) => {
  return isDark.value ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`
}

let canvasReady = false
let fontFamily = ''
let revokeListeners: (() => void) | null = null

onMounted(async () => {
  await document.fonts.ready
  if (!canvasEl.value) return
  fontFamily = getComputedStyle(canvasEl.value).fontFamily
  canvasReady = true
  nextTick(() => drawRuler())

  const mq = matchMedia(`(resolution: ${devicePixelRatio}dppx)`)
  mq.addEventListener('change', drawRuler)
  revokeListeners = () => {
    mq.removeEventListener('change', drawRuler)
  }
})
onUnmounted(() => revokeListeners?.())
watch(
  [() => props.scrollLeft, () => props.zoom, () => props.duration, () => props.width, isDark],
  () => drawRuler(),
)

let cachedDPR = -1
let cachedWidth = -1
function drawRuler() {
  if (!canvasReady) return
  const canvas = canvasEl.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const width = props.width * dpr
  const height = RULER_HEIGHT * dpr
  const lineWidth = Math.ceil(strokeWidth * dpr)

  if (cachedDPR !== dpr || cachedWidth !== props.width) {
    canvas.style.width = `${props.width}px`
    canvas.style.height = `${RULER_HEIGHT}px`
    canvas.width = width
    canvas.height = height
    cachedDPR = dpr
    cachedWidth = props.width
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  const textColor = giveColor(textOpacity)
  const lineColor = giveColor(markOpacity)

  ctx.fillStyle = textColor
  ctx.strokeStyle = lineColor
  ctx.textAlign = 'center'
  ctx.font = `${markFontSize * dpr}px ${fontFamily}`
  ctx.lineWidth = lineWidth

  const { major, minor, ratio } = getTickInterval(props.zoom)

  const startTime = props.scrollLeft / props.zoom
  const endTime = (props.scrollLeft + props.width) / props.zoom
  const firstMajorTick = Math.floor(startTime / major) * major
  const minorTimes: number[] = []
  const majorTimes: number[] = []
  for (let t = firstMajorTick; t <= endTime + major; t += major) {
    majorTimes.push(t)
    for (let i = 1; i < ratio; i++) minorTimes.push(t + i * minor)
  }

  ctx.beginPath()
  for (const time of majorTimes) {
    if (time < 0 || time > props.duration) continue
    const x = (time * props.zoom - props.scrollLeft) * dpr
    ctx.moveTo(x, height - majorMarkHeight * dpr)
    ctx.lineTo(x, height)
    const label = ms2strShort(Math.round(time * 1000))
    ctx.fillText(label, x, height - textOffsetY * dpr)
  }
  ctx.stroke()
  ctx.beginPath()
  for (const time of minorTimes) {
    const x = (time * props.zoom - props.scrollLeft) * dpr
    ctx.moveTo(x, height - minorMarkHeight * dpr)
    ctx.lineTo(x, height)
  }
  ctx.stroke()
}
</script>
