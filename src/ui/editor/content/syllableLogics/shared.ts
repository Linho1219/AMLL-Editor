import { nextTick } from 'vue'

import type { LyricLine, LyricSyllable } from '@core/types'

import type { Maybe } from '@utils/types'

export interface SyllableState {
  index: number
  lineIndex: number
  parent: LyricLine
  syllable: LyricSyllable
  romanInputEl?: Maybe<HTMLInputElement>
  inputEl?: Maybe<HTMLInputElement>
}

export function hijackCompositionBackquote(e: CompositionEvent) {
  const el = e.target as HTMLInputElement
  const pos = el.selectionStart || 0
  const lastChar = el.value.charAt(pos - 1)
  if (lastChar === '·') {
    e.preventDefault()
    el.value = el.value.slice(0, pos - 1) + el.value.slice(pos)
    triggerInputEvent(el)
    nextTick(() => el.setSelectionRange(pos - 1, pos - 1))
  }
}

export function triggerInputEvent(el: HTMLElement) {
  const event = new Event('input', { bubbles: true })
  el.dispatchEvent(event)
}
