import { type Reactive, computed, nextTick, shallowRef, watch } from 'vue'

import { View } from '@core/types'

import { useCoreStore, usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'

import { tryRaf } from '@utils/tryRaf'
import type { Equal, Expect, ValueOf } from '@utils/types'

import type { FindReplace as FR } from './types'

export type { FindReplace } from './types'

const MAX_SEARCH_STEPS = 100000

const PF = {
  Whole: 'WHOLE',
  Syllable: 'SYLLABLE',
  MultiSyllable: 'MULTISYL',
  Translation: 'TRANSLATION',
  Roman: 'ROMAN',
} as const
type PF = ValueOf<typeof PF>
type LineField = typeof PF.Translation | typeof PF.Roman
type _CheckPF = Expect<Equal<FR.AbstractPos['field'], PF>>

const DR = {
  Next: 'next',
  Prev: 'prev',
} as const
type DR = ValueOf<typeof DR>
type _CheckDR = Expect<Equal<FR.Dir, DR>>

export function useFindReplaceEngine(
  __state: Readonly<Reactive<FR.State>>,
  notifier: (n: FR.Notification) => void,
): FR.Actions {
  const state = __state
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  const staticStore = useStaticStore()
  const prefStore = usePrefStore()

  const compiledPatternGlobal = computed<RegExp | null>(() => {
    if (state.compiledPattern === null) return null
    const flags = state.compiledPattern.flags
    return new RegExp(state.compiledPattern.source, flags.includes('g') ? flags : flags + 'g')
  })

  function getCurrPos(): FR.AbstractPos | null {
    const currLine = runtimeStore.getFirstSelectedLine()
    if (!currLine) return null
    const lineIndex = coreStore.lyricLines.indexOf(currLine)
    const currSyl = runtimeStore.getFirstSelectedSyl()
    if (currSyl) {
      const sylIndex = currLine.syllables.indexOf(currSyl)
      return {
        lineIndex,
        field: PF.Syllable,
        sylIndex: sylIndex,
      }
    }
    const focusedEl = document.activeElement as HTMLElement | null
    if (!focusedEl) return null
    const lineFieldKey = focusedEl.dataset.lineFieldKey as LineField | undefined
    if (lineFieldKey && (lineFieldKey === PF.Translation || lineFieldKey === PF.Roman))
      return {
        lineIndex,
        field: lineFieldKey,
      }
    return { lineIndex, field: PF.Whole }
  }
  const currPos = shallowRef<FR.AbstractPos | null>(null)
  let isTriggeredBySelf = false
  watch(
    [() => runtimeStore.selectedLines, () => runtimeStore.selectedSyllables],
    () =>
      nextTick(() => {
        if (isTriggeredBySelf) {
          isTriggeredBySelf = false
          return
        }
        currPos.value = getCurrPos()
      }),
    { immediate: true, deep: true },
  )

  function getNextPos(nullablePos: FR.AbstractPos | null): FR.Pos | null {
    if (!coreStore.lyricLines.length) return null
    const pos = nullablePos ?? { lineIndex: 0, field: PF.Whole }
    const [firstSecField, lastSecField] = prefStore.swapTranslateRoman
      ? ([PF.Roman, PF.Translation] as const)
      : ([PF.Translation, PF.Roman] as const)

    function getFirstPosOfLine(lineIndex: number): FR.Pos | null {
      if (lineIndex >= coreStore.lyricLines.length) return null
      const line = coreStore.lyricLines[lineIndex]!
      if (!line.syllables.length) return { lineIndex, field: firstSecField }
      if (state.crossWordMatch)
        return {
          lineIndex,
          field: PF.MultiSyllable,
          startSylIndex: 0,
          endSylIndex: line.syllables.length - 1,
        }
      return {
        lineIndex,
        field: PF.Syllable,
        sylIndex: 0,
      }
    }

    switch (pos.field) {
      case PF.Whole:
        return getFirstPosOfLine(pos.lineIndex)
      case PF.Syllable:
      case PF.MultiSyllable: {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        const currentWordIndex = pos.field === PF.Syllable ? pos.sylIndex : pos.endSylIndex
        const nextWordIndex = currentWordIndex + 1
        if (nextWordIndex >= currLine.syllables.length)
          return {
            lineIndex: pos.lineIndex,
            field: firstSecField,
          }
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: nextWordIndex,
            endSylIndex: currLine.syllables.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: nextWordIndex,
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
        throw new Error('Unreachable: Invalid AbstractPos field.')
    }
  }

  function getPrevPos(nullablePos: FR.AbstractPos | null): FR.Pos | null {
    if (!coreStore.lyricLines.length) return null
    const pos = nullablePos ?? {
      lineIndex: coreStore.lyricLines.length - 1,
      field: PF.Whole,
    }
    const [firstSecField, lastSecField] = prefStore.swapTranslateRoman
      ? ([PF.Roman, PF.Translation] as const)
      : ([PF.Translation, PF.Roman] as const)

    function getLastPosOfLine(lineIndex: number): FR.Pos | null {
      if (lineIndex < 0) return null
      return {
        lineIndex,
        field: lastSecField,
      }
    }

    switch (pos.field) {
      case PF.Whole:
        return getLastPosOfLine(pos.lineIndex)
      case PF.Syllable:
      case PF.MultiSyllable: {
        const currentWordIndex = pos.field === PF.Syllable ? pos.sylIndex : pos.startSylIndex
        const prevWordIndex = currentWordIndex - 1
        if (prevWordIndex < 0) return getLastPosOfLine(pos.lineIndex - 1)
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: 0,
            endSylIndex: prevWordIndex,
          }
        else
          return {
            lineIndex: pos.lineIndex,
            field: PF.Syllable,
            sylIndex: prevWordIndex,
          }
      }
      case lastSecField:
        return {
          lineIndex: pos.lineIndex,
          field: firstSecField,
        }
      case firstSecField: {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        if (!currLine.syllables.length) return getLastPosOfLine(pos.lineIndex - 1)
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: 0,
            endSylIndex: currLine.syllables.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: currLine.syllables.length - 1,
        }
      }
      default:
        throw new Error('Unreachable: Invalid FR.AbstractPos field.')
    }
  }

  function checkPosInRange(pos: FR.Pos): boolean {
    if (pos.field === PF.Syllable && !state.findInWords) return false
    if (pos.field === PF.Translation && !state.findInTranslations) return false
    if (pos.field === PF.Roman && !state.findInRoman) return false
    return true
  }
  function getRangedJumpPos(direction: FR.Dir, beginPos: FR.AbstractPos | null) {
    const jumper = direction === DR.Next ? getNextPos : getPrevPos
    let wrappedBack = false
    let stepCount = 0
    return (pos: FR.AbstractPos | null, forceDisableWrap = false): FR.Pos | null => {
      while (true) {
        if (stepCount++ > MAX_SEARCH_STEPS)
          throw new Error('Exceeded maximum search steps in getRangedJumpPos, aborting.')
        const nextPos = jumper(pos)
        if (nextPos) {
          if (wrappedBack) {
            const compared = comparePos(nextPos, beginPos!, direction)
            if (direction === DR.Next && compared >= 0) return null
            if (direction === DR.Prev && compared <= 0) return null
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
  function focusPosInEditor(pos: FR.AbstractPos) {
    isTriggeredBySelf = true
    let shouldSwitchToContent = false
    switch (pos.field) {
      case PF.Whole: {
        runtimeStore.selectLine(coreStore.lyricLines[pos.lineIndex]!)
        break
      }
      case PF.Syllable: {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const syl = line.syllables[pos.sylIndex]!
        runtimeStore.selectLineSyl(line, syl)
        if (!syl.text.trim()) shouldSwitchToContent = true
        if (runtimeStore.isContentView || shouldSwitchToContent)
          tryRaf(() => {
            const hook = staticStore.syllableHooks.get(syl.id)
            if (!hook) return
            hook.hightLightInput()
            return true
          })
        break
      }
      case PF.MultiSyllable: {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const syls = line.syllables.slice(pos.startSylIndex, pos.endSylIndex + 1)
        runtimeStore.selectLineSyl(line, ...syls)
        // Only when all syllables are empty we switch to content view (show empty syllables)
        // otherwise just stay
        if (syls.every((s) => !s.text.trim())) shouldSwitchToContent = true
        break
      }
      case PF.Translation:
      case PF.Roman: {
        shouldSwitchToContent = true
        const line = coreStore.lyricLines[pos.lineIndex]!
        runtimeStore.selectLine(line)
        tryRaf(() => {
          const hook = staticStore.lineHooks.get(line.id)
          if (!hook) return
          if (pos.field === PF.Translation) hook.hightLightTranslation()
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
  function getPosText(pos: FR.Pos): string {
    const line = coreStore.lyricLines[pos.lineIndex]!
    switch (pos.field) {
      case PF.Syllable:
        return line.syllables[pos.sylIndex]!.text
      case PF.MultiSyllable:
        return line.syllables
          .slice(pos.startSylIndex, pos.endSylIndex + 1)
          .map((s) => s.text)
          .join('')
      case PF.Translation:
        return line.translation
      case PF.Roman:
        return line.romanization
    }
  }
  function isPosMatch(pos: FR.Pos): FR.Pos | null {
    if (!state.compiledPattern) return null
    const fulltext = getPosText(pos)
    const match = fulltext.match(state.compiledPattern)
    if (!match) return null
    if (pos.field !== PF.MultiSyllable) return pos
    // For multiWord, return the real matched range
    const lineWords = coreStore.lyricLines[pos.lineIndex]!.syllables
    let charCount = 0
    let matchStartWord = -1
    let matchEndWord = -1
    const matchStartCh = match.index!
    const matchEndCh = matchStartCh + match[0].length
    for (let i = pos.startSylIndex; i <= pos.endSylIndex; i++) {
      const syl = lineWords[i]!
      const sylStart = charCount
      const sylEnd = (charCount += syl.text.length)
      if (sylStart <= match.index! && match.index! < sylEnd) matchStartWord = i
      if (sylStart < matchEndCh && matchEndCh <= sylEnd) {
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
      field: PF.MultiSyllable,
      startSylIndex: matchStartWord,
      endSylIndex: matchEndWord,
    }
  }
  function replacePosText(pos: FR.PosLine | FR.PosSyl, replaceText: string) {
    const pattern = compiledPatternGlobal.value
    if (!pattern) return false
    const line = coreStore.lyricLines[pos.lineIndex]!
    let changed = false
    if (pos.field === PF.Syllable && state.findInWords) {
      const syl = line.syllables[pos.sylIndex]!
      const replaced = syl.text.replace(pattern, replaceText)
      changed = syl.text !== replaced
      if (changed) syl.text = replaced
    } else if (pos.field === PF.Translation && state.findInTranslations) {
      const replaced = line.translation.replace(pattern, replaceText)
      changed = line.translation !== replaced
      if (changed) line.translation = replaced
    } else if (pos.field === PF.Roman && state.findInRoman) {
      const replaced = line.romanization.replace(pattern, replaceText)
      changed = line.romanization !== replaced
      if (changed) line.romanization = replaced
    }
    return changed
  }
  function comparePos(a: FR.AbstractPos, b: FR.AbstractPos, direction: FR.Dir): number {
    const fieldOrder: Record<FR.AbstractPos['field'], number> = {
      [PF.Whole]: direction === DR.Next ? -3 : 3,
      [PF.Syllable]: 0,
      [PF.MultiSyllable]: 0,
      [PF.Translation]: prefStore.swapTranslateRoman ? 2 : 1,
      [PF.Roman]: prefStore.swapTranslateRoman ? 1 : 2,
    }
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex
    if ([a, b].every((p) => ([PF.Syllable, PF.MultiSyllable] as PF[]).includes(p.field))) {
      const aa = a as FR.PosSyl | FR.PosMultiWord
      const bb = b as FR.PosSyl | FR.PosMultiWord
      const [aStart, aEnd] =
        aa.field === PF.MultiSyllable
          ? [aa.startSylIndex, aa.endSylIndex]
          : [aa.sylIndex, aa.sylIndex]
      const [bStart, bEnd] =
        bb.field === PF.MultiSyllable
          ? [bb.startSylIndex, bb.endSylIndex]
          : [bb.sylIndex, bb.sylIndex]
      if (aEnd < bStart) return -1
      if (aStart > bEnd) return 1
      return 0
    }
    return fieldOrder[a.field] - fieldOrder[b.field]
  }

  function handleFind(direction: FR.Dir, noAlert = false) {
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
    for (
      let pos: FR.AbstractPos | null = startingPos, step = 0;
      pos;
      pos = rangedJumpPos(pos), step++
    ) {
      if (step > MAX_SEARCH_STEPS)
        throw new Error('Exceeded maximum search steps in handleFind, aborting.')
      const matchedPos = isPosMatch(pos)
      if (!matchedPos) continue
      focusPosInEditor(matchedPos)
      currPos.value = matchedPos
      return
    }
    // runtimeStore.clearSelection()
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
    handleFind(DR.Next)
  }
  function handleFindPrev() {
    handleFind(DR.Prev)
  }
  function handleReplace() {
    const pattern = state.compiledPattern
    const replacement = state.replaceInput
    if (!pattern || !compiledPatternGlobal.value) return
    if (
      currPos.value &&
      currPos.value.field !== PF.Whole &&
      currPos.value.field !== PF.MultiSyllable &&
      isPosMatch(currPos.value)
    ) {
      replacePosText(currPos.value, replacement)
      handleFind(DR.Next, true)
    } else handleFind(DR.Next)
  }
  function handleReplaceAll() {
    const pattern = state.compiledPattern
    let counter = 0
    if (!pattern || !compiledPatternGlobal.value) return
    const rangedJumpPos = getRangedJumpPos(DR.Next, null)
    for (let pos = rangedJumpPos(null); pos; pos = rangedJumpPos(pos)) {
      if (!isPosMatch(pos)) continue
      if (pos.field === PF.MultiSyllable)
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
