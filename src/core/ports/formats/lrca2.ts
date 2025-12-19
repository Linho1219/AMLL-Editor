// LRC A2 Extension parser and stringifier
// LRC A2 is an extension of the basic LRC format that supports word-level timestamps
// Word time must be continuous within a line, starting from time on its left and ending at time on its right

// Format:
// [mm:ss.xx]<mm:ss.xx>word1 <mm:ss.xx>word2 <mm:ss.xx>word3<mm:ss.xx>

// Example:
// [02:38.850]<02:38.850>Words <02:39.030>are <02:39.120>made <02:39.360>of <02:39.420>plastic<02:40.080>
// [02:40.080]<02:40.080>Come <02:40.290>back <02:40.470>like <02:40.680>elastic<02:41.370>

import type { LyricLine, LyricWord } from '@core/types'
import type { Persist } from '..'
import { ms2str, str2ms } from '@utils/timeModel'
import { coreCreate } from '@states/stores/core'

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
    const wordTimestampRegex = /^<(\d{1,3}:\d{1,2}\.\d{1,3})>/
    const textRegex = /^[^<]*/
    while (lineStr.length) {
      const timeStampMatch = lineStr.match(wordTimestampRegex)
      if (!timeStampMatch) {
        const textMatch = lineStr.match(textRegex)![0]
        lineItems.push(textMatch)
        lineStr = lineStr.slice(textMatch.length)
      } else {
        const [wordTimeStamp, wordTimeStr] = timeStampMatch
        lineItems.push(str2ms(wordTimeStr!)!)
        lineStr = lineStr.slice(wordTimeStamp.length)
      }
    }
    const words: LyricWord[] = []
    lineItems.forEach((item, index) => {
      if (typeof item === 'number') return
      const startTime = lineItems[index - 1] ?? lineStartTime
      const endTime = lineItems[index + 1] ?? startTime
      if (typeof startTime !== 'number' || typeof endTime !== 'number') return
      if (item.startsWith(' ') && words.at(-1)?.text.trim())
        words.push(coreCreate.newWord({ text: ' ' }))
      words.push(coreCreate.newWord({ text: item.trim(), startTime, endTime }))
      if (item.endsWith(' ')) words.push(coreCreate.newWord({ text: ' ' }))
    })
    const lineEndTime = words.at(-1)?.endTime ?? lineStartTime
    lyricLines.push(
      coreCreate.newLine({
        startTime: lineStartTime,
        endTime: lineEndTime,
        words,
      }),
    )
  })
  return {
    metadata,
    lyricLines,
  }
}

export function stringifyLRCa2(data: Persist): string {
  return data.lyricLines
    .map((line) => {
      if (line.words.length === 0) return `[${ms2str(line.startTime)}]`
      const normalizedWords: { text: string; startTime: number; endTime: number }[] = []
      line.words.forEach((w) => {
        if (!w.text.trim() && normalizedWords.length) {
          normalizedWords.at(-1)!.text += w.text
          return
        }
        normalizedWords.push({ text: w.text, startTime: w.startTime, endTime: w.endTime })
      })
      const lineItems: (number | string)[] = []
      normalizedWords.forEach((w) => lineItems.push(w.startTime, w.text))
      lineItems.push(normalizedWords.at(-1)!.endTime)
      const lineStr =
        `[${ms2str(line.startTime)}]` +
        lineItems.map((item) => (typeof item === 'number' ? `<${ms2str(item)}>` : item)).join('')
      return lineStr
    })
    .join('\n')
}
