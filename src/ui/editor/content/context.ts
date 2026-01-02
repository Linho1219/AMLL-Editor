import { type Ref, nextTick } from 'vue'

import { getHotkeyStr } from '@core/hotkey'
import type { LyricLine } from '@core/types'

import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'

import { alignLineEndTime, alignLineTime } from '@utils/alignLineSylTime'

import type { MenuItem } from 'primevue/menuitem'

interface ContentCtxStates {
  lineIndex: Ref<number | undefined>
  sylIndex: Ref<number | undefined>
}

export function useContentCtxItems({ lineIndex, sylIndex }: ContentCtxStates) {
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  const staticStore = useStaticStore()

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
        if (lineIndex.value === undefined) return
        const newLine = coreStore.newLine()
        coreStore.lyricLines.splice(lineIndex.value, 0, newLine)
        runtimeStore.selectLine(newLine)
      },
    },
  ]
  const lineMenuItems: MenuItem[] = [
    {
      label: '设为对唱',
      icon: 'pi pi-align-right',
      command: () => runtimeStore.selectedLines.forEach((l) => (l.duet = true)),
    },
    {
      label: '设为背景',
      icon: 'pi pi-expand',
      command: () => runtimeStore.selectedLines.forEach((l) => (l.background = true)),
    },
    {
      label: '清除属性',
      icon: 'pi pi-ban',
      command: () => runtimeStore.selectedLines.forEach((l) => (l.duet = l.background = false)),
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
        nextTick(() =>
          staticStore.scrollToHook?.(
            Math.max(0, ...newLines.map((l) => coreStore.lyricLines.indexOf(l))),
            { align: 'nearest' },
          ),
        )
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
        nextTick(() =>
          staticStore.scrollToHook?.(lastLineIndex + duplicates.length, { align: 'nearest' }),
        )
      },
    },
    {
      label: '删除行',
      icon: 'pi pi-trash',
      command: () => {
        coreStore.deleteLine(...runtimeStore.selectedLines)
        runtimeStore.clearSelection()
      },
      tip: getHotkeyStr('delete'),
    },
  ]
  const sylMenuItems: MenuItem[] = [
    {
      label: '在前插入音节',
      icon: 'pi pi-arrow-left',
      command: () => {
        if (lineIndex.value === undefined || sylIndex.value === undefined) return
        const parent = coreStore.lyricLines[lineIndex.value]!
        const newSyllable = coreStore.newSyllable()
        parent.syllables.splice(sylIndex.value, 0, newSyllable)
        runtimeStore.selectLineSyl(parent, newSyllable)
        nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
      },
    },
    {
      label: '在后插入音节',
      icon: 'pi pi-arrow-right',
      command: () => {
        if (lineIndex.value === undefined || sylIndex.value === undefined) return
        const parent = coreStore.lyricLines[lineIndex.value]!
        const newSyllable = coreStore.newSyllable()
        parent.syllables.splice(sylIndex.value + 1, 0, newSyllable)
        runtimeStore.selectLineSyl(parent, newSyllable)
        nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
      },
    },
    {
      label: '在此拆分行',
      icon: 'pi pi-code',
      command: () => {
        if (lineIndex.value === undefined || sylIndex.value === undefined) return
        const parent = coreStore.lyricLines[lineIndex.value]!
        const sylsToMove = parent.syllables.splice(sylIndex.value)
        if (sylsToMove.length === 0) return
        const newLine = coreStore.newLine({ ...parent, syllables: sylsToMove })
        alignLineEndTime(parent)
        alignLineTime(newLine)
        coreStore.lyricLines.splice(lineIndex.value + 1, 0, newLine)
        runtimeStore.selectLineSyl(newLine, sylsToMove[0]!)
      },
      tip: getHotkeyStr('breakLine'),
    },
    {
      label: '删除音节',
      icon: 'pi pi-trash',
      command: () => {
        if (lineIndex.value === undefined || sylIndex.value === undefined) return
        const parent = coreStore.lyricLines[lineIndex.value]!
        parent.syllables.splice(sylIndex.value, 1)
      },
      tip: getHotkeyStr('delete'),
    },
  ]

  const menuItemsMap = {
    blank: blankMenuItems,
    line: lineMenuItems,
    lineInsert: lineInsertMenuItems,
    syl: sylMenuItems,
  } as const
  return menuItemsMap
}
