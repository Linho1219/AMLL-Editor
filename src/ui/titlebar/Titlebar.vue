<template>
  <header class="titlebar">
    <div class="leftbar">
      <SplitButton
        label="打开"
        icon="pi pi-folder-open"
        severity="secondary"
        :model="openMenuItems"
        @click="handleOpenClick"
        v-tooltip="tipHotkey('打开文件', 'open')"
      >
        <template #item="{ item, props }">
          <TieredMenuItem :item="item" :binding="props" />
        </template>
      </SplitButton>

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
        <div class="filename-text">
          <span class="name">{{ filename }}</span
          ><span class="asterisk" v-if="isDirty">*</span>
        </div>
      </div>
    </div>
    <div class="centerbar">
      <ViewSwitcher />
    </div>
    <div class="rightbar">
      <div class="save-state-section">
        <span class="readonly" v-if="!compatibilityMap.fileSystem">兼容读写模式</span>
        <span class="readonly" v-else-if="readonlyComputed">未授予写入权限</span>
        <span class="saved-at" v-if="savedAtComputed">保存于 {{ savedAtComputed }}</span>
      </div>
      <SplitButton
        label="保存"
        icon="pi pi-save"
        :model="saveMenuItems"
        @click="handleSaveClick"
        v-tooltip="tipHotkey('保存文件', 'save')"
      >
        <template #item="{ item, props }">
          <TieredMenuItem :item="item" :binding="props" />
        </template>
      </SplitButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Button, SplitButton, useToast } from 'primevue'
import { useRuntimeStore } from '@states/stores'
import { computed, ref } from 'vue'
import type { MenuItem } from 'primevue/menuitem'

import { editHistory } from '@states/services/history'
import { parseTTML, stringifyTTML } from '@core/convert/formats/ttml'

import FromTextModal from '@ui/dialogs/FromTextModal.vue'
import FromOtherFormatModal from '@ui/dialogs/FromOtherFormatModal.vue'
import { tipHotkey } from '@utils/generateTooltip'
import { SidebarKey } from '@ui/sidebar'

