import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { useRuntimeStore } from './runtime'
import { nanoid } from 'nanoid'
import { alignLineEndTime, alignLineStartTime } from '@utils/alignLineTime'
import type { LyricLine, LyricWord, Metadata } from '@core/types'

const newLine = (attrs: Partial<LyricLine> = {}) =>
  reactive<LyricLine>({
    startTime: 0,
    endTime: 0,
    words: [],
    ignoreInTiming: false,
    bookmarked: false,
    translation: '',
    romanization: '',
    background: false,
    duet: false,
    ...attrs,
    id: nanoid(),
  })

const newWord = (attrs: Partial<LyricWord> = {}) =>
  reactive<LyricWord>({
    startTime: 0,
    endTime: 0,
    text: '',
    placeholdingBeat: 0,
    currentplaceholdingBeat: 0,
    bookmarked: false,
    // comments: [],
    ...attrs,
    id: nanoid(),
  })

export const useCoreStore = defineStore('core', () => {
  // const createdAt = ref(Date.now())
  const metadata = reactive<Metadata>([])
  const lyricLines = reactive<LyricLine[]>([])
  // const comments = reactive<Comment[]>([])
  return {
    // createdAt,
    metadata,
    lyricLines,
    // comments,
    newLine,
    newWord,
    deleteLine,
    deleteWord,
    deleteWordFromLine,
  }

  function deleteLine(...lines: LyricLine[]) {
    const lineSet = new Set(lines)
    const filtered = lyricLines.filter((line) => !lineSet.has(line))
    if (filtered.length === lyricLines.length) return
    lyricLines.length = 0
    lyricLines.push(...filtered)
    const runtimeStore = useRuntimeStore()
    runtimeStore.clearWordSelection()
    lineSet.forEach((line) => runtimeStore.removeLineFromSelection(line))
  }
  function deleteWord(...words: LyricWord[]) {
    const wordSet = new Set(words)
    for (const line of lyricLines) _deleteWordSetFromLine(line, wordSet)
    const runtimeStore = useRuntimeStore()
    wordSet.forEach((word) => runtimeStore.removeWordFromSelectionWithoutApply(word))
  }
  function deleteWordFromLine(line: LyricLine, ...words: LyricWord[]) {
    const wordSet = new Set(words)
    _deleteWordSetFromLine(line, wordSet)
    const runtimeStore = useRuntimeStore()
    wordSet.forEach((word) => runtimeStore.removeWordFromSelectionWithoutApply(word))
  }
  function _deleteWordSetFromLine(line: LyricLine, wordSet: Set<LyricWord>) {
    const original = line.words
    const filtered = original.filter((word) => !wordSet.has(word))
    if (filtered.length === original.length) return
    line.words = filtered
    if (original[0] !== filtered[0]) alignLineStartTime(line)
    if (original.at(-1) !== filtered.at(-1)) alignLineEndTime(line)
  }
})
export const coreCreate = { newLine, newWord }
