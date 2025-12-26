import type { LyricLine, LyricSyllable, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

import { ms2str, str2ms } from '@utils/formatTime'

import MANIFEST from '../manifest.json'
import type { Convert as CV } from '../types'

// LRC A2 Extension parser and stringifier
// LRC A2 is an extension of the basic LRC format that supports syl-level timestamps
// syl time must be continuous within a line, starting from time on its left and ending at time on its right

// Format:
// [mm:ss.xx]<mm:ss.xx>syl1 <mm:ss.xx>syl2 <mm:ss.xx>syl3<mm:ss.xx>

// Example:
// [02:38.850]<02:38.850>syls <02:39.030>are <02:39.120>made <02:39.360>of <02:39.420>plastic<02:40.080>
// [02:40.080]<02:40.080>Come <02:40.290>back <02:40.470>like <02:40.680>elastic<02:41.370>

export const lrcA2Reg: CV.Format = {
  ...MANIFEST.lrcA2,
  parser: parseLRCa2,
  stringifier: stringifyLRCa2,
}

const tagMetadataMap: Record<string, string> = {
  ti: 'title',
  ar: 'artist',
  al: 'album',
  au: 'author',
  lr: 'lyricist',
  by: 'lrcAuthor',
}

export function parseLRCa2(lrc: string): Persist {
  const metadata: Record<string, string[]> = {}
  const lines = lrc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lyricLines: LyricLine[] = []
  lines.forEach((lineStr) => {
    if (lineStr.startsWith('#') || lineStr.startsWith('{')) return
    const tagMatch = lineStr.match(/^\[([a-z]):(.+)\]$/i)
    if (tagMatch) {
      const [, tag, value] = tagMatch
      const key = tagMetadataMap[tag!.toLowerCase()] ?? tag!
      if (!metadata[key]) metadata[key] = []
      metadata[key]!.push(value!.trim())
      return
    }
    const lineTimeStampmatch = lineStr.match(/^\[(\d{1,3}:\d{1,2}\.\d{1,3})\]/)
    if (!lineTimeStampmatch) return
    const [lineTimeStamp, lineTimeStr] = lineTimeStampmatch
    const lineStartTime = str2ms(lineTimeStr!)!
    lineStr = lineStr.slice(lineTimeStamp.length).trim()

    const lineItems: (number | string)[] = []
    const sylTimestampRegex = /^<(\d{1,3}:\d{1,2}\.\d{1,3})>/
    const textRegex = /^[^<]*/
    while (lineStr.length) {
      const timeStampMatch = lineStr.match(sylTimestampRegex)
      if (!timeStampMatch) {
        const textMatch = lineStr.match(textRegex)![0]
        lineItems.push(textMatch)
        lineStr = lineStr.slice(textMatch.length)
      } else {
        const [sylTimeStamp, sylTimeStr] = timeStampMatch
        lineItems.push(str2ms(sylTimeStr!)!)
        lineStr = lineStr.slice(sylTimeStamp.length)
      }
    }
    const syls: LyricSyllable[] = []
    lineItems.forEach((item, index) => {
      if (typeof item === 'number') return
      const startTime = lineItems[index - 1] ?? lineStartTime
      const endTime = lineItems[index + 1] ?? startTime
      if (typeof startTime !== 'number' || typeof endTime !== 'number') return
      if (item.startsWith(' ') && syls.at(-1)?.text.trim())
        syls.push(coreCreate.newSyllable({ text: ' ' }))
      syls.push(coreCreate.newSyllable({ text: item.trim(), startTime, endTime }))
      if (item.endsWith(' ')) syls.push(coreCreate.newSyllable({ text: ' ' }))
    })
    const lineEndTime = syls.at(-1)?.endTime ?? lineStartTime
    lyricLines.push(
      coreCreate.newLine({
        startTime: lineStartTime,
        endTime: lineEndTime,
        syllables: syls,
      }),
    )
  })
  return {
    metadata,
    lines: lyricLines,
  }
}

export function stringifyLRCa2(data: Persist): string {
  return data.lines
    .map((line) => {
      if (line.syllables.length === 0) return `[${ms2str(line.startTime)}]`
      const normalizedsyls: { text: string; startTime: number; endTime: number }[] = []
      line.syllables.forEach((s) => {
        if (!s.text.trim() && normalizedsyls.length) {
          normalizedsyls.at(-1)!.text += s.text
          return
        }
        normalizedsyls.push({ text: s.text, startTime: s.startTime, endTime: s.endTime })
      })
      const lineItems: (number | string)[] = []
      normalizedsyls.forEach((s) => lineItems.push(s.startTime, s.text))
      lineItems.push(normalizedsyls.at(-1)!.endTime)
      const lineStr =
        `[${ms2str(line.startTime)}]` +
        lineItems.map((item) => (typeof item === 'number' ? `<${ms2str(item)}>` : item)).join('')
      return lineStr
    })
    .join('\n')
}
