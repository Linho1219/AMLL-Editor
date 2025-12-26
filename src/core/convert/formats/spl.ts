import type { LyricLine, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

import { ms2str, str2ms } from '@utils/formatTime'

import MANIFEST from '../manifest.json'
import type { Convert as CV } from '../types'

// SPL, Salt Player Lyrics format
// An extension of LRC format. Quite complicated.
// Multiple line timestamps means repeat the same line
// <> and [] are both supported for syllable timestamps
// but when [] represents syllable timestamps, shouldn't be at the beginning: it will be treated as line timestamp

// Format:
// [mm:ss.xx]Line without syllable timestamps
// No timestamp: this is translation of last line
// [m1:s1.x1]Another line without syllable timestamps
// [m1:s1.x1]Same timestamp: this is translation of last line
// [mm:ss.xx][mm:ss.xx][mm:ss.xx]Line without syllable timestamps, repeat several times
// [mm:ss.xx]<mm:ss.xx>Syllable <mm:ss.xx>timestamp <mm:ss.xx>can[mm:ss.xx]
// [mm:ss.xx]use [mm:ss.xx]both [mm:ss.xx]symbols [mm:ss.xx]

export const splReg: CV.Format = {
  ...MANIFEST.spl,
  parser: parseSPL,
  stringifier: stringifySPL,
}

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
    const sylTimestampRegex = /^[<[](\d{1,3}:\d{1,2}\.\d{1,3})\d{0,3}[>\]]/
    const textRegex = /^[^<\[]*/
    const lineItems: (number | string)[] = []
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
    const syls: { text: string; startTime: number | undefined; endTime: number | undefined }[] = []
    lineItems.forEach((item, index) => {
      if (typeof item === 'number') return
      const startTime = lineItems[index - 1]
      const endTime = lineItems[index + 1]
      if (typeof startTime === 'string' || typeof endTime === 'string') return
      if (item.startsWith(' ') && syls.at(-1)?.text.trim())
        syls.push({ text: ' ', startTime: 0, endTime: 0 })
      syls.push({ text: item.trim(), startTime, endTime })
      if (item.endsWith(' ')) syls.push({ text: ' ', startTime: 0, endTime: 0 })
    })
    lineTimeStamps.forEach((lineStartTime) => {
      lyricLines.push(
        coreCreate.newLine({
          startTime: lineStartTime,
          endTime: syls.at(-1)?.endTime ?? lineStartTime,
          syllables: syls.map((s) =>
            coreCreate.newSyllable({
              text: s.text,
              startTime: s.startTime ?? lineStartTime,
              endTime: s.endTime ?? lineStartTime,
            }),
          ),
        }),
      )
    })
  })
  return {
    metadata: {},
    lines: lyricLines,
  }
}

export function stringifySPL(data: Persist): string {
  const lineStrs: string[] = []
  data.lines.forEach((line) => {
    if (line.syllables.length === 0) return `[${ms2str(line.startTime)}]`
    const normalizedSyls: { text: string; startTime: number; endTime: number }[] = []
    line.syllables.forEach((s) => {
      if (!s.text.trim() && normalizedSyls.length) {
        normalizedSyls.at(-1)!.text += s.text
        return
      }
      normalizedSyls.push({ text: s.text, startTime: s.startTime, endTime: s.endTime })
    })
    const lineItems: (number | string)[] = []
    normalizedSyls.forEach((s) => lineItems.push(s.startTime, s.text))
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
