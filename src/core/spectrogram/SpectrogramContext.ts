import { type InjectionKey, type Ref, computed, inject, provide, ref } from 'vue'

export interface SpectrogramContext {
  scrollLeft: Ref<number>
  zoom: Ref<number>
  containerWidth: Ref<number>
  mouseX: Ref<number>
  isHovering: Ref<boolean>

  duration: Ref<number>

  totalContentWidth: Ref<number>
  viewStartTime: Ref<number>
  viewEndTime: Ref<number>
  hoverTime: Ref<number>
  pixelsPerSecond: Ref<number>
}

const SpectrogramContextKey: InjectionKey<SpectrogramContext> = Symbol('SpectrogramContext')

interface SpectrogramProviderOptions {
  audioBuffer: Ref<AudioBuffer | null>
}

export function useSpectrogramProvider({ audioBuffer }: SpectrogramProviderOptions) {
  const scrollLeft = ref(0)
  const zoom = ref(100)
  const containerWidth = ref(0)
  const mouseX = ref(0)
  const isHovering = ref(false)

  const duration = computed(() => audioBuffer.value?.duration || 0)

  const totalContentWidth = computed(() => duration.value * zoom.value)

  const viewStartTime = computed(() => {
    if (zoom.value === 0) return 0
    return scrollLeft.value / zoom.value
  })

  const viewEndTime = computed(() => {
    if (zoom.value === 0) return 0
    return (scrollLeft.value + containerWidth.value) / zoom.value
  })

  const hoverTime = computed(() => {
    // if (!isHovering.value) return -1
    if (zoom.value === 0) return 0
    const time = (scrollLeft.value + mouseX.value) / zoom.value
    return Math.max(0, Math.min(time, duration.value))
  })

  const context: SpectrogramContext = {
    scrollLeft,
    zoom,
    containerWidth,
    mouseX,
    isHovering,
    duration,
    totalContentWidth,
    viewStartTime,
    viewEndTime,
    hoverTime,
    pixelsPerSecond: zoom,
  }

  provide(SpectrogramContextKey, context)

  return context
}

export function useSpectrogramContext() {
  const context = inject(SpectrogramContextKey)
  if (!context) {
    throw new Error('useSpectrogramContext must be used within a Spectrogram provider')
  }
  return context
}
