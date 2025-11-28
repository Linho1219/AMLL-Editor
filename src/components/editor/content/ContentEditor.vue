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
          <template v-for="(word, wordIndex) in line.words" :key="word.id">
            <Word
              :word="word"
              :index="wordIndex"
              :parent="line"
              :line-index="lineIndex"
              @contextmenu="handleWordContext"
            />
            <WordInsertIndicator :index="wordIndex + 1" :parent="line" />
          </template>
          <Button
            class="add-word-button"
            icon="pi pi-plus"
            severity="secondary"
            @click="appendWord(line)"
            v-tooltip="'插入词'"
          />
        </Line>
        <LineInsertIndicator :index="lineIndex + 1" @contextmenu="handleLineInsertContext" />
      </div>
    </VList>
    <ContextMenu ref="menu" :model="menuItems" />
    <Teleport to="body">
      <DragGhost v-if="runtimeStore.isDragging" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine } from '@/stores/core'
import Line from './ContentLine.vue'
// import LineLazyShell from './LineLazyShell.vue'
import { useRuntimeStore, View } from '@/stores/runtime'
import Word from './ContentWord.vue'
import { Button, ContextMenu } from 'primevue'
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { forceOutsideBlur } from '@/utils/selection'
import WordInsertIndicator from './WordInsertIndicator.vue'
import LineInsertIndicator from './LineInsertIndicator.vue'
import DragGhost from './DragGhost.vue'
import type { MenuItem } from 'primevue/menuitem'
import { useStaticStore, type EditorComponentActions } from '@/stores/static'
import { VList } from 'virtua/vue'
import { useGlobalKeyboard } from '@/utils/hotkey'
import type { ScrollToIndexOpts } from 'virtua/unstable_core'
import { alignLineEndTime, alignLineTime } from '@/utils/alignLineTime'

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

function appendWord(line: LyricLine) {
  const newWord = coreStore.newWord(line)
  line.words.push(newWord)
  runtimeStore.selectLineWord(line, newWord)
  nextTick(() => staticStore.wordHooks.get(newWord.id)?.focusInput())
}
function handleMouseDown(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) return
  forceOutsideBlur()
  staticStore.lastTouchedLine = staticStore.lastTouchedWord = null
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
let contextWordIndex: undefined | number = undefined

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
          words: line.words.map(coreStore.newWord),
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
const wordMenuItems: MenuItem[] = [
  {
    label: '在前插入词',
    icon: 'pi pi-arrow-left',
    command: () => {
      if (contextLineIndex === undefined || contextWordIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const newWord = coreStore.newWord()
      parent.words.splice(contextWordIndex, 0, newWord)
      runtimeStore.selectLineWord(parent, newWord)
      nextTick(() => staticStore.wordHooks.get(newWord.id)?.focusInput())
    },
  },
  {
    label: '在后插入词',
    icon: 'pi pi-arrow-right',
    command: () => {
      if (contextLineIndex === undefined || contextWordIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const newWord = coreStore.newWord()
      parent.words.splice(contextWordIndex + 1, 0, newWord)
      runtimeStore.selectLineWord(parent, newWord)
      nextTick(() => staticStore.wordHooks.get(newWord.id)?.focusInput())
    },
  },
  {
    label: '在此拆分行',
    icon: 'pi pi-code',
    command: () => {
      if (contextLineIndex === undefined || contextWordIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      const wordsToMove = parent.words.splice(contextWordIndex)
      if (wordsToMove.length === 0) return
      const newLine = coreStore.newLine({ ...parent, words: wordsToMove })
      alignLineEndTime(parent)
      alignLineTime(newLine)
      coreStore.lyricLines.splice(contextLineIndex + 1, 0, newLine)
      runtimeStore.selectLineWord(newLine, wordsToMove[0]!)
    },
  },
  {
    label: '删除单词',
    icon: 'pi pi-trash',
    command: () => {
      if (contextLineIndex === undefined || contextWordIndex === undefined) return
      const parent = coreStore.lyricLines[contextLineIndex]!
      parent.words.splice(contextWordIndex, 1)
    },
  },
]

const menuItemsMap = {
  blank: blankMenuItems,
  line: lineMenuItems,
  lineInsert: lineInsertMenuItems,
  word: wordMenuItems,
} as const
const menuItems = shallowRef<MenuItem[]>(blankMenuItems)

const handleContext =
  (src: 'line' | 'word' | 'lineInsert' | 'blank') =>
  (e: MouseEvent, lineIndex?: number, wordIndex?: number) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('input[type="text"], textarea, [contenteditable="true"]')
    ) {
      return
    }
    contextLineIndex = lineIndex
    contextWordIndex = wordIndex
    menuItems.value = menuItemsMap[src]
    menu.value?.show(e)
  }
const handleBlankContext = handleContext('blank')
const handleLineContext = handleContext('line')
const handleLineInsertContext = handleContext('lineInsert')
const handleWordContext = handleContext('word')

useGlobalKeyboard('delete', () => {
  if (runtimeStore.selectedWords.size) {
    coreStore.deleteWord(...runtimeStore.selectedWords)
  } else coreStore.deleteLine(...runtimeStore.selectedLines)
})

const vscroll = useTemplateRef('vscroll')
onMounted(() => {
  if (!runtimeStore.selectedLines.size) return
  const firstLine = runtimeStore.getFirstSelectedLine()!
  const lineIndex = coreStore.lyricLines.indexOf(firstLine)
  if (lineIndex !== -1) vscroll.value?.scrollToIndex(lineIndex, { align: 'center' })
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
  --content-word-height: 4.8rem;
}
.editor-scroller {
  height: 100%;
}
.add-word-button {
  height: var(--content-word-height);
}
</style>
