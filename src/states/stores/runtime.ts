import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowReactive, watch } from 'vue'

import { type LyricLine, type LyricSyllable, View } from '@core/types'

import { type DialogKey, dialogRegs } from '@ui/dialogs'
import type { SidebarKey } from '@ui/sidebar'

import { useCoreStore } from './core'

export const useRuntimeStore = defineStore('runtime', () => {
  // View
  const currentView = ref<View>(View.Content)
  const isContentView = computed(() => currentView.value === View.Content)
  const isTimingView = computed(() => currentView.value === View.Timing)
  const isPreviewView = computed(() => currentView.value === View.Preview)

  // Selection & drag
  const selectedLines = shallowReactive(new Set<LyricLine>())
  const selectedSyllables = shallowReactive(new Set<LyricSyllable>())

  const isDragging = ref(false)
  const isDraggingCopy = ref(false)
  const canDrop = ref(false)
  const isDraggingSyl = computed(() => isDragging.value && selectedSyllables.size > 0)
  const isDraggingLine = computed(
    () => isDragging.value && selectedSyllables.size === 0 && selectedLines.size > 0,
  )

  const openedSidebars = reactive<SidebarKey[]>([])
  const currentSidebarIndex = ref(0)
  const sidebarShown = computed(() => openedSidebars.length > 0)
  watch(openedSidebars, ({ length }) => {
    currentSidebarIndex.value = Math.min(currentSidebarIndex.value, length - 1)
  })

  const dialogShown = reactive(
    (() => {
      const map = {} as Record<DialogKey, boolean>
      for (const { key } of dialogRegs) map[key] = false
      return map
    })(),
  )

  return {
    currentView,
    isContentView,
    isTimingView,
    isPreviewView,
    selectedLines: selectedLines as ReadonlySet<LyricLine>,
    selectedSyllables: selectedSyllables as ReadonlySet<LyricSyllable>,
    clearSelection,
    clearSylSelection,
    selectLine,
    selectSyllable,
    selectLineSyl,
    applySylSelectToLine,
    addSylToSelection,
    addLineToSelection,
    removeSylFromSelection,
    removeSylFromSelectionWithoutApply,
    removeLineFromSelection,
    getFirstSelectedLine,
    getFirstSelectedSyl,
    isDragging,
    isDraggingCopy,
    canDrop,
    isDraggingSyl,
    isDraggingLine,
    openedSidebars,
    currentSidebarIndex,
    sidebarShown,
    dialogShown,
    openSidebar,
    closeCurrentSidebar,
    toogleSidebar,
    closeSidebar,
  }

  function clearSelection() {
    selectedLines.clear()
    selectedSyllables.clear()
  }
  function clearSylSelection() {
    selectedSyllables.clear()
  }
  function selectSyllable(...syls: LyricSyllable[]) {
    if (syls.length === 1 && selectedSyllables.has(syls[0]!)) {
      applySylSelectToLine()
      return
    }
    clearSylSelection()
    syls.forEach((syl) => selectedSyllables.add(syl))
    applySylSelectToLine()
  }
  function selectLine(...lines: LyricLine[]) {
    if (lines.length === 1 && selectedLines.size === 1 && selectedLines.has(lines[0]!)) {
      clearSylSelection()
      return
    }
    clearSelection()
    lines.forEach((line) => selectedLines.add(line))
  }
  function selectLineSyl(line: LyricLine, ...syls: LyricSyllable[]) {
    clearSelection()
    selectedLines.add(line)
    syls.forEach((syl) => selectedSyllables.add(syl))
  }
  function addSylToSelection(...syls: LyricSyllable[]) {
    syls.forEach((syl) => selectedSyllables.add(syl))
    applySylSelectToLine()
  }
  function addLineToSelection(...lines: LyricLine[]) {
    lines.forEach((line) => selectedLines.add(line))
    clearSylSelection()
  }
  function removeSylFromSelection(...syls: LyricSyllable[]) {
    syls.forEach((syl) => selectedSyllables.delete(syl))
    applySylSelectToLine()
  }
  function removeSylFromSelectionWithoutApply(...syls: LyricSyllable[]) {
    syls.forEach((syl) => selectedSyllables.delete(syl))
  }
  function removeLineFromSelection(...lines: LyricLine[]) {
    lines.forEach((line) => selectedLines.delete(line))
    clearSylSelection()
  }
  function applySylSelectToLine() {
    selectedLines.clear()
    if (selectedSyllables.size === 0) return
    const coreStore = useCoreStore()
    for (const line of coreStore.lyricLines)
      for (const syl of line.syllables) if (selectedSyllables.has(syl)) selectedLines.add(line)
  }
  function getFirstSelectedLine(): LyricLine | null {
    if (selectedLines.size === 0) return null
    return selectedLines.values().next().value!
  }
  function getFirstSelectedSyl(): LyricSyllable | null {
    if (selectedSyllables.size === 0) return null
    return selectedSyllables.values().next().value!
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
