<template>
  <RibbonGroup label="标记" more>
    <Button
      icon="pi pi-bookmark"
      :label="bookmarkAdd ? '添加书签' : '移除书签'"
      :disabled="actionDisabled"
      size="small"
      severity="secondary"
      @click="bookmarkClick"
      v-tooltip="
        tipDesc(
          bookmarkAdd ? '添加书签' : '移除书签',
          '在选定行或音节上添加或移除书签。书签可以用于标记重要的部分，且不会导出到歌词文件中。',
          'bookmark',
        )
      "
    />
    <Button icon="pi pi-comment" label="添加批注" size="small" disabled severity="secondary" />
    <Button
      icon="pi pi-eraser"
      label="移除全部"
      size="small"
      severity="secondary"
      @click="removeAllMarks"
      v-tooltip="tipDesc('移除全部', '移除全文所有行和音节的书签与批注。您可以稍后撤销。')"
    />
  </RibbonGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useGlobalKeyboard } from '@core/hotkey'

import { useCoreStore, useRuntimeStore } from '@states/stores'

import { tipDesc } from '@utils/generateTooltip'

import RibbonGroup from '../RibbonGroupShell.vue'
import { Button } from 'primevue'

const runtimeStore = useRuntimeStore()

const focusingSet = computed(() =>
  runtimeStore.selectedSyllables.size > 0
    ? runtimeStore.selectedSyllables
    : runtimeStore.selectedLines,
)
const bookmarkAdd = computed(
  () => actionDisabled.value || [...focusingSet.value].some((item) => !item.bookmarked),
)
function bookmarkClick() {
  if (bookmarkAdd.value) focusingSet.value.forEach((item) => (item.bookmarked = true))
  else focusingSet.value.forEach((item) => (item.bookmarked = false))
}
const actionDisabled = computed(
  () => !runtimeStore.selectedLines.size && !runtimeStore.selectedSyllables.size,
)
useGlobalKeyboard('bookmark', () => bookmarkClick())

const coreStore = useCoreStore()
function removeAllMarks() {
  coreStore.lyricLines.forEach((line) => {
    line.bookmarked = false
    line.syllables.forEach((syl) => (syl.bookmarked = false))
  })
}
</script>
