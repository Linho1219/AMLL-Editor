import { zip } from 'lodash-es'

import type { LyricLine, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

export function parseSeparatePlainText(
  originalStr: string,
  translationStr: string = '',
  romanStr: string = '',
): Persist {
  const lineStrs = zip(
    ...[originalStr, translationStr, romanStr].map((s) => s.split(/\r?\n/).map((s) => s.trim())),
  ).filter(([orig, trans, roman]) => orig || trans || roman)
  const lyricLines = lineStrs.map(([orig, trans, roman]) => {
    return coreCreate.newLine({
      syllables: [
        coreCreate.newSyllable({
          text: orig || '',
        }),
      ],
      translation: trans || '',
      romanization: roman || '',
    })
  })
  return { metadata: {}, lines: lyricLines }
}

interface InterleaveConfig {
  originalIndex: number
  translationIndex?: number
  romanIndex?: number
  groupSize: number
}
export function parseInterleavedPlainText(
  { originalIndex, translationIndex, romanIndex, groupSize }: InterleaveConfig,
  plainStr: string,
): Persist {
  const rawLines = plainStr.split(/\r?\n/).map((s) => s.trim())
  if (rawLines.length % groupSize !== 0) {
    let left = rawLines.length % groupSize
    while (left-- > 0) rawLines.push('')
  }
  const lyricLines: LyricLine[] = []
  for (let i = 0; i < rawLines.length; i += groupSize) {
    const original = rawLines[i + originalIndex] || ''
    const translation = translationIndex === undefined ? '' : rawLines[i + translationIndex] || ''
    const romanization = romanIndex === undefined ? '' : rawLines[i + romanIndex] || ''
    lyricLines.push(
      coreCreate.newLine({
        syllables: [
          coreCreate.newSyllable({
            text: original,
          }),
        ],
        translation,
        romanization,
      }),
    )
  }
  return { metadata: {}, lines: lyricLines }
}
