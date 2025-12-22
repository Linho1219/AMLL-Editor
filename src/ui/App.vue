<template>
  <Titlebar />
  <Ribbon v-if="!runtimeStore.isPreviewView" />
  <main>
    <KeepAlive>
      <Sidebar v-if="!runtimeStore.isPreviewView && runtimeStore.sidebarShown" />
    </KeepAlive>
    <ContentEditor v-if="runtimeStore.isContentView" />
    <TimingEditor v-else-if="runtimeStore.isTimingView" />
    <Preview v-else-if="runtimeStore.isPreviewView" />
  </main>
  <Player />
  <Toast />
  <FontLoader />
</template>

<script setup lang="ts">
import Titlebar from './titlebar/Titlebar.vue'
import Ribbon from './ribbon/Ribbon.vue'
import ContentEditor from './editor/content/Editor.vue'
import TimingEditor from './editor/timing/Editor.vue'
import Preview from './editor/preview/Preview.vue'
import Player from './player/Player.vue'
import FontLoader from './components/FontLoader.vue'
import { editHistory } from '@states/services/history'
import { onMounted, onUnmounted } from 'vue'
import Sidebar from './sidebar/Sidebar.vue'
import {
  emitGlobalKeyboard,
  matchHotkeyInMap,
  parseKeyEvent,
  shouldEscapeInInput,
} from '../core/hotkey'
import { Toast } from 'primevue'
import { usePrefStore, useRuntimeStore } from '@states/stores'
import { View } from '@core/types'
editHistory.init()

const prefStore = usePrefStore()
const runtimeStore = useRuntimeStore()

const modalDialogActivated = () => !!document.querySelector('.p-dialog-mask.p-overlay-mask')
const handleRootKeydown = (e: KeyboardEvent) => {
  const hotkey = parseKeyEvent(e)
  if (!hotkey) return
  if (shouldEscapeInInput(hotkey)) {
    if (e.target !== document.body && e.target instanceof HTMLInputElement) {
      if (e.target.closest('input[type="text"], textarea, [contenteditable="true"]')) return
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
  gap: 0.5rem;
}
main {
  height: 0;
  flex: 1;
  display: flex;
}
.editor {
  flex: 1;
  overflow-x: hidden;
  position: relative;
  .editor-scroller::-webkit-scrollbar {
    width: 16px;
  }
}
</style>
