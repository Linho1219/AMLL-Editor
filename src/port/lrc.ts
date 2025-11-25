// Basic LRC parser and stringifier
// LRC is a common lyric format used by many music players
// By 'basic', we mean it only supports line-level timestamps, not word-level timestamps
// For word-level extensions, see LRC A2, etc.

// Format:
// [mm:ss.xx]lyric line1
// [mm:ss.xx]lyric line2
// [mm:ss.xx][mm:ss.xx]lyric line3 (repeat the same line)

// Example:
// [01:56.439]Life goes on, through tides of time
// [02:01.079]Get in the line, to dream alive
// [02:03.552]In our souls, do we know?
// [02:06.103][02:08.916][02:11.135]On the journey

import { coreCreate, type LyricLine } from '@/stores/core'
import { type Persist } from '.'
import { str2ms } from '@/utils/timeModel'

export function parseLRC(lrc: string): Persist {
  const metadata: Record<string, string[]> = {}
  const lines = lrc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const lyricLines: LyricLine[] = []
  lines.forEach((lineStr) => {
    if (lineStr.startsWith('#') || lineStr.startsWith('{')) return
    const tagMatch = lineStr.match(/^\[([a-z]+):([^\]]+)\]$/)
    if (tagMatch) {
      const [, tag, value] = tagMatch
      const key = tag!
      if (!metadata[key]) metadata[key] = []
      metadata[key]!.push(value!.trim())
      return
    }
    const timeStamps: number[] = []
    while (true) {
      const match = lineStr.match(/^\[(\d{1,3}:\d{1,2}(?:\.|:)\d{1,3})\](.*)$/)
      if (!match) break
      const [, timeStr, text] = match
      const timeStamp = str2ms(timeStr!)!
      timeStamps.push(timeStamp)
      lineStr = text!
    }
    if (timeStamps.length === 0) return
    timeStamps.forEach((ts) => {
      lyricLines.push(
        coreCreate.newLine({
          startTime: ts,
          endTime: ts,
          words: [coreCreate.newWord({ word: lineStr, startTime: ts, endTime: ts })],
        }),
      )
    })
  })
  lyricLines.sort((a, b) => a.startTime - b.startTime)
  for (let i = lyricLines.length - 1; i > 0; i--) {
    const line = lyricLines[i]!
    const prevLine = lyricLines[i - 1]!
    prevLine.endTime = line.startTime
    prevLine.words[0]!.endTime = line.startTime
  }
  if (lyricLines.length && metadata.length && metadata.length.length) {
    const length = str2ms(metadata.length[0]!)
    if (length) {
      lyricLines[lyricLines.length - 1]!.endTime = length
      lyricLines[lyricLines.length - 1]!.words[0]!.endTime = length
    }
  }
  return {
    metadata,
    lyricLines,
  }
}

export function stringifyLRC(data: Persist): string {
  const lines = data.lyricLines
  return lines
    .map((line) => {
      const min = Math.floor(line.startTime / 60000)
      const sec = Math.floor((line.startTime % 60000) / 1000)
      const ms = line.startTime % 1000
      const text = line.words.map((w) => w.word).join('')
      return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(
        ms,
      ).padStart(3, '0')}]${text}`
    })
    .join('\n')
}
