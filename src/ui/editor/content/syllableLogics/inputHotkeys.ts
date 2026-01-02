import { nextTick } from 'vue'

import { useCoreStore, usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'

import type { SyllableState } from './shared'

export function handleSylInputKeydown(event: KeyboardEvent, state: SyllableState) {
  const runtimeStore = useRuntimeStore()
  const coreStore = useCoreStore()
  const prefStore = usePrefStore()
  const staticStore = useStaticStore()

  const el = event.target as HTMLInputElement
  switch (event.code) {
    case 'Backspace': {
      // Combine with previous syllable
      if (state.index === 0 || el.selectionStart !== 0 || el.selectionEnd !== 0) return
      const prevSyl = state.parent.syllables[state.index - 1]
      if (!prevSyl) return
      event.preventDefault()
      const cursorPos = prevSyl.text.length
      prevSyl.text += el.value
      prevSyl.romanization = [prevSyl.romanization, state.syllable.romanization].join(' ').trim()
      if (state.syllable.startTime && state.syllable.endTime) {
        prevSyl.endTime = state.syllable.endTime
      }
      state.parent.syllables.splice(state.index, 1)
      runtimeStore.selectLineSyl(state.parent, prevSyl)
      nextTick(() => staticStore.syllableHooks.get(prevSyl.id)?.focusInput(cursorPos))
      return
    }
    case 'Delete': {
      // Combine with next syllable
      if (
        state.index === state.parent.syllables.length - 1 ||
        el.selectionStart !== el.value.length ||
        el.selectionEnd !== el.value.length
      )
        return
      event.preventDefault()
      const nextSyl = state.parent.syllables[state.index + 1]
      if (!nextSyl) return
      const cursorPos = el.value.length
      state.syllable.text += nextSyl.text
      state.syllable.romanization = [state.syllable.romanization, nextSyl.romanization]
        .join(' ')
        .trim()
      if (nextSyl.startTime && nextSyl.endTime) {
        state.syllable.endTime = nextSyl.endTime
      }
      state.parent.syllables.splice(state.index + 1, 1)
      runtimeStore.selectLineSyl(state.parent, state.syllable)
      nextTick(() => staticStore.syllableHooks.get(state.syllable.id)?.focusInput(cursorPos))
      return
    }
    case 'ArrowLeft': {
      // If at start, focus previous syllable
      if (el.selectionStart !== 0) return
      event.preventDefault()
      const prevSyl = findPrevSyl()
      if (!prevSyl) return
      nextTick(() => staticStore.syllableHooks.get(prevSyl.id)?.focusInput(-1))
      return
    }
    case 'ArrowRight': {
      // If at end, focus next syllable
      if (el.selectionStart !== el.value.length) return
      event.preventDefault()
      const nextSyl = findNextSyl()
      if (!nextSyl) return
      nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusInput(0))
      return
    }
    case 'Tab': {
      // Focus next/prev syllable
      event.preventDefault()
      const nextSyl = event.shiftKey ? findPrevSyl() : findNextSyl()
      if (!nextSyl) return
      nextTick(() => staticStore.syllableHooks.get(nextSyl.id)?.focusInput())
      return
    }
    case 'ArrowDown': {
      // Focus romanization input
      if (!prefStore.sylRomanEnabled) return
      event.preventDefault()
      nextTick(() => state.romanInputEl?.select())
      return
    }
    case 'Backquote': {
      // Break syllable at cursor
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      // preventDefault won't work with IME!
      // handle later in compositionend
      const breakIndex = el.selectionStart || 0
      const totDuration = state.syllable.endTime - state.syllable.startTime
      const breakTime =
        state.syllable.startTime + (totDuration * breakIndex) / (el.value.length || 1)
      const newSyllable = coreStore.newSyllable({
        text: el.value.slice(breakIndex),
        startTime: breakTime,
        endTime: state.syllable.endTime,
      })
      state.syllable.endTime = breakTime
      state.syllable.text = el.value.slice(0, breakIndex)
      state.parent.syllables.splice(state.index + 1, 0, newSyllable)
      runtimeStore.selectLineSyl(state.parent, newSyllable)
      nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput(0))
      return
    }
    case 'Escape': {
      // Blur input
      event.preventDefault()
      el.blur()
      return
    }
  }

  function findNextSyl() {
    if (state.index === state.parent.syllables.length - 1)
      return coreStore.lyricLines[state.lineIndex + 1]?.syllables[0] || null
    return state.parent.syllables[state.index + 1] || null
  }
  function findPrevSyl() {
    if (state.index === 0)
      return coreStore.lyricLines[state.lineIndex - 1]?.syllables.at(-1) || null
    return state.parent.syllables[state.index - 1] || null
  }
}
