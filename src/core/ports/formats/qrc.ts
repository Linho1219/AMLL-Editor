// QRC parser and stringifier
// QRC is a lyric format used by QQ Music

// Format:
// [line1Start,line1Duration](word1Start,word1Duration)word1(word2Start,word2Duration)word2...\n
// [line2Start,line2Duration]...

// Example:
// [190871,1984]For(190871,361) (0,0)the(191232,172) (0,0)first(191404,376) (0,0)time(191780,1075)
// [193459,4198]What's(193459,412) (0,0)past(193871,574) (0,0)is(194445,506) (0,0)past(194951,2706)

import type { LyricLine } from '@core/types'
import { type Persist } from '..'
import { coreCreate } from '@states/stores/core'

export function parseQRC(qrc: string) {
  const lines = qrc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lyricLines: LyricLine[] = lines
    .map((lineStr) => {
      const lineMatch = lineStr.match(/^\[(\d+),(\d+)\]/)
      if (!lineMatch) return null
      const [lMatchStr, lStartStr, lDurStr] = lineMatch

      const wordPattern = /([^\(]*)\((\d+),(\d+)\)/g
      const wordMatches = lineStr.slice(lMatchStr.length).matchAll(wordPattern)
      const words = [...wordMatches].map((match) => {
        const [, wText, wStartStr, wDurStr] = match
        return coreCreate.newWord({
          text: wText,
          startTime: Number(wStartStr),
          endTime: Number(wStartStr) + Number(wDurStr),
        })
      })

      return coreCreate.newLine({
        startTime: Number(lStartStr),
        endTime: Number(lStartStr) + Number(lDurStr),
        words,
      })
    })
    .filter((line): line is LyricLine => line !== null)
  return {
    metadata: {},
    lyricLines,
  }
}

export function stringifyQRC(data: Persist): string {
  const lines = data.lyricLines
  return lines
    .map((line) => {
      const lStart = line.startTime
      const lDur = line.endTime - line.startTime
      const lWords = line.words
        .map((w) => {
          const wStart = w.startTime
          const wDur = w.endTime - w.startTime
          return `${w.text}(${wStart},${wDur})`
        })
        .join('')
      return `[${lStart},${lDur}]${lWords}`
    })
    .join('\n')
}
