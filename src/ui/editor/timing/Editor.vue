<template>
  <div class="editor timing" data-escape-auto-blur @mousedown="handleMouseDown">
    <VList
      :data="coreStore.lyricLines"
      class="editor-scroller"
      #default="{ item: line, index: lineIndex }"
      ref="vscroll"
    >
      <div
        :key="line.id"
        class="line-item-shell"
        v-if="(<LyricLine>line).syllables.some((s) => s.text.trim())"
      >
        <Line :line="line" :index="lineIndex">
          <template v-for="syllable in (<LyricLine>line).syllables" :key="syllable.id">
            <Syllable
              :syllable="syllable"
              :parent="line"
              :parent-index="lineIndex"
              v-if="syllable.text.trim()"
              @need-scroll="handleScrollTo"
            />
          </template>
        </Line>
      </div>
    </VList>
    <EmptyTip
      v-if="coreStore.lyricLines.length === 0"
      title="没有歌词行"
      tip="使用「打开」菜单加载内容，或右键空白处插入新行"
    />
    <EmptyTip
      v-else-if="coreStore.lyricLines.every((line) => !line.syllables.some((s) => s.text.trim()))"
      title="所有行均为空"
      tip="使用「打开」菜单加载内容，或在内容视图下编辑"
    />
  </div>
</template>

<script setup lang="ts">
import type { ScrollToIndexOpts } from 'virtua/unstable_core'
import { VList } from 'virtua/vue'
import { onBeforeUnmount, onMounted, onUnmounted, useTemplateRef } from 'vue'

import { useGlobalKeyboard } from '@core/hotkey'
import { type LyricLine, type LyricSyllable, View } from '@core/types'

