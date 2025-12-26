<template>
  <div
    class="editor content"
    @mousedown="handleMouseDown"
    @dragover="handleDragOver"
    @contextmenu="handleBlankContext"
    data-escape-auto-blur
    spellcheck="false"
  >
    <VList
      :data="coreStore.lyricLines"
      class="editor-scroller"
      #default="{ item: line, index: lineIndex }"
      ref="vscroll"
    >
      <div :key="line.id" class="line-item-shell">
        <LineInsertIndicator
          v-if="lineIndex === 0"
          :index="0"
          @contextmenu="handleLineInsertContext"
        />
        <Line :line="line" :index="lineIndex" @contextmenu="handleLineContext">
          <WordInsertIndicator :index="0" :parent="line" />
          <template v-for="(syllable, sylIndex) in (<LyricLine>line).syllables" :key="syllable.id">
            <Syllable
              :syllable="syllable"
              :index="sylIndex"
              :parent="line"
              :line-index="lineIndex"
              @contextmenu="handleWordContext"
            />
            <WordInsertIndicator :index="sylIndex + 1" :parent="line" />
          </template>
          <Button
            class="add-syl-button"
            icon="pi pi-plus"
            severity="secondary"
            @click="appendWord(line)"
            v-tooltip="'插入音节'"
          />
        </Line>
        <LineInsertIndicator :index="lineIndex + 1" @contextmenu="handleLineInsertContext" />
      </div>
    </VList>
    <ContextMenu ref="menu" :model="menuItems" />
    <EmptyTip
      v-if="coreStore.lyricLines.length === 0"
      title="没有歌词行"
      tip="使用「打开」菜单加载内容，或右键空白处插入新行"
    />
    <Teleport to="body">
      <DragGhost v-if="runtimeStore.isDragging" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ScrollToIndexOpts } from 'virtua/unstable_core'
import { VList } from 'virtua/vue'
import { nextTick, onBeforeUnmount, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'

import { useGlobalKeyboard } from '@core/hotkey'
import { type LyricLine, type LyricSyllable, View } from '@core/types'

import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'
import type { EditorComponentActions } from '@states/stores/static'

import { alignLineEndTime, alignLineTime } from '@utils/alignLineSylTime'
import { forceOutsideBlur } from '@utils/forceOutsideBlur'
import { tryRaf } from '@utils/tryRaf'

import DragGhost from './DragGhost.vue'
import Line from './Line.vue'
import LineInsertIndicator from './LineInsertIndicator.vue'
import Syllable from './Syllable.vue'
import WordInsertIndicator from './WordInsertIndicator.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'
import { Button, ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

function appendWord(line: LyricLine) {
  const newSyllable = coreStore.newSyllable(line)
  line.syllables.push(newSyllable)
  runtimeStore.selectLineSyl(line, newSyllable)
  nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
}
function handleMouseDown(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) return
  forceOutsideBlur()
  staticStore.lastTouchedLine = staticStore.lastTouchedSyl = null
  runtimeStore.clearSelection()
}
function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDragging) return
  if (!e.dataTransfer) return
  if (e.ctrlKey || e.metaKey) {
    e.dataTransfer.dropEffect = 'copy'
    runtimeStore.isDraggingCopy = true
  } else {
    e.dataTransfer.dropEffect = 'move'
    runtimeStore.isDraggingCopy = false
  }
}

let contextLineIndex: undefined | number = undefined
let contextSylIndex: undefined | number = undefined

const menu = useTemplateRef('menu')

