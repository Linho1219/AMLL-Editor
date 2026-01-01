import type { LyricLine as AMLLLine } from '@applemusic-like-lyrics/core'

import type { Persist } from '@core/types'

export type { LyricLine as AMLLLine, LyricWord as AMLLWord } from '@applemusic-like-lyrics/core'

export function convertToAMLL(persist: Persist): AMLLLine[] {
  return persist.lines.map((l) => ({
    words: l.syllables.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      word: s.text,
      romanWord: s.romanization,
      obscene: false,
    })),
    translatedLyric: l.translation,
    romanLyric: l.romanization,
    isBG: l.background,
    isDuet: l.duet,
    startTime: l.startTime,
    endTime: l.endTime,
  }))
}
