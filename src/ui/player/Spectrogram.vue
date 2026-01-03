<template>
  <div
    class="spectrogram-container"
    ref="containerEl"
    @wheel.prevent="handleWheel"
    @mousemove="handleMouseMove"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    :style="{ height: ctx.displayHeight.value + 'px' }"
  >
    <div class="resize-handle" v-bind="resizeHandleProps">
      <div class="handle-bar"></div>
    </div>

    <div
      class="spectrogram-content"
      :style="{
        width: `${ctx.totalContentWidth.value}px`,
        transform: `translate3d(${-Math.round(ctx.scrollLeft.value)}px, 0, 0)`,
      }"
    >
      <SpectrogramTile v-for="tile in visibleTiles" :key="tile.id" v-bind="tile" />
    </div>

    <EmptyTip
      v-if="!audioEngine.audioBuffer"
      icon="pi pi-volume-off"
      title="没有音频数据"
      tip="加载音频文件后将渲染频谱图"
      compact
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { audioEngine } from '@core/audio/index.ts'
import { useSpectrogramProvider } from '@core/spectrogram/SpectrogramContext'
import { useSpectrogramInteraction } from '@core/spectrogram/useSpectrogramInteraction'
import { useSpectrogramResize } from '@core/spectrogram/useSpectrogramResize'
import { useSpectrogramTiles } from '@core/spectrogram/useSpectrogramTiles'

import SpectrogramTile from './SpectrogramTile.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'

const containerEl = ref<HTMLElement | null>(null)
const audioBufferRef = computed(() => audioEngine.audioBuffer)

// 初始化 Context 状态源
const ctx = useSpectrogramProvider({ audioBuffer: audioBufferRef })

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
    if (!isResizing.value) {
      ctx.renderHeight.value = h
    }
  },
  { immediate: true },
)

watch(isResizing, (resizing) => {
  if (!resizing) {
    ctx.renderHeight.value = ctx.displayHeight.value
  }
})

// 获取瓦片
const { visibleTiles } = useSpectrogramTiles({
  ctx,
  audioBuffer: audioBufferRef,
})
</script>

<style lang="scss" scoped>
.spectrogram-container {
  width: 100%;
  flex: none;
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

.resize-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 18px;
  z-index: 100;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover,
  &:active {
    background-color: rgba(255, 255, 255, 0.1);

    .handle-bar {
      background-color: var(--p-primary-color);
    }
  }
  :root:has(&:active) * {
    cursor: ns-resize;
  }

  .handle-bar {
    width: 40px;
    height: 3px;
    border-radius: 2px;
    background-color: rgba(255, 255, 255, 0.2);
    transition: background-color 0.2s;
  }
}
</style>
