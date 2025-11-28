<template>
  <div class="editor timing" data-escape-auto-blur @mousedown="handleMouseDown">
    <VList
      :data="coreStore.lyricLines"
      class="editor-scroller"
      #default="{ item: line, index: lineIndex }"
      ref="vscroll"
    >
      <div :key="line.id" class="line-item-shell">
        <Line :line="line" :index="lineIndex">
          <template v-for="word in line.words" :key="word.id">
            <Word
              :word="word"
              :parent="line"
              :parent-index="lineIndex"
              v-if="word.text.trim()"
              @need-scroll="handleScrollTo"
            />
          </template>
        </Line>
      </div>
    </VList>
  </div>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { VList } from 'virtua/vue'
import Line from './TimingLine.vue'
import Word from './TimingWord.vue'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useRuntimeStore, View } from '@/stores/runtime'
import { useGlobalKeyboard } from '@/utils/hotkey'
import { useStaticStore, type EditorComponentActions } from '@/stores/static'
import { usePreferenceStore } from '@/stores/preference'
import type { ScrollToIndexOpts } from 'virtua/unstable_core'

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

const vscroll = useTemplateRef('vscroll')
function handleScrollTo(lineIndex: number) {
  vscroll.value?.scrollToIndex(lineIndex, { align: 'center' })
}
onMounted(() => {
  if (runtimeStore.selectedWords.size > 1) runtimeStore.clearWordSelection()
  if (runtimeStore.selectedLines.size) {
    const firstLine = runtimeStore.getFirstSelectedLine()!
    const lineIndex = coreStore.lyricLines.indexOf(firstLine)
    if (lineIndex !== -1) handleScrollTo(lineIndex)
  }
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

const shouldIgnore = (line: LyricLine) =>
  line.ignoreInTiming || (preferenceStore.alwaysIgnoreBackground && line.background)

function findNextLineWord(
  word: LyricWord,
): [lineIndex: number, line: LyricLine, word: LyricWord] | null {
  if (!word) return null
  let found = false
  for (const [lineIndex, line] of coreStore.lyricLines.entries()) {
    if (!found) {
      const wordIndex = line.words.indexOf(word)
      if (wordIndex === -1) continue
      for (let i = wordIndex + 1; i < line.words.length; i++) {
        const nextWord = line.words[i]!
        if (nextWord.text.trim()) return [lineIndex, line, nextWord]
      }
      found = true
    } else {
      if (shouldIgnore(line)) continue
      if (line.words.length === 0) continue
      return [lineIndex, line, line.words[0]!]
    }
  }
  return null
}
function findLastLineWord(
  word: LyricWord,
): [lineIndex: number, line: LyricLine, word: LyricWord] | null {
  if (!word) return null
  let found = false
  for (let lineIndex = coreStore.lyricLines.length - 1; lineIndex >= 0; lineIndex--) {
    const line = coreStore.lyricLines[lineIndex]!
    if (!found) {
      const wordIndex = line.words.indexOf(word)
      if (wordIndex === -1) continue
      for (let i = wordIndex - 1; i >= 0; i--) {
        const prevWord = line.words[i]!
        if (prevWord.text.trim()) return [lineIndex, line, prevWord]
      }
      found = true
    } else {
      if (shouldIgnore(line)) continue
      if (line.words.length === 0) continue
      return [lineIndex, line, line.words.at(-1)!]
    }
  }
  return null
}

function isWordFirstOfLine(line: LyricLine, word: LyricWord) {
  for (const w of line.words) if (w.text.trim()) return w === word
  return false
}
function isWordLastOfLine(line: LyricLine, word: LyricWord) {
  for (let i = line.words.length - 1; i >= 0; i--) {
    const w = line.words[i]!
    if (w.text.trim()) return w === word
  }
  return false
}

const preferenceStore = usePreferenceStore()
const getAmendedProgress = () => {
  return staticStore.audio.getProgress() - staticStore.audio.amendmentRef.value
}
useGlobalKeyboard('markBegin', () => {
  if (runtimeStore.selectedWords.size !== 1) return
  preferenceStore.scrollWithPlayback = false
  const word = runtimeStore.getFirstSelectedWord()!
  const line = runtimeStore.getFirstSelectedLine()!
  word.startTime = getAmendedProgress()
  word.currentplaceholdingBeat = 0
  if (isWordFirstOfLine(line, word)) line.startTime = word.startTime
  const lineIndex = coreStore.lyricLines.indexOf(runtimeStore.getFirstSelectedLine()!)
  if (lineIndex === -1) return
  handleScrollTo(lineIndex)
})
useGlobalKeyboard('markEnd', () => {
  if (runtimeStore.selectedWords.size !== 1) return
  preferenceStore.scrollWithPlayback = false
  const word = runtimeStore.getFirstSelectedWord()!
  const line = runtimeStore.getFirstSelectedLine()!
  const progress = getAmendedProgress()
  word.endTime = progress
  if (isWordLastOfLine(line, word)) line.endTime = word.endTime
  const next = findNextLineWord(word)
  if (!next) return
  const [nextWordLineIndex, nextWordLine, nextWord] = next
  runtimeStore.selectLineWord(nextWordLine, nextWord)
  handleScrollTo(nextWordLineIndex)
})
useGlobalKeyboard('markEndBegin', () => {
  if (runtimeStore.selectedWords.size !== 1) return
  preferenceStore.scrollWithPlayback = false
  const word = runtimeStore.getFirstSelectedWord()!
  const line = runtimeStore.getFirstSelectedLine()!
  if (word.currentplaceholdingBeat < word.placeholdingBeat) {
    word.currentplaceholdingBeat++
    return
  }
  word.currentplaceholdingBeat = 0
  const progress = getAmendedProgress()
  word.endTime = progress
  if (isWordLastOfLine(line, word)) line.endTime = word.endTime
  const next = findNextLineWord(word)
  if (!next) return
  const [nextWordLineIndex, nextWordLine, nextWord] = next
  nextWord.startTime = progress
  if (isWordFirstOfLine(nextWordLine, nextWord)) nextWordLine.startTime = progress
  runtimeStore.selectLineWord(nextWordLine, nextWord)
  handleScrollTo(nextWordLineIndex)
})

function shiftLine(shift: 1 | -1): LyricLine | undefined {
  const line = runtimeStore.getFirstSelectedLine()
  const word = runtimeStore.getFirstSelectedWord()
  if (!line || !word) return
  let nextLineIndex = coreStore.lyricLines.indexOf(line) + shift
  while (
    nextLineIndex >= 0 &&
    nextLineIndex < coreStore.lyricLines.length &&
    shouldIgnore(coreStore.lyricLines[nextLineIndex]!)
  )
    nextLineIndex += shift
  const nextLine = coreStore.lyricLines[nextLineIndex]
  if (!nextLine) return
  const lastWordFilteredIndex = line.words.filter((w) => w.text.trim()).indexOf(word)
  const filteredTargetWords = nextLine.words.filter((w) => w.text.trim())
  if (filteredTargetWords.length === 0) return
  const targetWord = filteredTargetWords[lastWordFilteredIndex] ?? filteredTargetWords.at(-1)
  if (!targetWord) return
  runtimeStore.selectLineWord(nextLine, targetWord)
  handleScrollTo(nextLineIndex)
  return nextLine
}
useGlobalKeyboard('goNextLine', () => {
  shiftLine(1)
})
useGlobalKeyboard('goPrevLine', () => {
  shiftLine(-1)
})

const shiftWord = (delta: 1 | -1): LyricWord | undefined => {
  const currWord = runtimeStore.getFirstSelectedWord()
  if (!currWord) return
  const result = delta === 1 ? findNextLineWord(currWord) : findLastLineWord(currWord)
  if (!result) return
  const [lineIndex, line, word] = result
  runtimeStore.selectLineWord(line, word)
  handleScrollTo(lineIndex)
  return word
}
useGlobalKeyboard('goNextWord', () => {
  shiftWord(1)
})
useGlobalKeyboard('goNextWordnPlay', () => {
  const word = shiftWord(1)
  if (word && word.startTime) staticStore.audio.seek(word.startTime)
})
useGlobalKeyboard('goPrevWord', () => {
  shiftWord(-1)
})
useGlobalKeyboard('goPrevWordnPlay', () => {
  const word = shiftWord(-1)
  if (word && word.startTime) staticStore.audio.seek(word.startTime)
})
useGlobalKeyboard('playCurrWord', () => {
  const word = runtimeStore.getFirstSelectedWord()
  if (word && word.startTime) staticStore.audio.seek(word.startTime)
})

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  runtimeStore.clearSelection()
}

const editorHook: EditorComponentActions = {
  view: View.Timing,
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
.editor-scroller {
  height: 100%;
}
</style>
