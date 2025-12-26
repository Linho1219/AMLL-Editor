<template>
  <RibbonGroup label="内容">
    <Button
      icon="pi pi-arrows-h"
      label="批量断字"
      size="small"
      :severity="
        runtimeStore.openedSidebars.includes(SidebarKey.SplitText) ? undefined : 'secondary'
      "
      @click="runtimeStore.toogleSidebar(SidebarKey.SplitText)"
      v-tooltip="
        tipDesc('批量断字', '打开批量断字侧边栏，将多行歌词文本拆分为音节。', 'batchSplitText')
      "
    />
    <Button
      icon="pi pi-info-circle"
      label="元数据"
      size="small"
      :severity="
        runtimeStore.openedSidebars.includes(SidebarKey.Metadata) ? undefined : 'secondary'
      "
      @click="runtimeStore.toogleSidebar(SidebarKey.Metadata)"
      v-tooltip="tipDesc('元数据', '打开元数据侧边栏，编辑歌词文件元数据。', 'metadata')"
    />
    <Button
      icon="pi pi-search"
      label="查找替换"
      size="small"
      :severity="findReplaceVisible ? undefined : 'secondary'"
      @click="findReplaceVisible = !findReplaceVisible"
      v-tooltip="tipDesc('查找替换', '打开查找替换对话框，在歌词中查找并替换文本。', 'find')"
    />
    <FindReplaceDialog v-model="findReplaceVisible" />
  </RibbonGroup>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useGlobalKeyboard } from '@core/hotkey'

import { useRuntimeStore } from '@states/stores'

import { tipDesc } from '@utils/generateTooltip'

import { SidebarKey } from '@ui/sidebar'

import RibbonGroup from '../RibbonGroupShell.vue'
import FindReplaceDialog from '@ui/dialogs/FindReplaceDialog.vue'
import { Button } from 'primevue'

const runtimeStore = useRuntimeStore()

useGlobalKeyboard('batchSplitText', () => {
  runtimeStore.toogleSidebar(SidebarKey.SplitText)
})
useGlobalKeyboard('metadata', () => {
  runtimeStore.toogleSidebar(SidebarKey.Metadata)
})

const findReplaceVisible = ref(false)
</script>
