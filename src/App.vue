<template>
  <Titlebar />
  <template v-if="runtimeStore.isPreviewView">
    <main></main>
  </template>
  <template v-else>
    <Ribbon />
    <main>
      <KeepAlive>
        <Sidebar v-if="runtimeStore.sidebarShown" />
      </KeepAlive>
      <ContentEditor v-if="runtimeStore.isContentView" class="editor" />
      <TimingEditor v-if="runtimeStore.isTimingView" class="editor" />
    </main>
  </template>
  <Player />
</template>

<script setup lang="ts">
import Titlebar from './components/titlebar/Titlebar.vue'
import Ribbon from './components/ribbon/Ribbon.vue'
import ContentEditor from './components/editor/content/ContentEditor.vue'
import TimingEditor from './components/editor/timing/TimingEditor.vue'
import Player from './components/audio/Player.vue'
import { useRuntimeStore, View } from './stores/runtime'
import editHistory from './stores/editHistory'
import { onMounted, onUnmounted } from 'vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import { usePreferenceStore } from './stores/preference'
import { emitGlobalKeyboard, matchHotkeyInMap, parseKeyEvent } from './utils/hotkey'
import { useCoreStore } from './stores/core'
editHistory.init()

const preferenceStore = usePreferenceStore()
const runtimeStore = useRuntimeStore()

const modalDialogActivated = () => !!document.querySelector('.p-dialog-mask.p-overlay-mask')
const handleRootKeydown = (e: KeyboardEvent) => {
  if (e.target !== document.body && e.target instanceof HTMLInputElement) {
    if (e.target.closest('input[type="text"], textarea, [contenteditable="true"]')) {
      return
    }
    if (e.target.closest('input[type="checkbox"]') && e.code === 'Enter') {
      const checkbox = e.target as HTMLInputElement
      checkbox.click()
      e.preventDefault()
      return
    }
  }
  if (modalDialogActivated()) return
  const hotkey = parseKeyEvent(e)
  if (!hotkey) return
  const command = matchHotkeyInMap(hotkey, preferenceStore.hotkeyMap)
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
#app {
  margin: 0;
  padding: 0.5rem 0;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

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
  .editor-scroller::-webkit-scrollbar {
    width: 16px;
  }
}
</style>
