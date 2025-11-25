import { useAudioCtrl } from '@/utils/audio'
import type { LyricLine, LyricWord } from './core'
import type { ScrollToIndexOpts } from 'virtua/unstable_core'

const staticStore = {
  lineHooks: new Map<string, LineComponentActions>(),
  wordHooks: new Map<string, WordComponentActions>(),
  closeContext: null as null | (() => void),
  audio: useAudioCtrl(),
  lastTouchedLine: null as LyricLine | null,
  lastTouchedWord: null as LyricWord | null,
  touchLineWord,
  touchLineOnly,
  touchClear,
  scrollToHook: null as null | ScrollTo,
}

export const useStaticStore = () => staticStore

export interface LineComponentActions {
  scrollTo: () => void
  setHighlight: (highlight: boolean) => void
}
export interface WordComponentActions {
  scrollTo: () => void
  setHighlight: (highlight: boolean) => void
  focusInput: (position?: number) => void
}

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
