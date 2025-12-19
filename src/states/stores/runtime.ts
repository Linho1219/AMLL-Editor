import { computed, reactive, ref, shallowReactive, watch } from 'vue'
import { defineStore } from 'pinia'
import type { SidebarKey } from '@ui/sidebar'
import { View, type LyricLine, type LyricWord } from '@core/types'
import { useCoreStore } from './core'

export const useRuntimeStore = defineStore('runtime', () => {
  // View
  const currentView = ref(View.Content)
  const isContentView = computed(() => currentView.value === View.Content)
  const isTimingView = computed(() => currentView.value === View.Timing)
  const isPreviewView = computed(() => currentView.value === View.Preview)

  // Selection & drag
  const selectedLines = shallowReactive(new Set<LyricLine>())
  const selectedWords = shallowReactive(new Set<LyricWord>())

  const isDragging = ref(false)
  const isDraggingCopy = ref(false)
  const canDrop = ref(false)
  const isDraggingWord = computed(() => isDragging.value && selectedWords.size > 0)
  const isDraggingLine = computed(
    () => isDragging.value && selectedWords.size === 0 && selectedLines.size > 0,
  )

  const openedSidebars = reactive<SidebarKey[]>([])
  const currentSidebarIndex = ref(0)
  const sidebarShown = computed(() => openedSidebars.length > 0)
  watch(openedSidebars, ({ length }) => {
    currentSidebarIndex.value = Math.min(currentSidebarIndex.value, length - 1)
  })

  return {
    currentView,
    isContentView,
    isTimingView,
    isPreviewView,
    selectedLines: selectedLines as ReadonlySet<LyricLine>,
    selectedWords: selectedWords as ReadonlySet<LyricWord>,
    clearSelection,
    clearWordSelection,
    selectLine,
    selectWord,
    selectLineWord,
    applyWordSelectToLine,
    addWordToSelection,
    addLineToSelection,
    removeWordFromSelection,
    removeWordFromSelectionWithoutApply,
    removeLineFromSelection,
    getFirstSelectedLine,
    getFirstSelectedWord,
    isDragging,
    isDraggingCopy,
    canDrop,
    isDraggingWord,
    isDraggingLine,
    openedSidebars,
    currentSidebarIndex,
    sidebarShown,
    openSidebar,
    closeCurrentSidebar,
    toogleSidebar,
    closeSidebar,
  }

  function clearSelection() {
    selectedLines.clear()
    selectedWords.clear()
  }
  function clearWordSelection() {
    selectedWords.clear()
  }
  function selectWord(...words: LyricWord[]) {
    if (words.length === 1 && selectedWords.has(words[0]!)) {
      applyWordSelectToLine()
      return
    }
    clearWordSelection()
    words.forEach((word) => selectedWords.add(word))
    applyWordSelectToLine()
  }
  function selectLine(...lines: LyricLine[]) {
    if (lines.length === 1 && selectedLines.has(lines[0]!)) {
      clearWordSelection()
      return
    }
    clearSelection()
    lines.forEach((line) => selectedLines.add(line))
  }
  function selectLineWord(line: LyricLine, ...words: LyricWord[]) {
    clearSelection()
    selectedLines.add(line)
    words.forEach((word) => selectedWords.add(word))
  }
  function addWordToSelection(...words: LyricWord[]) {
    words.forEach((word) => selectedWords.add(word))
    applyWordSelectToLine()
  }
  function addLineToSelection(...lines: LyricLine[]) {
    lines.forEach((line) => selectedLines.add(line))
    clearWordSelection()
  }
  function removeWordFromSelection(...words: LyricWord[]) {
    words.forEach((word) => selectedWords.delete(word))
    applyWordSelectToLine()
  }
  function removeWordFromSelectionWithoutApply(...words: LyricWord[]) {
    words.forEach((word) => selectedWords.delete(word))
  }
  function removeLineFromSelection(...lines: LyricLine[]) {
    lines.forEach((line) => selectedLines.delete(line))
    clearWordSelection()
  }
  function applyWordSelectToLine() {
    selectedLines.clear()
    if (selectedWords.size === 0) return
    const coreStore = useCoreStore()
    for (const line of coreStore.lyricLines)
      for (const word of line.words) if (selectedWords.has(word)) selectedLines.add(line)
  }
  function getFirstSelectedLine(): LyricLine | null {
    if (selectedLines.size === 0) return null
    return selectedLines.values().next().value!
  }
  function getFirstSelectedWord(): LyricWord | null {
    if (selectedWords.size === 0) return null
    return selectedWords.values().next().value!
  }

  function openSidebar(key: SidebarKey) {
    if (!openedSidebars.includes(key)) {
      openedSidebars.push(key)
      currentSidebarIndex.value = openedSidebars.length - 1
    } else {
      currentSidebarIndex.value = openedSidebars.indexOf(key)
    }
  }
  function closeCurrentSidebar() {
    openedSidebars.splice(currentSidebarIndex.value, 1)
  }
  function toogleSidebar(key: SidebarKey) {
    if (openedSidebars[currentSidebarIndex.value] === key) closeCurrentSidebar()
    else openSidebar(key)
  }
  function closeSidebar(key: SidebarKey) {
    const index = openedSidebars.indexOf(key)
    if (index === -1) return
    openedSidebars.splice(index, 1)
    if (currentSidebarIndex.value >= index)
      currentSidebarIndex.value = Math.max(0, currentSidebarIndex.value - 1)
  }
})
