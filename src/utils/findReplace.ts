import { useCoreStore } from '@/stores/core'
import { usePreferenceStore } from '@/stores/preference'
import { useRuntimeStore, View } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { computed, shallowRef, watch } from 'vue'
import { tryRaf } from './tryRaf'

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

export function useFindReplaceEngine(
  _state: Readonly<FindReplaceState>,
  notifier: (n: Notification) => void,
): FindReplaceActions {
  const state = _state
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  const staticStore = useStaticStore()
  const preferenceStore = usePreferenceStore()

  const compiledPatternGlobal = computed<RegExp | null>(() => {
    if (state.compiledPattern === null) return null
    const flags = state.compiledPattern.flags
    return new RegExp(state.compiledPattern.source, flags.includes('g') ? flags : flags + 'g')
  })

  type DocPos = {
    lineIndex: number
  } & (
    | {
        field: 'translation' | 'roman'
      }
    | {
        field: 'word'
        wordIndex: number
      }
  )
  type Jumper = (pos: DocPos | null) => DocPos | null

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
    if (lineFieldKey)
      return {
        lineIndex,
        field: lineFieldKey,
      }
    return { lineIndex, field: 'word', wordIndex: -1 }
  }
  const currPos = shallowRef<DocPos | null>(null)
  watch(
    [() => runtimeStore.selectedLines, () => runtimeStore.selectedWords],
    () => (currPos.value = getCurrPos()),
    { immediate: true },
  )

  const getFirstPos = () => getNextPos({ lineIndex: 0, field: 'word', wordIndex: -1 })
  function getNextPos(nullablePos: DocPos | null): DocPos | null {
    if (!nullablePos) return getFirstPos()
    const pos = nullablePos
    if (!coreStore.lyricLines.length) return null
    const { swapTranslateRoman } = preferenceStore
    // true:  word -> translation -> roman
    // false: word -> roman -> translation
    const firstField = swapTranslateRoman ? 'roman' : 'translation'
    function nextField(field: 'translation' | 'roman'): 'translation' | 'roman' | undefined {
      if (!swapTranslateRoman && field === 'translation') return 'roman'
      else if (swapTranslateRoman && field === 'roman') return 'translation'
    }
    const currLine = coreStore.lyricLines[pos.lineIndex]!
    if (pos.field === 'word') {
      const nextWordIndex = pos.wordIndex + 1
      if (nextWordIndex < currLine.words.length)
        return {
          lineIndex: pos.lineIndex,
          field: 'word',
          wordIndex: nextWordIndex,
        }
      else
        return {
          lineIndex: pos.lineIndex,
          field: firstField,
        }
    }
    const nextFieldKey = nextField(pos.field)
    if (nextFieldKey)
      return {
        lineIndex: pos.lineIndex,
        field: nextFieldKey,
      }
    const nextLineIndex = pos.lineIndex + 1
    if (nextLineIndex >= coreStore.lyricLines.length) return null
    if (coreStore.lyricLines[nextLineIndex]!.words.length)
      return {
        lineIndex: nextLineIndex,
        field: 'word',
        wordIndex: 0,
      }
    return {
      lineIndex: nextLineIndex,
      field: firstField,
    }
  }
  function getPrevPos(nullablePos: DocPos | null): DocPos | null {
    if (!nullablePos) return getLastPos()
    const pos = nullablePos
    if (!coreStore.lyricLines.length) return null
    const { swapTranslateRoman } = preferenceStore
    // true:  word -> translation -> roman
    // false: word -> roman -> translation
    const lastField = swapTranslateRoman ? 'translation' : 'roman'
    function prevField(field: 'translation' | 'roman'): 'translation' | 'roman' | undefined {
      if (!swapTranslateRoman && field === 'roman') return 'translation'
      else if (swapTranslateRoman && field === 'translation') return 'roman'
    }
    if (pos.field === 'word') {
      const prevWordIndex = pos.wordIndex - 1
      if (prevWordIndex >= 0)
        return {
          lineIndex: pos.lineIndex,
          field: 'word',
          wordIndex: prevWordIndex,
        }
      else {
        const lastLineIndex = pos.lineIndex - 1
        if (lastLineIndex < 0) return null
        return {
          lineIndex: lastLineIndex,
          field: lastField,
        }
      }
    }
    const prevFieldKey = prevField(pos.field)
    if (prevFieldKey)
      return {
        lineIndex: pos.lineIndex,
        field: prevFieldKey,
      }
    const currLine = coreStore.lyricLines[pos.lineIndex]!
    if (currLine.words.length)
      return {
        lineIndex: pos.lineIndex,
        field: 'word',
        wordIndex: currLine.words.length - 1,
      }
    const prevLineIndex = pos.lineIndex - 1
    if (prevLineIndex < 0) return null
    return {
      lineIndex: prevLineIndex,
      field: lastField,
    }
  }
  function getLastPos(): DocPos | null {
    if (!coreStore.lyricLines.length) return null
    const lastLineIndex = coreStore.lyricLines.length - 1
    return {
      lineIndex: lastLineIndex,
      field: preferenceStore.swapTranslateRoman ? 'translation' : 'roman',
    }
  }
  function checkPosInRange(pos: DocPos): boolean {
    if (pos.field === 'word' && !state.findInWords) return false
    if (pos.field === 'translation' && !state.findInTranslations) return false
    if (pos.field === 'roman' && !state.findInRoman) return false
    return true
  }
  function getRangedJumpPos(jumper: Jumper): Jumper {
    let firstFlag = true
    let beginPos: DocPos | null = null
    let wrappedBack = false
    return (fromPos: DocPos | null, forceDisableWrap = false): DocPos | null => {
      if (firstFlag) {
        beginPos = fromPos
        firstFlag = false
      }
      if (!fromPos) return jumper(null)
      let pos: DocPos | null = fromPos
      while (true) {
        const nextPos = jumper(pos)
        if (wrappedBack && beginPos && comparePos(nextPos!, beginPos) >= 0) return null
        if (!nextPos) {
          if (state.wrapSearch && !forceDisableWrap) {
            wrappedBack = true
            if (!beginPos) return null
            return jumper(null)
          }
          return null
        }
        if (checkPosInRange(nextPos)) return nextPos
        pos = nextPos
      }
    }
  }
  function focusPosInEditor(pos: DocPos) {
    let shouldSwitchToContent = false
    if (pos.field === 'word') {
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
    } else if (pos.field === 'translation' || pos.field === 'roman') {
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
  function focusMultipleWordsInEditor(
    lineIndex: number,
    startWordIndex: number,
    endWordIndex: number,
    shouldSwitchToContent = false,
  ) {
    const line = coreStore.lyricLines[lineIndex]!
    const words = line.words.slice(startWordIndex, endWordIndex + 1)
    runtimeStore.selectLineWord(line, ...words)
    if (shouldSwitchToContent) {
      if (!runtimeStore.isContentView) runtimeStore.currentView = View.Content
      tryRaf(() => {
        if (!staticStore.editorHook || staticStore.editorHook.view !== View.Content) return
        staticStore.editorHook.scrollTo(lineIndex, { align: 'nearest' })
        return true
      })
    } else
      tryRaf(() => {
        if (!staticStore.editorHook) return
        staticStore.editorHook.scrollTo(lineIndex, { align: 'nearest' })
        return true
      })
  }
  function isPosMatch(pos: DocPos, pattern: RegExp): boolean {
    const line = coreStore.lyricLines[pos.lineIndex]!
    let textToMatch = ''
    if (pos.field === 'word') {
      if (pos.wordIndex < 0) return false
      const word = line.words[pos.wordIndex]!
      textToMatch = word.text
    } else if (pos.field === 'translation') {
      textToMatch = line.translation
    } else if (pos.field === 'roman') {
      textToMatch = line.romanization
    }
    const result = textToMatch.search(pattern) !== -1
    return result
  }
  function replacePosText(pos: DocPos, pattern: RegExp, replaceText: string) {
    if (pattern.flags.indexOf('g') === -1)
      console.warn('Replacing with non-global regex, this may cause unexpected behavior.')
    const line = coreStore.lyricLines[pos.lineIndex]!
    let changed = false
    if (pos.field === 'word' && state.findInWords) {
      const word = line.words[pos.wordIndex]!
      const replaced = word.text.replace(pattern, replaceText)
      changed = word.text !== replaced
      word.text = replaced
    } else if (pos.field === 'translation' && state.findInTranslations) {
      const replaced = line.translation.replace(pattern, replaceText)
      changed = line.translation !== replaced
      line.translation = replaced
    } else if (pos.field === 'roman' && state.findInRoman) {
      const replaced = line.romanization.replace(pattern, replaceText)
      changed = line.romanization !== replaced
      line.romanization = replaced
    }
    return changed
  }
  const fieldOrder = computed(() => ({
    word: 0,
    translation: preferenceStore.swapTranslateRoman ? 2 : 1,
    roman: preferenceStore.swapTranslateRoman ? 1 : 2,
  }))
  function comparePos(a: DocPos, b: DocPos) {
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex
    if (a.field !== b.field) return fieldOrder.value[a.field] - fieldOrder.value[b.field]
    if (a.field === 'word' && b.field === 'word') return a.wordIndex - b.wordIndex
    return 0
  }

  const MAX_SEARCH_STEPS = 100000
  function handleFind(jumper: Jumper, noAlert = false) {
    enum Direction {
      Next,
      Prev,
    }
    const direction = jumper === getNextPos ? Direction.Next : Direction.Prev
    const rangedJumpPos = getRangedJumpPos(jumper)
    const startingPos = currPos.value ? rangedJumpPos(currPos.value) : getFirstPos()
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
      if (step > MAX_SEARCH_STEPS) {
        throw new Error('Exceeded maximum search steps, aborting.')
      }
      if (!state.crossWordMatch || pos.field !== 'word') {
        if (!isPosMatch(pos, pattern)) continue
        focusPosInEditor(pos)
        currPos.value = pos
        return
      } else {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const wordsToCheck =
          direction === Direction.Next
            ? line.words.slice(pos.wordIndex)
            : line.words.slice(0, pos.wordIndex + 1)
        const wordIndexOffset = direction === Direction.Next ? pos.wordIndex : 0
        const wordsText = wordsToCheck.map((w) => w.text).join('')
        const match = wordsText.match(pattern)
        if (!match) {
          pos = {
            lineIndex: pos.lineIndex,
            field: 'word',
            wordIndex: direction === Direction.Next ? line.words.length : 0,
          }
          continue
        }
        const matchBeginIndex = match.index || 0
        console.log(matchBeginIndex)
        const matchEndIndex = matchBeginIndex + match[0].length
        const shouldSwitchToContent = !!match[0].trim()
        let charCount = 0
        let matchWordStartIndex = -1
        let matchWordEndIndex = -1
        for (const [index, { text }] of wordsToCheck.entries()) {
          const startCharIndex = charCount
          const endCharIndex = (charCount += text.length)
          if (startCharIndex <= matchBeginIndex && matchBeginIndex < endCharIndex) {
            matchWordStartIndex = index
          }
          if (startCharIndex < matchEndIndex && matchEndIndex <= endCharIndex) {
            matchWordEndIndex = index
            break
          }
        }
        if (matchWordStartIndex === -1 || matchWordEndIndex === -1) {
          throw new Error('Unreachable: Failed to locate matched words in cross-word match.')
        }
        matchWordStartIndex += wordIndexOffset
        matchWordEndIndex += wordIndexOffset
        focusMultipleWordsInEditor(
          pos.lineIndex,
          matchWordStartIndex,
          matchWordEndIndex,
          shouldSwitchToContent,
        )
        currPos.value = {
          lineIndex: pos.lineIndex,
          field: 'word',
          wordIndex: direction === Direction.Next ? matchWordEndIndex : matchWordStartIndex,
        }
        return
      }
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
    handleFind(getNextPos)
  }
  function handleFindPrev() {
    handleFind(getPrevPos)
  }
  function handleReplace() {
    const pattern = state.compiledPattern
    const globalPattern = compiledPatternGlobal.value
    const replacement = state.replaceInput
    if (!pattern || !globalPattern) return
    if (currPos.value && isPosMatch(currPos.value, pattern)) {
      replacePosText(currPos.value, globalPattern, replacement)
      handleFind(getNextPos, true)
    } else handleFind(getNextPos)
  }
  function handleReplaceAll() {
    const pattern = state.compiledPattern
    const globalPattern = compiledPatternGlobal.value
    let counter = 0
    if (!pattern || !globalPattern) return
    const rangedJumpPos = getRangedJumpPos(getNextPos)
    for (let pos = getFirstPos(); pos; pos = rangedJumpPos(pos)) {
      if (!isPosMatch(pos, pattern)) continue
      counter += replacePosText(pos, globalPattern, state.replaceInput) ? 1 : 0
    }
    if (counter)
      notifier({
        severity: 'info',
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
