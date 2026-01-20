import { t } from '@i18n'
import { type Ref, computed, nextTick } from 'vue'

import { getHotkeyStr } from '@core/hotkey'
import type { LyricLine } from '@core/types'

import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'

import { alignLineEndTime, alignLineTime } from '@utils/alignLineSylTime'

import type { MenuItem } from 'primevue/menuitem'

import { toogleAttr } from '../shared'

interface ContentCtxStates {
  lineIndex: Ref<number | undefined>
  sylIndex: Ref<number | undefined>
}

const tt = t.editor.context

export function useContentCtxItems({ lineIndex, sylIndex }: ContentCtxStates) {
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  const staticStore = useStaticStore()

  const blankMenuItems = computed<MenuItem[]>(() => [
    {
      label: tt.blank.insertLine(),
      icon: 'pi pi-plus',
      command: () => {
        const newLine = coreStore.newLine()
        coreStore.lyricLines.push(newLine)
        runtimeStore.selectLine(newLine)
      },
    },
  ])
  const lineInsertMenuItems = computed<MenuItem[]>(() => [
    {
      label: tt.betweenLines.insertLine(),
      icon: 'pi pi-plus',
      command: () => {
        if (lineIndex.value === undefined) return
        const newLine = coreStore.newLine()
        coreStore.lyricLines.splice(lineIndex.value, 0, newLine)
        runtimeStore.selectLine(newLine)
      },
    },
  ])

  //#region Line
  const toggleDuet = () => toogleAttr('duet')
  const toggleBackground = () => toogleAttr('background')

  function insertLine(delta: 0 | 1) {
    const newLines: LyricLine[] = []
    for (const line of runtimeStore.selectedLines) {
      const newLine = coreStore.newLine()
      newLines.push(newLine)
      const lineIndex = coreStore.lyricLines.indexOf(line)
      if (lineIndex === -1) continue
      coreStore.lyricLines.splice(lineIndex + delta, 0, newLine)
    }
    runtimeStore.selectLine(...newLines)
    nextTick(() =>
      staticStore.scrollToHook?.(
        Math.max(0, ...newLines.map((l) => coreStore.lyricLines.indexOf(l))),
        { align: 'nearest' },
      ),
    )
  }
  const insertLineAfter = () => insertLine(1)
  const insertLineBefore = () => insertLine(0)

  function duplicateLine() {
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
    nextTick(() =>
      staticStore.scrollToHook?.(lastLineIndex + duplicates.length, { align: 'nearest' }),
    )
  }

  function deleteLine() {
    coreStore.deleteLine(...runtimeStore.selectedLines)
    runtimeStore.clearSelection()
  }

  const lineMenuItems = computed<MenuItem[]>(() => [
    {
      label: tt.line.toggleDuet(),
      icon: 'pi pi-align-right',
      command: toggleDuet,
      tip: getHotkeyStr('duet'),
    },
    {
      label: tt.line.toggleBackground(),
      icon: 'pi pi-expand',
      command: toggleBackground,
      tip: getHotkeyStr('background'),
    },
    { separator: true },
    {
      label: tt.line.insertLineAbove(),
      icon: 'pi pi-arrow-up',
      command: insertLineBefore,
    },
    {
      label: tt.line.insertLineBelow(),
      icon: 'pi pi-arrow-down',
      command: insertLineAfter,
    },
    {
      label: tt.line.duplicateLine(),
      icon: 'pi pi-clone',
      command: duplicateLine,
    },
    {
      label: tt.line.deleteLine(),
      icon: 'pi pi-trash',
      command: deleteLine,
      tip: getHotkeyStr('delete'),
    },
  ])
  //#endregion

  //#region Syllable
  function insertSyl(delta: 0 | 1) {
    if (lineIndex.value === undefined || sylIndex.value === undefined) return
    const parent = coreStore.lyricLines[lineIndex.value]!
    const newSyllable = coreStore.newSyllable()
    parent.syllables.splice(sylIndex.value + delta, 0, newSyllable)
    runtimeStore.selectLineSyl(parent, newSyllable)
    nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
  }
  const insertSylBefore = () => insertSyl(0)
  const insertSylAfter = () => insertSyl(1)

  function breakLineAtSyl() {
    if (lineIndex.value === undefined || sylIndex.value === undefined) return
    const parent = coreStore.lyricLines[lineIndex.value]!
    const sylsToMove = parent.syllables.splice(sylIndex.value)
    if (sylsToMove.length === 0) return
    const newLine = coreStore.newLine({ ...parent, syllables: sylsToMove })
    alignLineEndTime(parent)
    alignLineTime(newLine)
    coreStore.lyricLines.splice(lineIndex.value + 1, 0, newLine)
    runtimeStore.selectLineSyl(newLine, sylsToMove[0]!)
  }

  function deleteSyl() {
    if (lineIndex.value === undefined || sylIndex.value === undefined) return
    const parent = coreStore.lyricLines[lineIndex.value]!
    parent.syllables.splice(sylIndex.value, 1)
  }

  const sylMenuItems = computed<MenuItem[]>(() => [
    {
      label: tt.syllable.insertSylBefore(),
      icon: 'pi pi-arrow-left',
      command: insertSylBefore,
    },
    {
      label: tt.syllable.insertSylAfter(),
      icon: 'pi pi-arrow-right',
      command: insertSylAfter,
    },
    {
      label: tt.syllable.breakLineAtSyl(),
      icon: 'pi pi-code',
      command: breakLineAtSyl,
      tip: getHotkeyStr('breakLine'),
    },
    {
      label: tt.syllable.deleteSyl(),
      icon: 'pi pi-trash',
      command: deleteSyl,
      tip: getHotkeyStr('delete'),
    },
  ])
  //#endregion

  const menuItemsMap = {
    blank: blankMenuItems,
    line: lineMenuItems,
    lineInsert: lineInsertMenuItems,
    syl: sylMenuItems,
  } as const

  return menuItemsMap
}
