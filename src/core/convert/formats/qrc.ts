import type { LyricLine, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

import MANIFEST from '../manifest.json'
import type { Convert as CV } from '../types'

// QRC parser and stringifier
// QRC is a lyric format used by QQ Music

// Format:
// [line1Start,line1Duration]syl1(syl1Start,syl1Duration)syl2(syl2Start,syl2Duration)...\n
// [line2Start,line2Duration]...

// Example:
// [190871,1984]For(190871,361) (0,0)the(191232,172) (0,0)first(191404,376) (0,0)time(191780,1075)
// [193459,4198]What's(193459,412) (0,0)past(193871,574) (0,0)is(194445,506) (0,0)past(194951,2706)

export const qrcReg: CV.Format = {
  ...MANIFEST.qrc,
  parser: parseQRC,
  stringifier: stringifyQRC,
}

export function parseQRC(qrc: string) {
  const lineStrs = qrc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lines: LyricLine[] = lineStrs
    .map((lineStr) => {
      const lineMatch = lineStr.match(/^\[(\d+),(\d+)\]/)
      if (!lineMatch) return null
      const [lMatchStr, lStartStr, lDurStr] = lineMatch

      const sylPattern = /([^\(]*)\((\d+),(\d+)\)/g
      const sylMatches = lineStr.slice(lMatchStr.length).matchAll(sylPattern)
      const syls = [...sylMatches].flatMap((match) => {
        const [, sText, sStartStr, sDurStr] = match
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
    lines,
  }
}

export function stringifyQRC(data: Persist): string {
  const lines = data.lines
  return lines
    .map((line) => {
      const lStart = line.startTime
      const lDur = line.endTime - line.startTime
      const lSyls = line.syllables
        .map((s) => {
          const sStart = s.startTime
          const sDur = s.endTime - s.startTime
          return `${s.text}(${sStart},${sDur})`
        })
        .join('')
      return `[${lStart},${lDur}]${lSyls}`
    })
    .join('\n')
}
