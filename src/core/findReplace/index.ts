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
  SylRoman: 'SYLROMAN',
  MultiSylRoman: 'MULTISYLROMAN',
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

  // Order:
  // Whole -> (Syllable -> SylRoman)*n -> <FirstSecField> -> <LastSecField> -> Whole(next line)
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
      case PF.Syllable: {
        if (state.crossWordMatch) {
          const currLine = coreStore.lyricLines[pos.lineIndex]!
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: pos.sylIndex,
            endSylIndex: currLine.syllables.length - 1,
          }
        }
        return {
          lineIndex: pos.lineIndex,
          field: PF.SylRoman,
          sylIndex: pos.sylIndex,
        }
      }
      case PF.MultiSyllable: {
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSylRoman,
            startSylIndex: pos.startSylIndex,
            endSylIndex: pos.endSylIndex,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.SylRoman,
          sylIndex: pos.startSylIndex,
        }
      }
      case PF.SylRoman: {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        if (pos.sylIndex + 1 >= currLine.syllables.length) {
          return {
            lineIndex: pos.lineIndex,
            field: firstSecField,
          }
        }
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: pos.sylIndex + 1,
            endSylIndex: currLine.syllables.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: pos.sylIndex + 1,
        }
      }
      case PF.MultiSylRoman: {
        const currLine = coreStore.lyricLines[pos.lineIndex]!
        if (pos.endSylIndex + 1 >= currLine.syllables.length)
          return {
            lineIndex: pos.lineIndex,
            field: firstSecField,
          }
        if (state.crossWordMatch)
          return {
            lineIndex: pos.lineIndex,
            field: PF.MultiSyllable,
            startSylIndex: pos.endSylIndex + 1,
            endSylIndex: currLine.syllables.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: pos.endSylIndex + 1,
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

  // Order:
  // Whole -> <LastSecField> -> <FirstSecField> -> (SylRoman -> Syllable)*n -> Whole(prev line)
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
            field: PF.MultiSylRoman,
            startSylIndex: 0,
            endSylIndex: prevWordIndex,
          }
        else
          return {
            lineIndex: pos.lineIndex,
            field: PF.SylRoman,
            sylIndex: prevWordIndex,
          }
      }
      case PF.SylRoman: {
        if (state.crossWordMatch && pos.sylIndex !== 0)
          return {
            field: PF.MultiSylRoman,
            lineIndex: pos.lineIndex,
            startSylIndex: 0,
            endSylIndex: pos.sylIndex,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: pos.sylIndex,
        }
      }
      case PF.MultiSylRoman: {
        if (state.crossWordMatch)
          return {
            field: PF.MultiSyllable,
            lineIndex: pos.lineIndex,
            startSylIndex: pos.startSylIndex,
            endSylIndex: pos.endSylIndex,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.Syllable,
          sylIndex: pos.endSylIndex,
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
            field: PF.MultiSylRoman,
            startSylIndex: 0,
            endSylIndex: currLine.syllables.length - 1,
          }
        return {
          lineIndex: pos.lineIndex,
          field: PF.SylRoman,
          sylIndex: currLine.syllables.length - 1,
        }
      }
      default:
        throw new Error('Unreachable: Invalid FR.AbstractPos field.')
    }
  }

  function checkPosInRange(pos: FR.Pos): boolean {
    if (pos.field === PF.Syllable && !state.findInSyls) return false
    if (pos.field === PF.MultiSyllable && (!state.findInSyls || !state.crossWordMatch)) return false
    if (pos.field === PF.SylRoman && !state.findInSylRoman) return false
    if (pos.field === PF.MultiSylRoman && (!state.findInSylRoman || !state.crossWordMatch))
      return false
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
        if (stepCount++ > MAX_SEARCH_STEPS) {
          notifier({
            severity: 'error',
            summary: '搜索失败',
            detail: '发生死循环。请前往反馈此问题。',
          })
          throw new Error('Exceeded maximum search steps in getRangedJumpPos, aborting.')
        }
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
      case PF.Syllable:
      case PF.SylRoman: {
        const line = coreStore.lyricLines[pos.lineIndex]!
        const syl = line.syllables[pos.sylIndex]!
        runtimeStore.selectLineSyl(line, syl)
        if (!syl.text.trim()) shouldSwitchToContent = true
        if (runtimeStore.isContentView || shouldSwitchToContent)
          tryRaf(() => {
            const hook = staticStore.syllableHooks.get(syl.id)
            if (!hook) return
            if (pos.field === PF.Syllable) hook.hightLightInput()
            else hook.hightLightRoman()
            return true
          })
        break
      }
      case PF.MultiSyllable:
      case PF.MultiSylRoman: {
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
      case PF.SylRoman:
        return line.syllables[pos.sylIndex]!.romanization
      case PF.MultiSylRoman:
        return line.syllables
          .slice(pos.startSylIndex, pos.endSylIndex + 1)
          .map((s) => s.romanization)
          .join(' ')
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
    if (pos.field !== PF.MultiSyllable && pos.field !== PF.MultiSylRoman) return pos
    // For multiWord, return the real matched range
    const lineWords = coreStore.lyricLines[pos.lineIndex]!.syllables
    let charCount = 0
    let matchStartWord = -1
    let matchEndWord = -1
    const matchStartCh = match.index!
    const matchEndCh = matchStartCh + match[0].length
    for (let i = pos.startSylIndex; i <= pos.endSylIndex; i++) {
      const syl = lineWords[i]!
      const text = pos.field === PF.MultiSyllable ? syl.text : syl.romanization + ' '
      const sylStart = charCount
      const sylEnd = (charCount += text.length)
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
      field: pos.field,
      startSylIndex: matchStartWord,
      endSylIndex: matchEndWord,
    }
  }
  function replacePosText(pos: FR.ReplaceablePos, replaceText: string) {
    const pattern = compiledPatternGlobal.value
    if (!pattern) return false
    const line = coreStore.lyricLines[pos.lineIndex]!
    let changed = false
    if (pos.field === PF.Syllable && state.findInSyls) {
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
    } else if (pos.field === PF.SylRoman && state.findInSylRoman) {
      const syl = line.syllables[pos.sylIndex]!
      const replaced = syl.romanization.replace(pattern, replaceText)
      changed = syl.romanization !== replaced
      if (changed) syl.romanization = replaced
    }
    return changed
  }
  function comparePos(a: FR.AbstractPos, b: FR.AbstractPos, direction: FR.Dir): number {
    const fieldOrder: Record<FR.AbstractPos['field'], number> = {
      [PF.Whole]: direction === DR.Next ? -3 : 3,
      [PF.Syllable]: 0,
      [PF.MultiSyllable]: 0,
      [PF.SylRoman]: 0,
      [PF.MultiSylRoman]: 0,
      [PF.Translation]: prefStore.swapTranslateRoman ? 2 : 1,
      [PF.Roman]: prefStore.swapTranslateRoman ? 1 : 2,
    }
    const sylOrder: Record<FR.InlinePos['field'], number> = {
      [PF.Syllable]: -1,
      [PF.MultiSyllable]: -1,
      [PF.SylRoman]: 1,
      [PF.MultiSylRoman]: 1,
    }
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex
    if (fieldOrder[a.field] !== fieldOrder[b.field])
      return fieldOrder[a.field] - fieldOrder[b.field]
    const aa = a as FR.InlinePos
    const bb = b as FR.InlinePos
    const [aStart, aEnd] =
      'startSylIndex' in aa ? [aa.startSylIndex, aa.endSylIndex] : [aa.sylIndex, aa.sylIndex]
    const [bStart, bEnd] =
      'startSylIndex' in bb ? [bb.startSylIndex, bb.endSylIndex] : [bb.sylIndex, bb.sylIndex]
    if (aEnd < bStart) return -1
    if (aStart > bEnd) return 1

    return sylOrder[aa.field] - sylOrder[bb.field]
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
      currPos.value.field !== PF.MultiSylRoman &&
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
      if (pos.field === PF.MultiSyllable || pos.field === PF.MultiSylRoman)
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
