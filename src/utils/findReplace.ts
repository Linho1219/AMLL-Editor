import { useCoreStore } from '@/stores/core'
import { usePreferenceStore } from '@/stores/preference'
import { useRuntimeStore, View } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { computed, shallowRef, watch, type Reactive } from 'vue'
import { tryRaf } from './tryRaf'

const MAX_SEARCH_STEPS = 100000

interface FindReplaceState {
  compiledPattern: RegExp | null
  replaceInput: string
  findInWords: boolean
  findInTranslations: boolean
  findInRoman: boolean
  crossWordMatch: boolean
  wrapSearch: boolean
}
interface Notification {
  severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'
  summary: string
  detail?: string
}
interface FindReplaceActions {
  handleFindNext: () => void
  handleFindPrev: () => void
  handleReplace: () => void
  handleReplaceAll: () => void
}

interface DocPosBasic {
  lineIndex: number
}
interface DocPosLine extends DocPosBasic {
  field: 'translation' | 'roman'
}
interface DocPosWhole extends DocPosBasic {
  field: 'whole'
}
interface DocPosWord extends DocPosBasic {
  field: 'word'
  wordIndex: number
}
interface DocPosMultiWord extends DocPosBasic {
  field: 'multiWord'
  startWordIndex: number
  endWordIndex: number
}
type DocPos = DocPosWhole | DocPosLine | DocPosWord | DocPosMultiWord
type NoWholeDocPos = DocPosLine | DocPosWord | DocPosMultiWord
type Direction = 'next' | 'prev'