import { fileState as FS, simpleSaveTextFile } from '@core/file'
import { getHotkeyStr, useGlobalKeyboard } from '@core/hotkey'
import { collectPersist } from '@states/services/port'
import ViewSwitcher from './ViewSwitcher.vue'
import { portFormatRegister } from '@core/convert'
import { compatibilityMap } from '@core/compat'
import TieredMenuItem from '@ui/components/TieredMenuItem.vue'
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
  return (
    err.message.includes('The user aborted a request') ||
    err.message.includes('is not allowed by the user agent')
  )
}
async function handleOpen(fsopener: () => Promise<string>) {
  try {
    successTip('成功装载文件', await fsopener())
  } catch (e) {
    console.error(e)
    const err = e as Error
    if (isUserAbortError(err)) errorTip('打开文件失败', '文件访问被用户或平台拒绝')
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

async function handleImportFromClipboard() {
  const text = await navigator.clipboard.readText()
  if (!text) {
    errorTip('剪贴板为空')
    return
  }
  try {
    const persist = parseTTML(text)
    await FS.importPersist(persist)
    successTip('已从剪贴板导入 TTML')
  } catch (err) {
    console.error(err)
    errorTip('从剪贴板导入 TTML 失败', (err as Error).message)
  }
}
async function handleCreateBlankProject() {
  try {
    await FS.createBlankProject()
    successTip('已创建空项目')
  } catch (e) {
    console.error(e)
    if (isUserAbortError(e)) errorTip('创建空项目失败', '操作被用户拒绝')
    else errorTip('创建空项目失败', (e as Error).message)
  }
}
async function handleExportToClipboard() {
  const ttml = stringifyTTML(collectPersist())
  try {
    await navigator.clipboard.writeText(ttml)
    successTip('已复制 TTML 到剪贴板')
  } catch (err) {
    console.error(err)
    errorTip('复制 TTML 到剪贴板失败', (err as Error).message)
  }
}
async function handleSaveClick() {
  try {
    successTip('成功保存文件', await FS.saveFile())
  } catch (e) {
    console.error(e)
    if (isUserAbortError(e)) errorTip('保存文件失败', '文件写入被用户或平台拒绝')
    else errorTip('保存文件失败', (e as Error).message)
  }
}
async function __handleSaveAs(savePromise: Promise<string>) {
  try {
    successTip('成功另存为文件', await savePromise)
  } catch (e) {
    console.error(e)
    if (isUserAbortError(e)) errorTip('另存为文件失败', '文件写入被用户或平台拒绝')
    else errorTip('另存为文件失败', (e as Error).message)
  }
}
function handleSaveAsClick() {
  __handleSaveAs(FS.saveAsFile())
}
function handleSaveAsTTMLClick() {
  __handleSaveAs(FS.saveAsTTMLFile())
}
function handleSaveAsProjectClick() {
  __handleSaveAs(FS.saveAsProjectFile())
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
    label: '粘贴 TTML',
    icon: 'pi pi-clipboard',
    command: handleImportFromClipboard,
    disabled: !compatibilityMap.clipboard,
    tip: getHotkeyStr('importFromClipboard'),
  },
  {
    label: '导入纯文本',
    icon: 'pi pi-align-left',
    command: () => (showImportFromTextModal.value = true),
  },
  {
    label: '导入其他格式',
    icon: 'pi pi-paperclip',
    command: () => (showImportFromOtherFormatModal.value = true),
  },
  { separator: true },
  {
    label: '空项目',
    icon: 'pi pi-ban',
    command: handleCreateBlankProject,
    tip: getHotkeyStr('new'),
  },
]

const saveMenuNormalSaveAs: MenuItem[] = [
  {
    label: '另存为',
    icon: 'pi pi-file-edit',
    command: handleSaveAsClick,
    tip: getHotkeyStr('saveAs'),
  },
]
const saveMenuFallbackSaveAs: MenuItem[] = [
  {
    label: '导出为项目文件',
    icon: 'pi pi-file-edit',
    command: handleSaveAsProjectClick,
  },
  {
    label: '导出为 TTML 文件',
    icon: 'pi pi-file-edit',
    command: handleSaveAsTTMLClick,
  },
]
const saveMenuItemsWithoutSaveAs: MenuItem[] = [
  {
    label: '复制 TTML',
    icon: 'pi pi-clipboard',
    command: handleExportToClipboard,
    disabled: !compatibilityMap.clipboard,
    tip: getHotkeyStr('exportToClipboard'),
  },
  {
    label: '导出其他格式',
    icon: 'pi pi-file-export',
    items: portFormatRegister.map((format) => ({
      label: format.name,
      command: () => {
        const string = format.stringifier(collectPersist())
        simpleSaveTextFile(
          string,
          FS.suggestName(),
          format.accept,
          format.name,
          'export-to-other-format',
        )
      },
      tip: format.accept.join(', '),
    })),
  },
]
const saveMenuItems: MenuItem[] = [
  ...(compatibilityMap.fileSystem ? saveMenuNormalSaveAs : saveMenuFallbackSaveAs),
  ...saveMenuItemsWithoutSaveAs,
]

useGlobalKeyboard('preferences', () => runtimeStore.toogleSidebar(SidebarKey.Preference))
useGlobalKeyboard('save', handleSaveClick)
if (compatibilityMap.fileSystem) useGlobalKeyboard('saveAs', handleSaveAsClick)
useGlobalKeyboard('open', handleOpenClick)
useGlobalKeyboard('new', handleCreateBlankProject)
useGlobalKeyboard('exportToClipboard', handleExportToClipboard)
useGlobalKeyboard('importFromClipboard', handleImportFromClipboard)
</script>

<style lang="scss">
.titlebar {
  display: flex;
  margin: 0 0.5rem;
  gap: 0.8rem;
  .leftbar,
  .rightbar {
    width: 0;
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
    padding: 0 0.5rem;
    opacity: 0.9;
    width: 0;
    flex-grow: 1;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow-x: hidden;
    position: relative;
    .filename-text {
      line-height: 1;
      .name {
        font-size: 1.1rem;
        user-select: none;
      }
      .asterisk {
        color: var(--p-primary-color);
        font-weight: bold;
        margin-left: 0.1rem;
        user-select: none;
      }
    }
    &::after {
      content: '';
      z-index: 2;
      position: absolute;
      top: 0;
      right: 0;
      width: 2rem;
      height: 100%;
      pointer-events: none;
      background: linear-gradient(to right, transparent, var(--global-background));
    }
    @media screen and (max-width: 720px) {
      & {
        display: none;
      }
    }
  }
  .save-state-section {
    display: flex;
    align-items: center;
    padding: 0 0.8rem;
    line-height: 1;
    color: var(--p-button-text-secondary-color);
    opacity: 0.9;
    span + span {
      &::before {
        content: '·';
        margin: 0 0.3rem;
      }
    }
  }
}
</style>
