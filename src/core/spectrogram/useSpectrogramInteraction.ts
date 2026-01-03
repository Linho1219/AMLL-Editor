import { useResizeObserver } from '@vueuse/core'
import { type Ref, computed, onUnmounted, ref, watch } from 'vue'

interface UseSpectrogramInteractionOptions {
  containerEl: Ref<HTMLElement | null>
  audioBuffer: Ref<AudioBuffer | null>
}

const MIN_ZOOM = 10
const MAX_ZOOM = 1000
const ZOOM_SENSITIVITY = 1.15
const SMOOTHING_FACTOR = 0.27

export function useSpectrogramInteraction({
  containerEl,
  audioBuffer,
}: UseSpectrogramInteractionOptions) {
  const containerWidth = ref(0)
  const scrollLeft = ref(0)
  const targetScrollLeft = ref(0)
  const zoom = ref(100)
  const targetZoom = ref(100)

  let scrollAnimId = 0
  let zoomAnimId = 0

  let zoomAnchorTime = 0
  let zoomAnchorMouseX = 0

  const totalContentWidth = computed(() => {
    const duration = audioBuffer.value?.duration || 0
    return duration * zoom.value
  })

  useResizeObserver(containerEl, (entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width } = entry.contentRect
    containerWidth.value = width
  })

  const startSmoothScroll = () => {
    cancelAnimationFrame(scrollAnimId)
    cancelAnimationFrame(zoomAnimId)

    const step = () => {
      const diff = targetScrollLeft.value - scrollLeft.value
      if (Math.abs(diff) < 0.5) {
        scrollLeft.value = targetScrollLeft.value
        return
      }
      scrollLeft.value += diff * SMOOTHING_FACTOR
      scrollAnimId = requestAnimationFrame(step)
    }
    step()
  }

  const startSmoothZoom = () => {
    cancelAnimationFrame(zoomAnimId)
    cancelAnimationFrame(scrollAnimId)

    const step = () => {
      const diff = targetZoom.value - zoom.value

      if (Math.abs(diff) < 0.1) {
        zoom.value = targetZoom.value
        const finalScroll = zoomAnchorTime * zoom.value - zoomAnchorMouseX
        scrollLeft.value = Math.max(0, finalScroll)
        targetScrollLeft.value = scrollLeft.value
        return
      }

      zoom.value += diff * SMOOTHING_FACTOR

      const newScroll = zoomAnchorTime * zoom.value - zoomAnchorMouseX

      const maxScroll = Math.max(
        0,
        (audioBuffer.value?.duration || 0) * zoom.value - containerWidth.value,
      )
      const clampedScroll = Math.max(0, Math.min(newScroll, maxScroll))

      scrollLeft.value = clampedScroll
      targetScrollLeft.value = clampedScroll

      zoomAnimId = requestAnimationFrame(step)
    }

    step()
  }

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      if (!containerEl.value) return
      const rect = containerEl.value.getBoundingClientRect()
      const mouseX = e.clientX - rect.left

      const timeAtCursor = (scrollLeft.value + mouseX) / zoom.value

      zoomAnchorTime = timeAtCursor
      zoomAnchorMouseX = mouseX

      let newTarget = targetZoom.value
      if (e.deltaY < 0) {
        newTarget *= ZOOM_SENSITIVITY
      } else {
        newTarget /= ZOOM_SENSITIVITY
      }

      newTarget = Math.max(MIN_ZOOM, Math.min(newTarget, MAX_ZOOM))

      if (newTarget !== targetZoom.value) {
        targetZoom.value = newTarget
        startSmoothZoom()
      }
    } else {
      let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (e.shiftKey && delta === 0) delta = e.deltaY

      const maxScroll = Math.max(0, totalContentWidth.value - containerWidth.value)
      const newTarget = targetScrollLeft.value + delta

      targetScrollLeft.value = Math.max(0, Math.min(newTarget, maxScroll))

      startSmoothScroll()
    }
  }

  onUnmounted(() => {
    cancelAnimationFrame(scrollAnimId)
    cancelAnimationFrame(zoomAnimId)
  })

  watch(audioBuffer, () => {
    scrollLeft.value = 0
    targetScrollLeft.value = 0
    zoom.value = 100
    targetZoom.value = 100
    cancelAnimationFrame(scrollAnimId)
    cancelAnimationFrame(zoomAnimId)
  })

  return {
    containerWidth,
    scrollLeft,
    zoom,
    totalContentWidth,
    handleWheel,
  }
}
