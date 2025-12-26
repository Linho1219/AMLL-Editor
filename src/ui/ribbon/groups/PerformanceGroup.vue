<template>
  <RibbonGroup label="性能">
    <div class="perfgrid" v-if="isSupported && memory">
      <span>已使用</span>
      <span class="perfvalue monospace">{{ size(memory.usedJSHeapSize) }}</span>
      <span>已分配</span>
      <span class="perfvalue monospace">{{ size(memory.totalJSHeapSize) }}</span>
      <span>帧速率</span>
      <span class="perfvalue monospace">{{ fps }} FPS</span>
    </div>
  </RibbonGroup>
</template>

<script setup lang="ts">
import { useFps, useMemory } from '@vueuse/core'

import RibbonGroup from '../RibbonGroupShell.vue'

const fps = useFps()

function size(v: number) {
  const kb = v / 1024 / 1024
  return `${kb.toFixed(2)} MB`
}
const { isSupported, memory } = useMemory()
</script>

<style lang="scss">
.perfgrid {
  display: grid;
  grid-template-columns: auto auto;
  text-align: right;
  align-items: center;
  justify-items: stretch;
  row-gap: 0.3rem;
  column-gap: 0.5rem;
}
.perfvalue {
  width: 9ch;
}
</style>
