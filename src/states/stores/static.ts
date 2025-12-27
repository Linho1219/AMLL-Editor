import type { ScrollToIndexOpts } from 'virtua/unstable_core'

import type { LyricLine, LyricSyllable, View } from '@core/types'

const staticStore = {
  lineHooks: new Map<string, LineComponentActions>(),
  syllableHooks: new Map<string, SylComponentActions>(),
  editorHook: null as null | EditorComponentActions,
  closeContext: null as null | (() => void),
  lastTouchedLine: null as LyricLine | null,
  lastTouchedSyl: null as LyricSyllable | null,
  touchLineWord,
  touchLineOnly,
  touchClear,
  scrollToHook: null as null | ScrollTo,
  waitForDataDropConfirmHook: null as null | WaitForConfirmHook,
}

export const useStaticStore = () => staticStore

export interface LineComponentActions {
  focusRomanInput: (position?: number) => void
  focusTranslationInput: (position?: number) => void
  hightLightRoman: () => void
  hightLightTranslation: () => void
}
export interface SylComponentActions {
  focusInput: (position?: number) => void
  focusRomanInput: (position?: number) => void
  hightLightInput: () => void
  hightLightRoman: () => void
}
export interface EditorComponentActions {
  view: View
  scrollTo: ScrollTo
}
export type WaitForConfirmHook = () => Promise<boolean>

function touchLineWord(line: LyricLine, syl: LyricSyllable) {
  staticStore.lastTouchedLine = line
  staticStore.lastTouchedSyl = syl
}
function touchLineOnly(line: LyricLine) {
  staticStore.lastTouchedLine = line
  staticStore.lastTouchedSyl = null
}
function touchClear() {
  staticStore.lastTouchedLine = null
  staticStore.lastTouchedSyl = null
}

type ScrollTo = (index: number, options?: ScrollToIndexOpts) => void
