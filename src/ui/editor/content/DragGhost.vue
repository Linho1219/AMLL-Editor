<template>
  <div
    class="drag-ghost"
    :style="{
      transform: `translate(${pointerX}px, ${pointerY}px)`,
      visibility: !pointerX && !pointerY ? 'hidden' : 'visible',
    }"
    :class="{ nodrop: !runtimeStore.canDrop }"
  >
    <i class="drag-ghost-icon pi" :class="dragIcon"></i>
    &ZeroWidthSpace;
    <template v-if="runtimeStore.canDrop">
      <span class="drag-ghost-text">{{ dragText }}</span>
      <span class="drag-ghost-count" v-if="dragCount > 1">{{ dragCount }}</span>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useRuntimeStore } from '@states/stores'

const pointerX = ref(0)
const pointerY = ref(0)
const runtimeStore = useRuntimeStore()
const dragCount = computed(() =>
  runtimeStore.isDraggingLine
    ? runtimeStore.selectedLines.size
    : runtimeStore.selectedSyllables.size,
)
const dragText = computed(
  () =>
    (runtimeStore.isDraggingCopy ? '复制' : '移动') + (runtimeStore.isDraggingLine ? '行' : '音节'),
)
const dragIcon = computed(() => {
  if (!runtimeStore.canDrop) return 'pi-ban'
  return runtimeStore.isDraggingCopy ? 'pi-clone' : 'pi-arrow-right'
})

const handleMouseMove = (e: MouseEvent) => {
  pointerX.value = e.pageX
  pointerY.value = e.pageY
}
onMounted(() => {
  window.addEventListener('dragover', handleMouseMove)
})
onUnmounted(() => {
  window.removeEventListener('dragover', handleMouseMove)
})
</script>

<style lang="scss">
.drag-ghost {
  position: fixed;
  top: 0.5rem;
  left: 0.8rem;
  will-change: transform;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  display: flex;
  align-items: center;
  z-index: 9999;

  font-size: 1.2rem;
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  opacity: 0.8;
  &.nodrop {
    background-color: var(--p-button-secondary-hover-background);
    color: var(--p-button-secondary-color);
  }
}
.drag-ghost-text {
  margin-left: 0.4rem;
}
.drag-ghost-count {
  border: currentColor 1px solid;
  padding: 0.15rem 0.3rem;
  margin-left: 0.4rem;
  font-size: 0.9rem;
  border-radius: 0.2rem;
  line-height: 0.9;
  font-family: var(--font-monospace);
  font-weight: bold;
}
</style>
