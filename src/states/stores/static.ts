import { useAudioCtrl } from '@core/audio'
import type { LyricLine, LyricWord, View } from '@core/types'
import type { ScrollToIndexOpts } from 'virtua/unstable_core'

const staticStore = {
  lineHooks: new Map<string, LineComponentActions>(),
  wordHooks: new Map<string, WordComponentActions>(),
  editorHook: null as null | EditorComponentActions,
  closeContext: null as null | (() => void),
  audio: useAudioCtrl(),
  lastTouchedLine: null as LyricLine | null,
  lastTouchedWord: null as LyricWord | null,
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
export interface WordComponentActions {
  focusInput: (position?: number) => void
  hightLightInput: () => void
}
export interface EditorComponentActions {
  view: View
  scrollTo: ScrollTo
}
export type WaitForConfirmHook = () => Promise<boolean>

function touchLineWord(line: LyricLine, word: LyricWord) {
  staticStore.lastTouchedLine = line
  staticStore.lastTouchedWord = word
}
function touchLineOnly(line: LyricLine) {
  staticStore.lastTouchedLine = line
  staticStore.lastTouchedWord = null
}
function touchClear() {
  staticStore.lastTouchedLine = null
  staticStore.lastTouchedWord = null
}

type ScrollTo = (index: number, options?: ScrollToIndexOpts) => void
