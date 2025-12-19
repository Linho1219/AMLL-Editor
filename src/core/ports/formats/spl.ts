// SPL, Salt Player Lyrics format
// An extension of LRC format. Quite complicated.
// Multiple line timestamps means repeat the same line
// <> and [] are both supported for word timestamps
// but when [] represents word timestamps, shouldn't be at the beginning: it will be treated as line timestamp

import type { LyricLine } from '@core/types'
import type { Persist } from '..'
import { ms2str, str2ms } from '@utils/timeModel'
import { coreCreate } from '@states/stores/core'

// Format:
// [mm:ss.xx]Line without word timestamps
// No timestamp: this is translation of last line
// [m1:s1.x1]Another line without word timestamps
// [m1:s1.x1]Same timestamp: this is translation of last line
// [mm:ss.xx][mm:ss.xx][mm:ss.xx]Line without word timestamps, repeat several times
// [mm:ss.xx]<mm:ss.xx>Word <mm:ss.xx>timestamp <mm:ss.xx>can[mm:ss.xx]
// [mm:ss.xx]use [mm:ss.xx]both [mm:ss.xx]symbols [mm:ss.xx]

export function parseSPL(spl: string): Persist {
  const lines = spl
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ''))
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lyricLines: LyricLine[] = []
  lines.forEach((lineStr) => {
    const lineTimeStamps: number[] = []
    while (true) {
      const match = lineStr.match(/^\[(\d{1,3}:\d{1,2}\.\d{1,3})\d{0,3}\](.*)$/)
      if (!match) break
      const [, timeStr, text] = match
      const timeStamp = str2ms(timeStr!)!
      lineTimeStamps.push(timeStamp)
      lineStr = text!
    }
    const lastLine = lyricLines.at(-1)
    if (
      lineTimeStamps.length === 0 ||
      (lineTimeStamps.length === 1 && lineTimeStamps[0] === lastLine?.startTime)
    ) {
      if (!lastLine) return
      if (!lastLine.translation) lastLine.translation = lineStr
      else lastLine.romanization = lineStr
      return
    }
    const wordTimestampRegex = /^[<[](\d{1,3}:\d{1,2}\.\d{1,3})\d{0,3}[>\]]/
    const textRegex = /^[^<\[]*/
    const lineItems: (number | string)[] = []
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
    const words: { text: string; startTime: number | undefined; endTime: number | undefined }[] = []
    lineItems.forEach((item, index) => {
      if (typeof item === 'number') return
      const startTime = lineItems[index - 1]
      const endTime = lineItems[index + 1]
      if (typeof startTime === 'string' || typeof endTime === 'string') return
      if (item.startsWith(' ') && words.at(-1)?.text.trim())
        words.push({ text: ' ', startTime: 0, endTime: 0 })
      words.push({ text: item.trim(), startTime, endTime })
      if (item.endsWith(' ')) words.push({ text: ' ', startTime: 0, endTime: 0 })
    })
    lineTimeStamps.forEach((lineStartTime) => {
      lyricLines.push(
        coreCreate.newLine({
          startTime: lineStartTime,
          endTime: words.at(-1)?.endTime ?? lineStartTime,
          words: words.map((w) =>
            coreCreate.newWord({
              text: w.text,
              startTime: w.startTime ?? lineStartTime,
              endTime: w.endTime ?? lineStartTime,
            }),
          ),
        }),
      )
    })
  })
  return {
    metadata: {},
    lyricLines,
  }
}

export function stringifySPL(data: Persist): string {
  const lineStrs: string[] = []
  data.lyricLines.forEach((line) => {
    if (line.words.length === 0) return `[${ms2str(line.startTime)}]`
    const normalizedWords: { word: string; startTime: number; endTime: number }[] = []
    line.words.forEach((w) => {
      if (!w.text.trim() && normalizedWords.length) {
        normalizedWords.at(-1)!.word += w.text
        return
      }
      normalizedWords.push({ word: w.text, startTime: w.startTime, endTime: w.endTime })
    })
    const lineItems: (number | string)[] = []
    normalizedWords.forEach((w) => lineItems.push(w.startTime, w.word))
    if (lineItems[0] === line.startTime) lineItems.shift()
    const lineStr =
      `[${ms2str(line.startTime)}]` +
      lineItems.map((item) => (typeof item === 'number' ? `<${ms2str(item)}>` : item)).join('') +
      `[${ms2str(line.endTime)}]`
    lineStrs.push(lineStr)
    if (line.translation) lineStrs.push(line.translation)
    if (line.romanization) lineStrs.push(line.romanization)
  })
  return lineStrs.join('\n')
}
