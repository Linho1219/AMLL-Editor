<template>
  <header class="titlebar">
    <div class="leftbar">
      <SplitButton
        label="打开"
        icon="pi pi-folder-open"
        severity="secondary"
        :model="openMenuItems"
        @click="handleOpenClick"
      />

      <FromOtherFormatModal v-model="showImportFromOtherFormatModal" />
      <FromTextModal v-model="showImportFromTextModal" />

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
      <div class="filename-section">
        <span class="name">{{ filename }}</span>
        <span class="asterisk" v-if="isDirty">*</span>
      </div>
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
      <div class="save-state-section">
        <span class="readonly" v-if="readonlyComputed">无写入权限</span>
        <span class="saved-at" v-if="savedAtComputed">保存于 {{ savedAtComputed }}</span>
      </div>
      <SplitButton label="保存" icon="pi pi-save" :model="saveMenuItems" @click="handleSaveClick" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { Button, SelectButton, SplitButton, useToast } from 'primevue'
import { useRuntimeStore } from '@states/stores'
import { computed, nextTick, ref, watch } from 'vue'
import type { MenuItem } from 'primevue/menuitem'

import { editHistory } from '@states/services/history'
import { parseTTML, stringifyTTML } from '@core/convert/formats/ttml'

import FromTextModal from '@ui/dialogs/FromTextModal.vue'
import FromOtherFormatModal from '@ui/dialogs/FromOtherFormatModal.vue'
import { tipHotkey } from '@utils/generateTooltip'
import { View } from '@core/types'
import { SidebarKey } from '@ui/sidebar'

import { fileState as FS } from '@core/file'
import { useGlobalKeyboard } from '@core/hotkey'
import { collectPersist } from '@states/services/port'
const {
  displayFilenameComputed: filename,
  readonlyComputed,
  savedAtComputed: savedAtDateComputed,
} = FS
const { isDirty } = editHistory

const runtimeStore = useRuntimeStore()

const savedAtComputed = computed(() => {
  const date = savedAtDateComputed.value
  if (!date) return ''
  return date.toTimeString().split(' ')[0]
})

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

const toast = useToast()
const successTip = (summary: string, detail?: string) => {
  toast.add({ severity: 'success', summary, detail, life: 3000 })
}
const errorTip = (summary: string, detail?: string) => {
  toast.add({ severity: 'error', summary, detail, life: 3000 })
}

const showImportFromTextModal = ref(false)
const showImportFromOtherFormatModal = ref(false)

const isUserAbortError = (e: unknown) => {
  const err = e as Error
  return err.message.includes('The user aborted a request.')
}
async function handleOpen(fsopener: () => Promise<string>) {
  try {
    successTip('成功装载文件', await fsopener())
  } catch (e) {
    console.error(e)
    const err = e as Error
    if (isUserAbortError(err)) return
    else errorTip('打开文件失败', (e as Error).message)
    return
  }
}
function handleOpenClick() {
  handleOpen(FS.openFile)
}
function handleOpenProjClick() {
  handleOpen(FS.openProjFile)
}
function handleOpenTTMLClick() {
  handleOpen(FS.openTTMLFile)
}

const handleImportFromClipboard = () => async () => {
  const text = await navigator.clipboard.readText()
  if (!text) {
    errorTip('剪贴板为空')
    return
  }
  try {
    const persist = parseTTML(text)
    FS.importPersist(persist)
    successTip('已从剪贴板导入 TTML')
  } catch (err) {
    console.error(err)
    errorTip('从剪贴板导入 TTML 失败', (err as Error).message)
  }
}
const handleExportToClipboard = async () => {
  const ttml = stringifyTTML(collectPersist())
  await navigator.clipboard.writeText(ttml)
  successTip('已复制 TTML 到剪贴板')
}
async function handleSaveClick() {
  try {
    successTip('成功保存文件', await FS.saveFile())
  } catch (e) {
    console.error(e)
    if (isUserAbortError(e)) return
    errorTip('保存文件失败', (e as Error).message)
  }
}
async function handleSaveAsClick() {
  try {
    successTip('成功另存为文件', await FS.saveAsFile())
  } catch (e) {
    console.error(e)
    if (isUserAbortError(e)) return
    errorTip('另存为文件失败', (e as Error).message)
  }
}

const openMenuItems: MenuItem[] = [
  {
    label: '现有项目',
    icon: 'pi pi-file',
    command: handleOpenProjClick,
  },
  {
    label: 'TTML 文件',
    icon: 'pi pi-file',
    command: handleOpenTTMLClick,
  },
  { separator: true },
  {
    label: '从剪贴板导入 TTML',
    icon: 'pi pi-clipboard',
    command: handleImportFromClipboard(),
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
    command: FS.createBlankProject,
  },
]
const saveMenuItems: MenuItem[] = [
  {
    label: '另存为',
    icon: 'pi pi-file-edit',
    command: handleSaveAsClick,
  },
  {
    label: '复制 TTML 到剪贴板',
    icon: 'pi pi-clipboard',
    command: handleExportToClipboard,
  },
  {
    label: '导出到其他格式',
    icon: 'pi pi-file-export',
    command: handleSaveAsClick,
  },
]

useGlobalKeyboard('save', handleSaveClick)
useGlobalKeyboard('saveAs', handleSaveAsClick)
useGlobalKeyboard('open', handleOpenClick)
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
  .filename-section {
    display: flex;
    align-items: center;
    padding: 0 0.5rem;
    line-height: 1;
    opacity: 0.9;
    .name {
      font-size: 1.1rem;
      user-select: none;
    }
    .asterisk {
      color: var(--p-primary-color);
      font-weight: bold;
      margin-left: 0.2rem;
      user-select: none;
    }
  }
  .save-state-section {
    display: flex;
    align-items: center;
    padding: 0 0.8rem;
    line-height: 1;
    color: var(--p-button-text-secondary-color);
    opacity: 0.9;
    gap: 0.5rem;
  }
}
</style>