export function useFindReplaceEngine(
  __state: Readonly<Reactive<FindReplaceState>>,
  notifier: (n: Notification) => void,
): FindReplaceActions {
  const state = __state
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  const staticStore = useStaticStore()
  const preferenceStore = usePreferenceStore()

  const compiledPatternGlobal = computed<RegExp | null>(() => {
    if (state.compiledPattern === null) return null
    const flags = state.compiledPattern.flags
    return new RegExp(state.compiledPattern.source, flags.includes('g') ? flags : flags + 'g')
  })

  function getCurrPos(): DocPos | null {
    const currLine = runtimeStore.getFirstSelectedLine()
    if (!currLine) return null
    const lineIndex = coreStore.lyricLines.indexOf(currLine)
    const currWord = runtimeStore.getFirstSelectedWord()
    if (currWord) {
      const wordIndex = currLine.words.indexOf(currWord)
      return {
        lineIndex,
        field: 'word',
        wordIndex,
      }
    }
    const focusedEl = document.activeElement as HTMLElement | null
    if (!focusedEl) return null
    const lineFieldKey = focusedEl.dataset.lineFieldKey as 'translation' | 'roman' | undefined
    if (lineFieldKey && (lineFieldKey === 'translation' || lineFieldKey === 'roman'))
      return {
        lineIndex,
        field: lineFieldKey,
      }
    return { lineIndex, field: 'whole' }
  }
  const currPos = shallowRef<DocPos | null>(null)
  watch(
    [() => runtimeStore.selectedLines, () => runtimeStore.selectedWords],
    () => (currPos.value = getCurrPos()),
    { immediate: true },
  )

  function getNextPos(nullablePos: DocPos | null): NoWholeDocPos | null {
    if (!coreStore.lyricLines.length) return null
    const pos = nullablePos ?? { lineIndex: 0, field: 'whole' }
    const [firstSecField, lastSecField] = preferenceStore.swapTranslateRoman
      ? (['roman', 'translation'] as const)
      : (['translation', 'roman'] as const)

    function getFirstPosOfLine(lineIndex: number): NoWholeDocPos | null {
      if (lineIndex >= coreStore.lyricLines.length) return null
      const line = coreStore.lyricLines[lineIndex]!
      if (!line.words.length) return { lineIndex, field: firstSecField }
      if (state.crossWordMatch)
        return {
          lineIndex,
          field: 'multiWord',
          startWordIndex: 0,
          endWordIndex: line.words.length - 1,
        }
      return {
        lineIndex,
        field: 'word',
        wordIndex: 0,
      }
    }

    switch (pos.field) {
      case 'whole':
        return getFirstPosOfLine(pos.lineIndex)
      case 'word':
      case 'multiWord': {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        const currentWordIndex = pos.field === 'word' ? pos.wordIndex : pos.endWordIndex
        const nextWordIndex = currentWordIndex + 1
        if (nextWordIndex >= currLine.words.length)
          return {
            lineIndex: pos.lineIndex,
            field: firstSecField,
          }
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: 'multiWord',
            startWordIndex: nextWordIndex,
            endWordIndex: currLine.words.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: 'word',
          wordIndex: nextWordIndex,
        }
      }
      case firstSecField:
        return {
          lineIndex: pos.lineIndex,
          field: lastSecField,
        }
      case lastSecField:
        return getFirstPosOfLine(pos.lineIndex + 1)
      default:
        throw new Error('Unreachable: Invalid DocPos field.')
    }
  }

  function getPrevPos(nullablePos: DocPos | null): NoWholeDocPos | null {
    if (!coreStore.lyricLines.length) return null
    const pos = nullablePos ?? { lineIndex: coreStore.lyricLines.length - 1, field: 'whole' }
    const [firstSecField, lastSecField] = preferenceStore.swapTranslateRoman
      ? (['roman', 'translation'] as const)
      : (['translation', 'roman'] as const)

    function getLastPosOfLine(lineIndex: number): NoWholeDocPos | null {
      if (lineIndex < 0) return null
      return {
        lineIndex,
        field: lastSecField,
      }
    }

    switch (pos.field) {
      case 'whole':
        return getLastPosOfLine(pos.lineIndex)
      case 'word':
      case 'multiWord': {
        const currentWordIndex = pos.field === 'word' ? pos.wordIndex : pos.startWordIndex
        const prevWordIndex = currentWordIndex - 1
        if (prevWordIndex < 0) return getLastPosOfLine(pos.lineIndex - 1)
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: 'multiWord',
            startWordIndex: 0,
            endWordIndex: prevWordIndex,
          }
        else
          return {
            lineIndex: pos.lineIndex,
            field: 'word',
            wordIndex: prevWordIndex,
          }
      }
      case lastSecField:
        return {
          lineIndex: pos.lineIndex,
          field: firstSecField,
        }
      case firstSecField: {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        if (!currLine.words.length) return getLastPosOfLine(pos.lineIndex - 1)
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: 'multiWord',
            startWordIndex: 0,
            endWordIndex: currLine.words.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: 'word',
          wordIndex: currLine.words.length - 1,
        }
      }
      default:
        throw new Error('Unreachable: Invalid DocPos field.')
    }
  }

  function checkPosInRange(pos: NoWholeDocPos): boolean {
    if (pos.field === 'word' && !state.findInWords) return false
    if (pos.field === 'translation' && !state.findInTranslations) return false
    if (pos.field === 'roman' && !state.findInRoman) return false
    return true
  }
  function getRangedJumpPos(direction: Direction, beginPos: DocPos | null) {
    const jumper = direction === 'next' ? getNextPos : getPrevPos
    let wrappedBack = false
    let stepCount = 0
    return (pos: DocPos | null, forceDisableWrap = false): NoWholeDocPos | null => {
      while (true) {
        if (stepCount++ > MAX_SEARCH_STEPS)
          throw new Error('Exceeded maximum search steps in getRangedJumpPos, aborting.')
        const nextPos = jumper(pos)
        if (nextPos) {
          if (wrappedBack) {
            const compared = comparePos(nextPos, beginPos!, direction)
            if (direction === 'next' && compared >= 0) return null
            if (direction === 'prev' && compared <= 0) return null
          }
        } else {
          if (!state.wrapSearch || forceDisableWrap) return null
          if (!beginPos) return null
          if (wrappedBack) {
            console.warn('Wrapped back already, no valid positions found in range.')
            return null
          }
          wrappedBack = true
        }
        if (nextPos && checkPosInRange(nextPos)) return nextPos
        pos = nextPos
      }
    }
  }
  function focusPosInEditor(pos: DocPos) {
    let shouldSwitchToContent = false
    switch (pos.field) {
      case 'whole': {
        runtimeStore.selectLine(coreStore.lyricLines[pos.lineIndex]!)
        break
      }
      case 'word': {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const word = line.words[pos.wordIndex]!
        runtimeStore.selectLineWord(line, word)
        if (!word.text.trim()) shouldSwitchToContent = true
        if (runtimeStore.isContentView || shouldSwitchToContent)
          tryRaf(() => {
            const hook = staticStore.wordHooks.get(word.id)
            if (!hook) return
            hook.hightLightInput()
            return true
          })
        break
      }
      case 'multiWord': {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const words = line.words.slice(pos.startWordIndex, pos.endWordIndex + 1)
        runtimeStore.selectLineWord(line, ...words)
        // Only when all words are empty we switch to content view (show empty words)
        // otherwise just stay
        if (words.every((w) => !w.text.trim())) shouldSwitchToContent = true
        break
      }
      case 'translation':
      case 'roman': {
        shouldSwitchToContent = true
        const line = coreStore.lyricLines[pos.lineIndex]!
        runtimeStore.selectLine(line)
        tryRaf(() => {
          const hook = staticStore.lineHooks.get(line.id)
          if (!hook) return
          if (pos.field === 'translation') hook.hightLightTranslation()
          else hook.hightLightRoman()
          return true
        })
        break
      }
    }
    if (shouldSwitchToContent) {
      if (!runtimeStore.isContentView) runtimeStore.currentView = View.Content
      tryRaf(() => {
        if (!staticStore.editorHook || staticStore.editorHook.view !== View.Content) return
        staticStore.editorHook.scrollTo(pos.lineIndex, { align: 'nearest' })
        return true
      })
    } else
      tryRaf(() => {
        if (!staticStore.editorHook) return
        staticStore.editorHook.scrollTo(pos.lineIndex, { align: 'nearest' })
        return true
      })
  }
  function getPosText(pos: NoWholeDocPos): string {
    const line = coreStore.lyricLines[pos.lineIndex]!
    switch (pos.field) {
      case 'word':
        return line.words[pos.wordIndex]!.text
      case 'multiWord':
        return line.words
          .slice(pos.startWordIndex, pos.endWordIndex + 1)
          .map((w) => w.text)
          .join('')
      case 'translation':
        return line.translation
      case 'roman':
        return line.romanization
    }
  }
  function isPosMatch(pos: NoWholeDocPos): NoWholeDocPos | null {
    if (!state.compiledPattern) return null
    const fulltext = getPosText(pos)
    const match = fulltext.match(state.compiledPattern)
    if (!match) return null
    if (pos.field !== 'multiWord') return pos
    // For multiWord, return the real matched range
    const lineWords = coreStore.lyricLines[pos.lineIndex]!.words
    let charCount = 0
    let matchStartWord = -1
    let matchEndWord = -1
    const matchStartCh = match.index!
    const matchEndCh = matchStartCh + match[0].length
    for (let i = pos.startWordIndex; i <= pos.endWordIndex; i++) {
      const word = lineWords[i]!
      const wordStart = charCount
      const wordEnd = (charCount += word.text.length)
      if (wordStart <= match.index! && match.index! < wordEnd) matchStartWord = i
      if (wordStart < matchEndCh && matchEndCh <= wordEnd) {
        matchEndWord = i
        break
      }
    }
    if (matchStartWord === -1 || matchEndWord === -1) {
      console.warn('Failed to locate multiWord match range, this should not happen.')
      return pos
    }
    return {
      lineIndex: pos.lineIndex,
      field: 'multiWord',
      startWordIndex: matchStartWord,
      endWordIndex: matchEndWord,
    }
  }
  function replacePosText(pos: DocPosLine | DocPosWord, replaceText: string) {
    const pattern = compiledPatternGlobal.value
    if (!pattern) return false
    const line = coreStore.lyricLines[pos.lineIndex]!
    let changed = false
    if (pos.field === 'word' && state.findInWords) {
      const word = line.words[pos.wordIndex]!
      const replaced = word.text.replace(pattern, replaceText)
      changed = word.text !== replaced
      if (changed) word.text = replaced
    } else if (pos.field === 'translation' && state.findInTranslations) {
      const replaced = line.translation.replace(pattern, replaceText)
      changed = line.translation !== replaced
      if (changed) line.translation = replaced
    } else if (pos.field === 'roman' && state.findInRoman) {
      const replaced = line.romanization.replace(pattern, replaceText)
      changed = line.romanization !== replaced
      if (changed) line.romanization = replaced
    }
    return changed
  }
  function comparePos(a: DocPos, b: DocPos, direction: Direction): number {
    const fieldOrder: Record<DocPos['field'], number> = {
      whole: direction === 'next' ? -3 : 3,
      word: 0,
      multiWord: 0,
      translation: preferenceStore.swapTranslateRoman ? 2 : 1,
      roman: preferenceStore.swapTranslateRoman ? 1 : 2,
    }
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex
    if ([a, b].every((p) => ['word', 'multiWord'].includes(p.field))) {
      const aa = a as DocPosWord | DocPosMultiWord
      const bb = b as DocPosWord | DocPosMultiWord
      const [aStart, aEnd] =
        aa.field === 'multiWord'
          ? [aa.startWordIndex, aa.endWordIndex]
          : [aa.wordIndex, aa.wordIndex]
      const [bStart, bEnd] =
        bb.field === 'multiWord'
          ? [bb.startWordIndex, bb.endWordIndex]
          : [bb.wordIndex, bb.wordIndex]
      if (aEnd < bStart) return -1
      if (aStart > bEnd) return 1
      return 0
    }
    return fieldOrder[a.field] - fieldOrder[b.field]
  }

  function handleFind(direction: Direction, noAlert = false) {
    const rangedJumpPos = getRangedJumpPos(direction, currPos.value)
    const startingPos = rangedJumpPos(currPos.value)
    if (!startingPos) {
      if (!noAlert)
        notifier({
          severity: 'warn',
          summary: '找不到结果',
          detail: '在所选范围内文档为空。',
        })
      return
    }
    const pattern = state.compiledPattern
    if (!pattern) return
    for (let pos: DocPos | null = startingPos, step = 0; pos; pos = rangedJumpPos(pos), step++) {
      if (step > MAX_SEARCH_STEPS)
        throw new Error('Exceeded maximum search steps in handleFind, aborting.')
      const matchedPos = isPosMatch(pos)
      if (!matchedPos) continue
      focusPosInEditor(matchedPos)
      currPos.value = matchedPos
      return
    }
    runtimeStore.clearSelection()
    if (!noAlert)
      notifier({
        severity: 'warn',
        summary: '找不到结果',
        detail: state.wrapSearch
          ? '全文搜索完毕，未找到匹配项。'
          : '已到达文档末端，无匹配项。\n启用循环搜索可从头开始继续搜索。',
      })
  }
  function handleFindNext() {
    handleFind('next')
  }
  function handleFindPrev() {
    handleFind('prev')
  }
  function handleReplace() {
    const pattern = state.compiledPattern
    const replacement = state.replaceInput
    if (!pattern || !compiledPatternGlobal.value) return
    if (
      currPos.value &&
      currPos.value.field !== 'whole' &&
      currPos.value.field !== 'multiWord' &&
      isPosMatch(currPos.value)
    ) {
      replacePosText(currPos.value, replacement)
      handleFind('next', true)
    } else handleFind('next')
  }
  function handleReplaceAll() {
    const pattern = state.compiledPattern
    let counter = 0
    if (!pattern || !compiledPatternGlobal.value) return
    const rangedJumpPos = getRangedJumpPos('next', null)
    for (let pos = rangedJumpPos(null); pos; pos = rangedJumpPos(pos)) {
      if (!isPosMatch(pos)) continue
      if (pos.field === 'multiWord')
        throw new Error('Unreachable: multiWord should have been disabled in replacing.')
      counter += replacePosText(pos, state.replaceInput) ? 1 : 0
    }
    if (counter)
      notifier({
        severity: 'success',
        summary: '全部替换完成',
        detail: `共替换了 ${counter} 个匹配项。`,
      })
    else
      notifier({
        severity: 'warn',
        summary: '找不到结果',
        detail: '全文搜索完毕，未找到匹配项。',
      })
  }

  return {
    handleFindNext,
    handleFindPrev,
    handleReplace,
    handleReplaceAll,
  }
}
