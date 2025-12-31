<template>
  <header class="titlebar">
    <div class="leftbar">
      <SplitButton
        label="打开"
        :icon="`pi ${openWorking ? 'pi-sync' : 'pi-folder-open'}`"
        severity="secondary"
        :model="openMenuItems"
        @click="handleOpenClick"
        v-tooltip="tipHotkey('打开文件', 'open')"
        :disabled="openWorking"
      >
        <template #item="{ item, props }">
          <TieredMenuItem :item="item" :binding="props" />
        </template>
      </SplitButton>

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
        :icon="`pi ${saveWorking ? 'pi-sync' : 'pi-save'}`"
        :model="saveMenuItems"
        @click="handleSaveClick"
        v-tooltip="tipHotkey('保存文件', 'save')"
        :disabled="saveWorking"
      >
        <template #item="{ item, props }">
          <TieredMenuItem :item="item" :binding="props" />
        </template>
      </SplitButton>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { compatibilityMap } from '@core/compat'
import { fileState as FS } from '@core/file'
import { useGlobalKeyboard } from '@core/hotkey'

import { editHistory } from '@states/services/history'
import { useRuntimeStore } from '@states/stores'

import { tipHotkey } from '@utils/generateTooltip'

import { SidebarKey } from '@ui/sidebar'

import ViewSwitcher from './ViewSwitcher.vue'
import TieredMenuItem from '@ui/components/TieredMenuItem.vue'
import { Button, SplitButton } from 'primevue'

import { useTitlebarFileLogics } from './fileLogics'

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

const openWorking = ref(false)
const saveWorking = ref(false)

const {
  handleSaveClick,
  handleOpenClick,
  handleSaveAsClick,
  handleCreateBlankProject,
  handleExportToClipboard,
  handleImportFromClipboard,
  openMenuItems,
  saveMenuItems,
} = useTitlebarFileLogics({
  openWorking,
  saveWorking,
})

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
  white-space: pre;
  display: flex;
  margin: 0 0.5rem 0.5rem;
  gap: 0.8rem;
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
    padding: 0 0.5rem;
    opacity: 0.9;
    width: 0;
    flex-grow: 1;
    display: flex;
    align-items: center;
    white-space: pre;
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
    @media (display-mode: standalone) {
      display: none;
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
  @media screen and (max-width: 720px) {
    .filename-section,
    .save-state-section {
      display: none;
    }
  }
}
</style>
