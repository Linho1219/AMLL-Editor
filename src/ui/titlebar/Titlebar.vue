<template>
  <header class="titlebar">
    <div class="leftbar">
      <Button
        label="打开"
        icon="pi pi-folder-open"
        severity="secondary"
        @click="(e) => openMenu?.toggle(e)"
        v-tooltip="tipHotkey('打开或导入', 'open')"
      />

      <template>
        <Menu ref="openMenu" :model="openMenuItems" popup />
        <FromOtherFormatModal v-model="showImportFromOtherFormatModal" />
        <FromTextModal v-model="showImportFromTextModal" />
      </template>

      <Button
        icon="pi pi-cog"
        variant="text"
        v-tooltip="tipHotkey('偏好设置', 'preferences')"
        :severity="
          runtimeStore.openedSidebars.includes(SidebarKey.Preference) ? undefined : 'secondary'
        "
        @click="runtimeStore.toogleSidebar(SidebarKey.Preference)"
      />
      <Button
        icon="pi pi-undo"
        variant="text"
        severity="secondary"
        @click="editHistory.undo()"
        :disabled="!editHistory.undoable.value"
        v-tooltip="tipHotkey('撤销', 'undo')"
      />
      <Button
        icon="pi pi-refresh"
        variant="text"
        severity="secondary"
        @click="editHistory.redo()"
        :disabled="!editHistory.redoable.value"
        v-tooltip="tipHotkey('重做', 'redo')"
      />
    </div>
    <div class="centerbar">
      <SelectButton
        v-model="viewHandler"
        :options="viewOptions"
        optionLabel="name"
        optionDisabled="disabled"
        size="large"
      />
    </div>
    <div class="rightbar">
      <SplitButton
        label="复制"
        icon="pi pi-save"
        :model="[{ label: '另存为', icon: 'pi pi-file-export' }]"
        @click="handleSaveClick"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Button, Menu, SelectButton, SplitButton } from 'primevue'
import { useRuntimeStore } from '@states/stores'
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import type { MenuItem } from 'primevue/menuitem'

import { editHistory } from '@states/services/history'
import { chooseFile } from '@core/file'
import { importTTML, stringifyTTML } from '@core/ports/formats/ttml'
import { exportPersist, importPersist } from '@core/ports'

import FromTextModal from '@ui/dialogs/FromTextModal.vue'
import FromOtherFormatModal from '@ui/dialogs/FromOtherFormatModal.vue'
import { tipHotkey } from '@utils/generateTooltip'
import { View } from '@core/types'
import { SidebarKey } from '@ui/sidebar'

const runtimeStore = useRuntimeStore()

// Middle view selector
const viewOptions = [
  { name: '内容', value: View.Content },
  { name: '时轴', value: View.Timing },
  { name: '预览', value: View.Preview },
]
const stateToView = () => viewOptions.find((v) => v.value === runtimeStore.currentView)!
const viewHandler = ref<(typeof viewOptions)[number] | null>(stateToView())
watch(viewHandler, (value) => {
  if (!value) nextTick(() => (viewHandler.value = stateToView()))
  else runtimeStore.currentView = value.value
})
watch(
  () => runtimeStore.currentView,
  () => (viewHandler.value = stateToView()),
)

// File open
const openMenu = useTemplateRef('openMenu')

const handleImportFromFile = (accept: string, parser: (content: string) => void) => async () => {
  const file = await chooseFile(accept)
  if (!file) return
  return parser(file.content)
}
const handleImportFromClipboard = (parser: (content: string) => void) => async () => {
  const text = await navigator.clipboard.readText()
  if (!text) return
  return parser(text)
}

const showImportFromTextModal = ref(false)
const showImportFromOtherFormatModal = ref(false)
const openMenuItems: MenuItem[] = [
  {
    label: '现有项目',
    icon: 'pi pi-file',
    command: handleImportFromFile('.aleproj', importTTML),
  },
  {
    label: 'TTML 文件',
    icon: 'pi pi-file',
    command: handleImportFromFile('.ttml', importTTML),
  },
  { separator: true },
  {
    label: '从剪贴板导入 TTML',
    icon: 'pi pi-clipboard',
    command: handleImportFromClipboard(importTTML),
  },
  {
    label: '从纯文本导入',
    icon: 'pi pi-align-left',
    command: () => (showImportFromTextModal.value = true),
  },
  {
    label: '从其他歌词格式导入',
    icon: 'pi pi-paperclip',
    command: () => (showImportFromOtherFormatModal.value = true),
  },
  { separator: true },
  {
    label: '空项目',
    icon: 'pi pi-ban',
    command: handleNewProject,
  },
]

async function handleNewProject() {
  importPersist({
    lyricLines: [],
    metadata: {},
  })
}

// File save
function handleSaveClick() {
  //test: clipboard
  navigator.clipboard.writeText(stringifyTTML(exportPersist()))
}
</script>

<style lang="scss">
.titlebar {
  display: flex;
  margin: 0 0.5rem;
  .leftbar,
  .rightbar {
    flex: 1;
    display: flex;
    gap: 0.3rem;
  }
  .leftbar {
    justify-content: flex-start;
  }
  .rightbar {
    justify-content: flex-end;
  }
}
</style>
