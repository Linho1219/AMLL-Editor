<template>
  <div class="spectrogram-toolkit">
    <div class="spectrogram-resize-handle" v-bind="resizeHandleProps"></div>
    <div class="spectrogram-slider">
      <Button icon="pi pi-arrow-right-arrow-left" severity="secondary" />
      <Slider orientation="vertical" :min="0.5" :max="8" :step="0.5" v-model="gainModel" />
    </div>
    <div
      class="spectrogram-ruler-container"
      @wheel.prevent="handleWheel"
      @mousemove="handleMouseMove"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <Ruler
        :zoom="ctx.zoom.value"
        :scrollLeft="ctx.scrollLeft.value"
        :duration="audioEngine.lengthComputed.value / 1000"
        :width="containerWidth"
      />
      <div
        class="spectrogram-container"
        ref="containerEl"
        :style="{ height: ctx.displayHeight.value + 'px' }"
      >
        <div
          class="spectrogram-content"
          :style="{
            width: `${ctx.totalContentWidth.value}px`,
            transform: `translate3d(${-Math.round(ctx.scrollLeft.value)}px, 0, 0)`,
          }"
        >
          <Tile v-for="tile in visibleTiles" :key="tile.id" v-bind="tile" />
        </div>

        <EmptyTip
          v-if="!audioEngine.audioBuffer"
          icon="pi pi-volume-off"
          :title="tt.emptyTip.title()"
          :tip="tt.emptyTip.detail()"
          compact
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { useElementSize } from '@vueuse/core'
import { ref, watch } from 'vue'

import { audioEngine } from '@core/audio/index.ts'
import { useSpectrogramProvider } from '@core/spectrogram/SpectrogramContext'
import { generatePalette, getIcyBlueColor } from '@core/spectrogram/colors'
import { useSpectrogramInteraction } from '@core/spectrogram/useSpectrogramInteraction'
import { useSpectrogramResize } from '@core/spectrogram/useSpectrogramResize'
import { useSpectrogramTiles } from '@core/spectrogram/useSpectrogramTiles'

import Ruler from './Ruler.vue'
import Tile from './Tile.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'
import { Button, Slider } from 'primevue'

const tt = t.spectrogram

const containerEl = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(containerEl)
const { audioBufferComputed } = audioEngine

const [gainModel] = defineModel<number>('gain', { default: 3.0 })
const [zoomModel] = defineModel<number>('zoom', { default: 100 })
const [scrollLeftModel] = defineModel<number>('scrollLeft', { default: 0 })
const [paletteModel] = defineModel<Uint8Array>('palette', {
  default: generatePalette(getIcyBlueColor),
})

// 初始化 Context 状态源
const ctx = useSpectrogramProvider({
  audioBufferComputed,
  gainModel,
  zoomModel,
  scrollLeftModel,
  paletteModel,
})

// 初始化交互相关
const { handleWheel, handleMouseMove, handleMouseEnter, handleMouseLeave } =
  useSpectrogramInteraction({
    ctx,
    containerEl,
  })

// 高度调整相关
const {
  height: resizedHeight,
  isResizing,
  resizeHandleProps,
} = useSpectrogramResize({
  initialHeight: 240,
  minHeight: 120,
  maxHeight: 600,
})

// 拖拽调整高度时只修改 CSS 高度，停止拖拽时再更新渲染分辨率以避免每帧重渲染的性能问题
watch(
  resizedHeight,
  (h) => {
    ctx.displayHeight.value = h
    if (!isResizing.value) ctx.renderHeight.value = h
  },
  { immediate: true },
)

watch(isResizing, (resizing) => {
  if (!resizing) ctx.renderHeight.value = ctx.displayHeight.value
})

// 获取瓦片
const { visibleTiles } = useSpectrogramTiles({
  ctx,
  audioBuffer: audioBufferComputed,
})
</script>

<style lang="scss">
.spectrogram-toolkit {
  display: flex;
  position: relative;
  align-items: stretch;
}

.spectrogram-ruler-container {
  position: relative;
  width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.spectrogram-ruler {
  font-family: var(--font-monospace);
}

.spectrogram-container {
  min-height: 120px;
  position: relative;
  overflow: hidden;
  contain: strict;
}

.spectrogram-content {
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.spectrogram-resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0.3rem;
  background-color: var(--p-primary-color);
  z-index: 3;
  opacity: 0;
  transition: opacity 0.1s;
  &:hover {
    opacity: 0.7;
    transition-delay: 0.3s;
  }
  &:active {
    opacity: 0.7;
    transition: opacity 0.1s;
  }
  &,
  :root:has(&:active) * {
    cursor: ns-resize !important;
  }
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: -0.3rem;
    left: 0;
  }
}

.spectrogram-slider {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  gap: 0.5rem;
  align-items: center;
  .p-slider.p-slider {
    min-height: 0;
    flex: 1;
    margin: 0.8rem 0;
  }
}
</style>
