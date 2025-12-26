<template>
  <RibbonGroup label="视图">
    <div class="kvgrid">
      <Checkbox
        inputId="ribbon-hlt-line-overlap"
        value="hlt-line-overlap"
        size="small"
        binary
        v-model="prefStore.hltLineTimeConflicts"
        disabled
      />
      <label for="ribbon-hlt-line-overlap">高亮行时间冲突</label>
      <Checkbox
        inputId="ribbon-hlt-syl-overlap"
        value="hlt-syl-overlap"
        size="small"
        binary
        v-model="prefStore.hltWordTimeConflicts"
        disabled
      />
      <label for="ribbon-hlt-syl-overlap">高亮音节时间冲突</label>
      <Checkbox
        inputId="ribbon-auto-scroll"
        value="auto-scroll"
        size="small"
        binary
        v-model="prefStore.scrollWithPlayback"
      />
      <label for="ribbon-auto-scroll">随播放自动滚动</label>
      <Checkbox
        inputId="ribbon-swap-translate-roman"
        value="swap-translate-roman"
        size="small"
        binary
        v-model="prefStore.swapTranslateRoman"
      />
      <label for="ribbon-swap-translate-roman">交换翻译音译框</label>
    </div>
  </RibbonGroup>
</template>

<script setup lang="ts">
import { usePrefStore } from '@states/stores'

import RibbonGroup from '../RibbonGroupShell.vue'
import { Checkbox } from 'primevue'

const prefStore = usePrefStore()
</script>
