import { type InjectionKey, type Ref, computed, inject, provide, ref } from 'vue'

/**
 * `SpectrogramContext` 用于在不同组件中统一管理和共享状态，并自动处理复杂的坐标转换
 */
export interface SpectrogramContext {
  /**
   * 横向滚动距离
   *
   * 表示当前视口左侧距离整个频谱图最左侧（0秒）有多少像素
   */
  scrollLeft: Ref<number>
  /**
   * 缩放层级
   *
   * 每秒钟占用多少像素，数值越大放得越大
   */
  zoom: Ref<number>
  /**
   * 可视容器宽度
   *
   * 浏览器中那个 div 的实际物理宽度
   */
  containerWidth: Ref<number>
  /**
   * 鼠标 X 坐标
   *
   * 相对于容器左侧的距离
   */
  mouseX: Ref<number>
  /**
   * 鼠标当前是否正悬停在容器上
   */
  isHovering: Ref<boolean>

  /**
   * 音频总时长
   */
  duration: Ref<number>

  /**
   * Spectrogram.vue 的内容层 div 宽度，用来产生滚动效果
   */
  totalContentWidth: Ref<number>
  /**
   * 视口起始时间
   *
   * 表示当前屏幕最左边对应的是音频的第几秒
   */
  viewStartTime: Ref<number>
  /**
   * 视口结束时间
   *
   * 表示当前屏幕最右边对应的是音频的第几秒
   */
  viewEndTime: Ref<number>
  /**
   * 鼠标指的是多少秒
   */
  hoverTime: Ref<number>
  /**
   * zoom 的别名
   * @see {@link zoom}
   */
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
