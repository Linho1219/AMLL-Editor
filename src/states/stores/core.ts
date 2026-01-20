import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { reactive } from 'vue'

import type { LyricLine, LyricSyllable, MetadataMap } from '@core/types'

import { alignLineEndTime, alignLineStartTime } from '@utils/alignLineSylTime'

import { useRuntimeStore } from './runtime'

const newLine = (attrs: Partial<LyricLine> = {}) =>
  reactive<LyricLine>({
    startTime: 0,
    endTime: 0,
    syllables: [],
    ignoreInTiming: false,
    bookmarked: false,
    translation: '',
    romanization: '',
    background: false,
    duet: false,
    ...attrs,
    id: nanoid(),
  })

const newSyllable = (attrs: Partial<LyricSyllable> = {}) =>
  reactive<LyricSyllable>({
    startTime: 0,
    endTime: 0,
    text: '',
    romanization: '',
    placeholdingBeat: 0,
    currentplaceholdingBeat: 0,
    bookmarked: false,
    // comments: [],
    ...attrs,
    id: nanoid(),
  })

export const useCoreStore = defineStore('core', () => {
  // const createdAt = ref(Date.now())
  const metadata = reactive<MetadataMap>({})
  const lyricLines = reactive<LyricLine[]>([])
  // const comments = reactive<Comment[]>([])
  return {
    // createdAt,
    metadata,
    lyricLines,
    // comments,
    newLine,
    newSyllable,
    deleteLine,
    deleteSyllable,
    deleteSylFromLine,
  }

  function deleteLine(...lines: LyricLine[]) {
    const lineSet = new Set(lines)
    const filtered = lyricLines.filter((line) => !lineSet.has(line))
    if (filtered.length === lyricLines.length) return
    lyricLines.length = 0
    lyricLines.push(...filtered)
    const runtimeStore = useRuntimeStore()
    runtimeStore.clearSylSelection()
    lineSet.forEach((line) => runtimeStore.removeLineFromSelection(line))
  }
  function deleteSyllable(...syls: LyricSyllable[]) {
    const sylSet = new Set(syls)
    for (const line of lyricLines) _deleteSylSetFromLine(line, sylSet)
    const runtimeStore = useRuntimeStore()
    sylSet.forEach((syl) => runtimeStore.removeSylFromSelectionWithoutApply(syl))
  }
  function deleteSylFromLine(line: LyricLine, ...syls: LyricSyllable[]) {
    const sylSet = new Set(syls)
    _deleteSylSetFromLine(line, sylSet)
    const runtimeStore = useRuntimeStore()
    sylSet.forEach((syl) => runtimeStore.removeSylFromSelectionWithoutApply(syl))
  }
  function _deleteSylSetFromLine(line: LyricLine, sylSet: Set<LyricSyllable>) {
    const original = line.syllables
    const filtered = original.filter((syl) => !sylSet.has(syl))
    if (filtered.length === original.length) return
    line.syllables = filtered
    if (original[0] !== filtered[0]) alignLineStartTime(line)
    if (original.at(-1) !== filtered.at(-1)) alignLineEndTime(line)
  }
})
export const coreCreate = { newLine, newSyllable }