import { useCoreStore, usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'
import type { EditorComponentActions } from '@states/stores/static'

import { tryRaf } from '@utils/tryRaf'

import Line from './Line.vue'
import Syllable from './Syllable.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

const vscroll = useTemplateRef('vscroll')
function handleScrollTo(lineIndex: number) {
  vscroll.value?.scrollToIndex(lineIndex, { align: 'center', smooth: true })
  // smooth:true can have negative performance impact
  // but here handleScrollTo is triggered by components in view
  // so a short distance scroll is expected
  // besides, smooth scrolling in a table-like editor can help users track the movement
}
// onBeforeUnmounted instead of onUnmounted: vscroll quits at unmounted phase
onBeforeUnmount(() => {
  if (runtimeStore.currentView !== View.Content || !vscroll.value) return
  const start = vscroll.value.findStartIndex()
  const end = vscroll.value.findEndIndex()
  const centerIndex = Math.floor((start + end) / 2)
  tryRaf(() => {
    if (staticStore.editorHook?.view !== View.Content) return
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

const shouldIgnore = (line: LyricLine) =>
  line.ignoreInTiming ||
  (prefStore.alwaysIgnoreBackground && line.background) ||
  !line.syllables.length ||
  line.syllables.every((s) => !s.text.trim())

function findNextLineSyl(
  syl: LyricSyllable,
): [lineIndex: number, line: LyricLine, syl: LyricSyllable] | null {
  if (!syl) return null
  let found = false
  for (const [lineIndex, line] of coreStore.lyricLines.entries()) {
    if (!found) {
      const sylIndex = line.syllables.indexOf(syl)
      if (sylIndex === -1) continue
      for (let i = sylIndex + 1; i < line.syllables.length; i++) {
        const nextSyl = line.syllables[i]!
        if (nextSyl.text.trim()) return [lineIndex, line, nextSyl]
      }
      found = true
    } else {
      if (shouldIgnore(line)) continue
      if (line.syllables.length === 0) continue
      return [lineIndex, line, line.syllables[0]!]
    }
  }
  return null
}
function findLastLineSyl(
  syl: LyricSyllable,
): [lineIndex: number, line: LyricLine, syl: LyricSyllable] | null {
  if (!syl) return null
  let found = false
  for (let lineIndex = coreStore.lyricLines.length - 1; lineIndex >= 0; lineIndex--) {
    const line = coreStore.lyricLines[lineIndex]!
    if (!found) {
      const sylIndex = line.syllables.indexOf(syl)
      if (sylIndex === -1) continue
      for (let i = sylIndex - 1; i >= 0; i--) {
        const prevSyl = line.syllables[i]!
        if (prevSyl.text.trim()) return [lineIndex, line, prevSyl]
      }
      found = true
    } else {
      if (shouldIgnore(line)) continue
      if (line.syllables.length === 0) continue
      return [lineIndex, line, line.syllables.at(-1)!]
    }
  }
  return null
}

function isSylFirstOfLine(line: LyricLine, syl: LyricSyllable) {
  for (const w of line.syllables) if (w.text.trim()) return w === syl
  return false
}
function isSylLastOfLine(line: LyricLine, syl: LyricSyllable) {
  for (let i = line.syllables.length - 1; i >= 0; i--) {
    const s = line.syllables[i]!
    if (s.text.trim()) return s === syl
  }
  return false
}

const { amendedProgressComputed } = staticStore.audio

const prefStore = usePrefStore()
useGlobalKeyboard('markBegin', () => {
  if (runtimeStore.selectedSyllables.size !== 1) return
  prefStore.scrollWithPlayback = false
  const syl = runtimeStore.getFirstSelectedSyl()!
  const line = runtimeStore.getFirstSelectedLine()!
  syl.startTime = amendedProgressComputed.value
  syl.currentplaceholdingBeat = 0
  if (isSylFirstOfLine(line, syl)) line.startTime = syl.startTime
  const lineIndex = coreStore.lyricLines.indexOf(runtimeStore.getFirstSelectedLine()!)
  if (lineIndex === -1) return
  handleScrollTo(lineIndex)
})
useGlobalKeyboard('markEnd', () => {
  if (runtimeStore.selectedSyllables.size !== 1) return
  prefStore.scrollWithPlayback = false
  const syl = runtimeStore.getFirstSelectedSyl()!
  const line = runtimeStore.getFirstSelectedLine()!
  syl.endTime = amendedProgressComputed.value
  if (isSylLastOfLine(line, syl)) line.endTime = syl.endTime
  const next = findNextLineSyl(syl)
  if (!next) return
  const [nextSylLineIndex, nextSylLine, nextSyl] = next
  runtimeStore.selectLineSyl(nextSylLine, nextSyl)
  handleScrollTo(nextSylLineIndex)
})
useGlobalKeyboard('markEndBegin', () => {
  if (runtimeStore.selectedSyllables.size !== 1) return
  prefStore.scrollWithPlayback = false
  const syl = runtimeStore.getFirstSelectedSyl()!
  const line = runtimeStore.getFirstSelectedLine()!
  if (syl.currentplaceholdingBeat < syl.placeholdingBeat) {
    syl.currentplaceholdingBeat++
    return
  }
  syl.currentplaceholdingBeat = 0
  const progress = amendedProgressComputed.value
  syl.endTime = progress
  if (isSylLastOfLine(line, syl)) line.endTime = syl.endTime
  const next = findNextLineSyl(syl)
  if (!next) return
  const [nextSylLineIndex, nextSylLine, nextSyl] = next
  nextSyl.startTime = progress
  nextSyl.currentplaceholdingBeat = 0
  if (isSylFirstOfLine(nextSylLine, nextSyl)) nextSylLine.startTime = progress
  runtimeStore.selectLineSyl(nextSylLine, nextSyl)
  handleScrollTo(nextSylLineIndex)
})

function shiftLine(shift: 1 | -1): LyricLine | undefined {
  const line = runtimeStore.getFirstSelectedLine()
  const syl = runtimeStore.getFirstSelectedSyl()
  if (!line || !syl) return
  let nextLineIndex = coreStore.lyricLines.indexOf(line) + shift
  while (
    nextLineIndex >= 0 &&
    nextLineIndex < coreStore.lyricLines.length &&
    shouldIgnore(coreStore.lyricLines[nextLineIndex]!)
  )
    nextLineIndex += shift
  const nextLine = coreStore.lyricLines[nextLineIndex]
  if (!nextLine) return
  const lastSylFilteredIndex = line.syllables.filter((s) => s.text.trim()).indexOf(syl)
  const filteredTargetSyls = nextLine.syllables.filter((s) => s.text.trim())
  if (filteredTargetSyls.length === 0) return
  const targetSyl = filteredTargetSyls[lastSylFilteredIndex] ?? filteredTargetSyls.at(-1)
  if (!targetSyl) return
  runtimeStore.selectLineSyl(nextLine, targetSyl)
  handleScrollTo(nextLineIndex)
  return nextLine
}
useGlobalKeyboard('goNextLine', () => {
  shiftLine(1)
})
useGlobalKeyboard('goPrevLine', () => {
  shiftLine(-1)
})

const shiftSyl = (delta: 1 | -1): LyricSyllable | undefined => {
  const currSyl = runtimeStore.getFirstSelectedSyl()
  if (!currSyl) return
  const result = delta === 1 ? findNextLineSyl(currSyl) : findLastLineSyl(currSyl)
  if (!result) return
  const [lineIndex, line, syl] = result
  runtimeStore.selectLineSyl(line, syl)
  handleScrollTo(lineIndex)
  return syl
}
useGlobalKeyboard('goNextSyl', () => {
  shiftSyl(1)
})
useGlobalKeyboard('goNextSylnPlay', () => {
  const syl = shiftSyl(1)
  if (syl && syl.startTime) staticStore.audio.seek(syl.startTime)
})
useGlobalKeyboard('goPrevSyl', () => {
  shiftSyl(-1)
})
useGlobalKeyboard('goPrevSylnPlay', () => {
  const syl = shiftSyl(-1)
  if (syl && syl.startTime) staticStore.audio.seek(syl.startTime)
})
useGlobalKeyboard('playCurrSyl', () => {
  const syl = runtimeStore.getFirstSelectedSyl()
  if (syl && syl.startTime) staticStore.audio.seek(syl.startTime)
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
