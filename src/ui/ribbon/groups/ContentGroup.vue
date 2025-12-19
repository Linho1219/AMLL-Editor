<template>
  <RibbonGroup label="内容">
    <Button
      icon="pi pi-arrows-h"
      label="批量断词"
      size="small"
      :severity="
        runtimeStore.openedSidebars.includes(SidebarKey.SplitText) ? undefined : 'secondary'
      "
      @click="runtimeStore.toogleSidebar(SidebarKey.SplitText)"
      v-tooltip="
        tipDesc('批量断词', '打开批量断词侧边栏，将多行歌词文本拆分为词。', 'batchSplitText')
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
import { Button } from 'primevue'
import RibbonGroup from '../RibbonGroupShell.vue'
import { SidebarKey } from '@ui/sidebar'
import { useGlobalKeyboard } from '@core/hotkey'
import { tipDesc } from '@utils/tooltip'
import FindReplaceDialog from '@ui/dialogs/FindReplaceDialog.vue'
import { ref } from 'vue'
import { useRuntimeStore } from '@states/stores'
const runtimeStore = useRuntimeStore()

useGlobalKeyboard('batchSplitText', () => {
  runtimeStore.toogleSidebar(SidebarKey.SplitText)
})
useGlobalKeyboard('metadata', () => {
  runtimeStore.toogleSidebar(SidebarKey.Metadata)
})

const findReplaceVisible = ref(false)
</script>
