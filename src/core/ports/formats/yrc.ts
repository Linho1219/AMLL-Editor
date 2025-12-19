// YRC parser and stringifier
// YRC is a lyric format used by NetEase Cloud Music

// Format:
// [line1Start,line1Duration](word1Start,word1Duration,0)word1(word2Start,word2Duration,0)word2...\n
// [line2Start,line2Duration]...

// Example:
// [190871,1984](190871,361,0)For(0,0,0) (191232,172,0)the(0,0,0) (191404,376,0)first(0,0,0) (191780,1075,0)time
// [193459,4198](193459,412,0)What's(0,0,0) (193871,574,0)past(0,0,0) (194445,506,0)is(0,0,0) (194951,2706,0)past

import type { LyricLine, Persist } from '@core/types'
import { coreCreate } from '@states/stores/core'

export function parseYRC(yrc: string): Persist {
  const lines = yrc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lyricLines: LyricLine[] = lines
    .map((lineStr) => {
      const lineMatch = lineStr.match(/^\[(\d+),(\d+)\]/)
      if (!lineMatch) return null
      const [lMatchStr, lStartStr, lDurStr] = lineMatch

      const wordPattern = /\((\d+),(\d+),0\)([^\(]*)/g
      const wordMatches = lineStr.slice(lMatchStr.length).matchAll(wordPattern)
      const words = [...wordMatches].map((match) => {
        const [, wStartStr, wDurStr, wText] = match
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

export function stringifyYRC(data: Persist): string {
  const lines = data.lyricLines
  return lines
    .map((line) => {
      const lStart = line.startTime
      const lDur = line.endTime - line.startTime
      const lWords = line.words
        .map((w) => {
          const wStart = w.startTime
          const wDur = w.endTime - w.startTime
          return `(${wStart},${wDur},0)${w.text}`
        })
        .join('')
      return `[${lStart},${lDur}]${lWords}`
    })
    .join('\n')
}
