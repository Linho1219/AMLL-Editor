import type { LyricLine, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

import MANIFEST from '../manifest.json'
import type { Convert as CV } from '../types'

// YRC parser and stringifier
// YRC is a lyric format used by NetEase Cloud Music

// Format:
// [line1Start,line1Duration](syl1Start,syl1Duration,0)syl1(syl2Start,syl2Duration,0)syl2...\n
// [line2Start,line2Duration]...

// Example:
// [190871,1984](190871,361,0)For (191232,172,0)the (191404,376,0)first (191780,1075,0)time
// [193459,4198](193459,412,0)What's (193871,574,0)past (194445,506,0)is (194951,2706,0)past

export const yrcReg: CV.Format = {
  ...MANIFEST.yrc,
  parser: parseYRC,
  stringifier: stringifyYRC,
}

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

      const sylPattern = /\((\d+),(\d+),0\)([^\(]*)/g
      const sylMatches = lineStr.slice(lMatchStr.length).matchAll(sylPattern)
      const syls = [...sylMatches].flatMap((match) => {
        const [, sStartStr, sDurStr, sText] = match
        if (sStartStr === undefined || sDurStr === undefined || sText === undefined) return []
        const trimedText = sText.trim()
        const syls = [
          coreCreate.newSyllable({
            text: trimedText,
            startTime: Number(sStartStr),
            endTime: Number(sStartStr) + Number(sDurStr),
          }),
        ]
        if (sText.startsWith(' ')) syls.unshift(coreCreate.newSyllable({ text: ' ' }))
        if (sText.endsWith(' ')) syls.push(coreCreate.newSyllable({ text: ' ' }))
        return syls
      })

      return coreCreate.newLine({
        startTime: Number(lStartStr),
        endTime: Number(lStartStr) + Number(lDurStr),
        syllables: syls,
      })
    })
    .filter((line): line is LyricLine => line !== null)
  return {
    metadata: {},
    lines: lyricLines,
  }
}

export function stringifyYRC(data: Persist): string {
  const lines = data.lines
  return lines
    .map((line) => {
      const lStart = line.startTime
      const lDur = line.endTime - line.startTime
      const lSyls: string[] = []
      for (const { text, startTime, endTime } of line.syllables) {
        if (!text.trim() && lSyls.length) {
          lSyls[lSyls.length - 1] += text
          continue
        }
        const sStart = startTime
        const sDur = endTime - startTime
        lSyls.push(`(${sStart},${sDur},0)${text}`)
      }
      return `[${lStart},${lDur}]${lSyls.join('')}`
    })
    .join('\n')
}