const blankMenuItems: MenuItem[] = [
  {
    label: '插入行',
    icon: 'pi pi-plus',
    command: () => {
      const newLine = coreStore.newLine()
      coreStore.lyricLines.push(newLine)
      runtimeStore.selectLine(newLine)
    },
  },
]
const lineInsertMenuItems: MenuItem[] = [
  {
    label: '插入行',
    icon: 'pi pi-plus',
    command: () => {
      if (contextLineIndex === undefined) return
      const newLine = coreStore.newLine()
      coreStore.lyricLines.splice(contextLineIndex, 0, newLine)
      runtimeStore.selectLine(newLine)
    },
  },
]
const lineMenuItems: MenuItem[] = [
  {
    label: '设为对唱',
    icon: 'pi pi-align-right',
    command: () => {
      runtimeStore.selectedLines.forEach((l) => (l.duet = true))
    },
  },
  {
    label: '设为背景',
    icon: 'pi pi-expand',
    command: () => {
      runtimeStore.selectedLines.forEach((l) => (l.background = true))
    },
  },
  {
    label: '清除属性',
    icon: 'pi pi-ban',
    command: () => {
      runtimeStore.selectedLines.forEach((l) => (l.duet = l.background = false))
    },
  },
  { separator: true },
  {
    label: '在前插入行',
    icon: 'pi pi-arrow-up',
    command: () => {
      const newLines: LyricLine[] = []
      for (const line of runtimeStore.selectedLines) {
        const newLine = coreStore.newLine()
        newLines.push(newLine)
        const lineIndex = coreStore.lyricLines.indexOf(line)
        if (lineIndex === -1) continue
        coreStore.lyricLines.splice(lineIndex, 0, newLine)
      }
      runtimeStore.selectLine(...newLines)
    },
  },
  {
    label: '在后插入行',
    icon: 'pi pi-arrow-down',
    command: () => {
      const newLines: LyricLine[] = []
      for (const line of runtimeStore.selectedLines) {
        const newLine = coreStore.newLine()
        newLines.push(newLine)
        const lineIndex = coreStore.lyricLines.indexOf(line)
        if (lineIndex === -1) continue
        coreStore.lyricLines.splice(lineIndex + 1, 0, newLine)
      }
      runtimeStore.selectLine(...newLines)
    },
  },
  {
    label: '克隆行',
    icon: 'pi pi-clone',
    command: () => {
      const duplicates = [...runtimeStore.selectedLines].map((line) =>
        coreStore.newLine({
          ...line,
          syllables: line.syllables.map(coreStore.newSyllable),
        }),
      )
      const lastLineIndex = (() => {
        for (let i = coreStore.lyricLines.length - 1; i >= 0; i--)
          if (runtimeStore.selectedLines.has(coreStore.lyricLines[i]!)) return i
        return -1
      })()
      if (lastLineIndex === -1) return
      coreStore.lyricLines.splice(lastLineIndex + 1, 0, ...duplicates)
      runtimeStore.selectLine(...duplicates)
    },
  },
  {
    label: '删除行',
    icon: 'pi pi-trash',
    command: () => {
      coreStore.deleteLine(...runtimeStore.selectedLines)
      runtimeStore.clearSelection()
    },
  },
]
const sylMenuItems: MenuItem[] = [
  {
    label: '在前插入音节',
    icon: 'pi pi-arrow-left',
    command: () => {
      if (contextLineIndex === undefined || contextSylIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const newSyllable = coreStore.newSyllable()
      parent.syllables.splice(contextSylIndex, 0, newSyllable)
      runtimeStore.selectLineSyl(parent, newSyllable)
      nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
    },
  },
  {
    label: '在后插入音节',
    icon: 'pi pi-arrow-right',
    command: () => {
      if (contextLineIndex === undefined || contextSylIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const newSyllable = coreStore.newSyllable()
      parent.syllables.splice(contextSylIndex + 1, 0, newSyllable)
      runtimeStore.selectLineSyl(parent, newSyllable)
      nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
    },
  },
  {
    label: '在此拆分行',
    icon: 'pi pi-code',
    command: () => {
      if (contextLineIndex === undefined || contextSylIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const sylsToMove = parent.syllables.splice(contextSylIndex)
      if (sylsToMove.length === 0) return
      const newLine = coreStore.newLine({ ...parent, syllables: sylsToMove })
      alignLineEndTime(parent)
      alignLineTime(newLine)
      coreStore.lyricLines.splice(contextLineIndex + 1, 0, newLine)
      runtimeStore.selectLineSyl(newLine, sylsToMove[0]!)
    },
  },
  {
    label: '删除音节',
    icon: 'pi pi-trash',
    command: () => {
      if (contextLineIndex === undefined || contextSylIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      parent.syllables.splice(contextSylIndex, 1)
    },
  },
]

const menuItemsMap = {
  blank: blankMenuItems,
  line: lineMenuItems,
  lineInsert: lineInsertMenuItems,
  syl: sylMenuItems,
} as const
const menuItems = shallowRef<MenuItem[]>(blankMenuItems)

const handleContext =
  (src: 'line' | 'syl' | 'lineInsert' | 'blank') =>
  (e: MouseEvent, lineIndex?: number, sylIndex?: number) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('input[type="text"], textarea, [contenteditable="true"]')
    ) {
      return
    }
    contextLineIndex = lineIndex
    contextSylIndex = sylIndex
    menuItems.value = menuItemsMap[src]
    menu.value?.show(e)
  }
const handleBlankContext = handleContext('blank')
const handleLineContext = handleContext('line')
const handleLineInsertContext = handleContext('lineInsert')
const handleWordContext = handleContext('syl')

useGlobalKeyboard('delete', () => {
  if (runtimeStore.selectedSyllables.size) {
    coreStore.deleteSyllable(...runtimeStore.selectedSyllables)
  } else coreStore.deleteLine(...runtimeStore.selectedLines)
})

const vscroll = useTemplateRef('vscroll')
// onBeforeUnmounted instead of onUnmounted: vscroll quits at unmounted phase
onBeforeUnmount(() => {
  if (runtimeStore.currentView !== View.Timing || !vscroll.value) return
  const start = vscroll.value.findStartIndex()
  const end = vscroll.value.findEndIndex()
  const centerIndex = Math.floor((start + end) / 2)
  tryRaf(() => {
    if (staticStore.editorHook?.view !== View.Timing) return
    if (start === 0) staticStore.editorHook.scrollTo(0, { align: 'start' })
    else if (end === coreStore.lyricLines.length - 1)
      staticStore.editorHook.scrollTo(end, { align: 'end' })
    else staticStore.editorHook.scrollTo(centerIndex, { align: 'center' })
    return true
  })
})
onMounted(() => {
  const scrollToHook = (index: number, options?: ScrollToIndexOpts) => {
    vscroll.value?.scrollToIndex(index, options)
  }
  staticStore.scrollToHook = scrollToHook
  onUnmounted(() => {
    if (staticStore.scrollToHook === scrollToHook) staticStore.scrollToHook = null
  })
})

const editorHook: EditorComponentActions = {
  view: View.Content,
  scrollTo: (...args) => {
    vscroll.value?.scrollToIndex(...args)
  },
}
onMounted(() => {
  staticStore.editorHook = editorHook
})
onUnmounted(() => {
  if (staticStore.editorHook === editorHook) staticStore.editorHook = null
})
</script>

<style lang="scss">
.editor.content {
  --content-syl-height: 4.8rem;
}
.editor-scroller {
  height: 100%;
}
.add-syl-button {
  height: var(--content-syl-height);
}
</style>
