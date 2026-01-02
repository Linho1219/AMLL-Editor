import { nextTick } from 'vue'

import type { LyricLine } from '@core/types'

import { useCoreStore, useStaticStore } from '@states/stores'

import type { SyllableState } from './shared'

export function handleSylRomanInputKeydown(event: KeyboardEvent, state: SyllableState) {
  const coreStore = useCoreStore()
  const staticStore = useStaticStore()
  const el = event.target as HTMLInputElement
  switch (event.code) {
    case 'ArrowUp': {
      // Focus syllable input
      event.preventDefault()
      nextTick(() => state.inputEl?.select())
      return
    }
    case 'ArrowLeft': {
      // If at start, focus previous syllable's romanization
      if (el.selectionStart !== 0) return
      event.preventDefault()
      const prevSyl = findPrevSolidSyl()
      if (!prevSyl) return
      nextTick(() => staticStore.syllableHooks.get(prevSyl.id)?.focusRomanInput(-1))
      return
    }
    case 'ArrowRight': {
      // If at end, focus next syllable's romanization
      if (el.selectionStart !== el.value.length) return
      event.preventDefault()
      const nextSyl = findNextSolidSyl()
      if (!nextSyl) return
      nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusRomanInput(0))
      return
    }
    case 'Tab': {
      // Focus next/prev syllable's romanization
      event.preventDefault()
      const nextSyl = event.shiftKey ? findPrevSolidSyl() : findNextSolidSyl()
      if (!nextSyl) return
      nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusRomanInput())
      return
    }
    case 'Space': {
      if (el.value.split(' ').length <= state.syllable.placeholdingBeat) return
      const cursorPos = el.selectionStart || 0
      if (cursorPos !== el.value.length) return
      event.preventDefault()
      if (cursorPos === el.value.length) {
        const nextSyl = findNextSolidSyl()
        if (!nextSyl) return
        nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusRomanInput())
      }
    }
    case 'Backspace': {
      if (state.index === 0) return
      if (el.selectionStart !== 0 || el.selectionEnd !== 0) return
      const prevSyl = findPrevSolidSyl(true)
      if (!prevSyl) return
      event.preventDefault()
      const shiftedRoman = shiftRoman(state.parent, state.index)
      if (!shiftedRoman) return
      prevSyl.romanization += shiftedRoman
      nextTick(() =>
        staticStore.syllableHooks.get(prevSyl.id)?.focusRomanInput(-shiftedRoman.length - 1),
      )
      return
    }
    case 'Delete': {
      if (el.selectionStart !== el.value.length || el.selectionEnd !== el.value.length) return
      const nextSyl = findNextSolidSyl(true)
      if (!nextSyl) return
      event.preventDefault()
      const cursorPos = el.selectionStart
      const shiftedRoman = shiftRoman(state.parent, state.index + 1)
      if (!shiftedRoman) return
      el.value += shiftedRoman
      el.selectionStart = el.selectionEnd = cursorPos
      return
    }
    case 'Backquote': {
      event.preventDefault()
      const cursorPos = el.selectionStart || 0
      const romanToUnshift = el.value.slice(cursorPos)
      const nextSyl = findNextSolidSyl(true)
      if (!nextSyl) return
      unshiftRoman(state.parent, state.index + 1, romanToUnshift)
      el.value = el.value.slice(0, cursorPos).trim()
      nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusRomanInput(0))
      return
    }
    case 'Escape': {
      event.preventDefault()
      el.blur()
      return
    }
  }

  function findNextSolidSyl(sameLine = false) {
    let lineIndex = state.lineIndex
    let sylIndex = state.index
    while (lineIndex < coreStore.lyricLines.length) {
      const line = coreStore.lyricLines[lineIndex]!
      while (++sylIndex < line.syllables.length) {
        const syl = line.syllables[sylIndex]!
        if (syl.text.trim()) return syl
      }
      if (sameLine) return null
      lineIndex++
      sylIndex = -1
    }
    return null
  }
  function findPrevSolidSyl(sameLine = false) {
    let lineIndex = state.lineIndex
    let sylIndex = state.index
    while (lineIndex >= 0) {
      const line = coreStore.lyricLines[lineIndex]!
      if (sylIndex === Infinity) sylIndex = line.syllables.length
      while (--sylIndex >= 0) {
        const syl = line.syllables[sylIndex]!
        if (syl.text.trim()) return syl
      }
      if (sameLine) return null
      lineIndex--
      sylIndex = Infinity
    }
    return null
  }
}

function shiftRoman(line: LyricLine, fromSylIndex: number) {
  const syls = line.syllables.slice(fromSylIndex)
  const romans = syls.flatMap((syl) => syl.romanization.split(' ')).filter((r) => r.trim())
  const shifted = romans.shift()
  if (!shifted) return
  for (const syl of syls) {
    if (!romans.length) {
      syl.romanization = ''
      continue
    }
    const count = syl.romanization.split(' ').filter((r) => r.trim()).length
    const pending = romans.splice(0, count)
    syl.romanization = pending.join(' ')
  }
  if (romans.length > 0) {
    const lastSyl = syls.at(-1)
    if (lastSyl) lastSyl.romanization = [lastSyl.romanization, romans.join(' ')].join(' ').trim()
  }
  return shifted
}

function unshiftRoman(line: LyricLine, toSylIndex: number, roman: string) {
  const syls = line.syllables.slice(toSylIndex)
  const romans = syls.flatMap((syl) => syl.romanization.split(' ')).filter((r) => r.trim())
  romans.unshift(roman)
  for (const syl of syls) {
    if (!romans.length) {
      syl.romanization = ''
      continue
    }
    const count = syl.romanization.split(' ').filter((r) => r.trim()).length
    const pending = romans.splice(0, count)
    syl.romanization = pending.join(' ')
  }
  if (romans.length > 0) {
    const lastSyl = syls.at(-1)
    if (lastSyl) lastSyl.romanization = [lastSyl.romanization, romans.join(' ')].join(' ').trim()
  }
}
