<template>
  <Titlebar />
  <Ribbon v-if="!runtimeStore.isPreviewView" />
  <main>
    <KeepAlive>
      <Sidebar v-if="!runtimeStore.isPreviewView && runtimeStore.sidebarShown" />
    </KeepAlive>
    <div class="editor-shell">
      <ContentEditor v-if="runtimeStore.isContentView" />
      <TimingEditor v-else-if="runtimeStore.isTimingView" />
      <Preview v-else-if="runtimeStore.isPreviewView" />
    </div>
  </main>
  <Player />
  <Toast />
  <FontLoader />
  <DropDataConfirmModal />
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { onMounted, onUnmounted, watch } from 'vue'

import { fileState } from '@core/file'
import { View } from '@core/types'

import { editHistory } from '@states/services/history'
import { useCoreStore, usePrefStore, useRuntimeStore } from '@states/stores'

import { isInputEl } from '@utils/isInputEl'

import FontLoader from './components/FontLoader.vue'
import DropDataConfirmModal from './dialogs/DropDataConfirmModal.vue'
import ContentEditor from './editor/content/Editor.vue'
import Preview from './editor/preview/Preview.vue'
import TimingEditor from './editor/timing/Editor.vue'
import Player from './player/Player.vue'
import Ribbon from './ribbon/Ribbon.vue'
import Sidebar from './sidebar/Sidebar.vue'
import Titlebar from './titlebar/Titlebar.vue'
import { Toast, type ToastMessageOptions, useToast } from 'primevue'

import {
  emitGlobalKeyboard,
  matchHotkeyInMap,
  parseKeyEvent,
  shouldEscapeInInput,
} from '../core/hotkey'

editHistory.init()
editHistory.markSaved() // Empty state is considered saved

const prefStore = usePrefStore()
const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()

const toast = useToast()
const notifier = (summary: string, detail: string, severity: ToastMessageOptions['severity']) =>
  toast.add({ severity, summary, detail, life: 3000 })

fileState.initDragListener(notifier)
fileState.initPwaLaunch(notifier)
const isStandalone = useMediaQuery('(display-mode: standalone)')
watch(
  [isStandalone, fileState.displayFilenameComputed, editHistory.isDirty],
  ([standalone, filename, isDirty]) => {
    if (standalone && filename) {
      if (isDirty) filename += '*'
      document.title = filename
      // App name pre/suffix will be added by the browser
    } else document.title = 'AMLL Editor'
  },
  { immediate: true },
)

const modalDialogActivated = () => !!document.querySelector('.p-dialog-mask.p-overlay-mask')
const handleRootKeydown = (e: KeyboardEvent) => {
  const hotkey = parseKeyEvent(e)
  if (!hotkey) return
  if (shouldEscapeInInput(hotkey)) {
    if (e.target !== document.body && e.target instanceof HTMLInputElement) {
      if (isInputEl(e.target)) return
      // Special handling for checkbox: Enter to toggle,
      // since space is taken by audio play/pause
      if (e.target.closest('input[type="checkbox"]') && e.code === 'Enter') {
        const checkbox = e.target as HTMLInputElement
        checkbox.click()
        e.preventDefault()
        return
      }
    }
  }
  if (modalDialogActivated()) return
  const command = matchHotkeyInMap(hotkey, prefStore.hotkeyMap)
  if (!command) return
  e.preventDefault()
  switch (command) {
    case 'undo': {
      editHistory.undo()
      break
    }
    case 'redo': {
      editHistory.redo()
      break
    }
    case 'switchToContent': {
      runtimeStore.currentView = View.Content
      break
    }
    case 'switchToTiming': {
      runtimeStore.currentView = View.Timing
      break
    }
    case 'switchToPreview': {
      runtimeStore.currentView = View.Preview
      break
    }
    case 'selectAllLines': {
      if (!runtimeStore.isContentView) break
      if (runtimeStore.selectedLines.size === coreStore.lyricLines.length) {
        runtimeStore.clearSelection()
      } else {
        runtimeStore.clearSelection()
        runtimeStore.addLineToSelection(...coreStore.lyricLines)
      }
      break
    }
    case 'selectAllSyls': {
      if (!runtimeStore.isContentView) break
      const lines = [...runtimeStore.selectedLines]
      for (const line of lines) {
        runtimeStore.addSylToSelection(...line.syllables)
      }
      break
    }
    default: {
      emitGlobalKeyboard(command)
      break
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleRootKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleRootKeydown)
})
</script>

<style lang="scss">
:root {
  font-size: 14px;
}
body {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}
#app {
  flex: 1;
  height: 0;
  margin: 0;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
}
main {
  height: 0;
  flex: 1;
  display: flex;
  animation: main-in 0.5s;
}
@keyframes main-in {
  0%,
  60% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
.editor-shell {
  flex: 1;
  overflow-x: hidden;
  position: relative;
  display: flex;
  .editor {
    flex: 1;
  }

  .editor-scroller {
    &::-webkit-scrollbar {
      width: 16px;
    }
    &::-webkit-scrollbar-thumb {
      border-width: 5px;
    }
  }
}
</style>
