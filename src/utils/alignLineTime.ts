import type { LyricLine, LyricWord } from '@core/types'

const isWordTimed = (word: LyricWord) => !!((word.startTime || word.endTime) && word.text.trim())

/** Set line's startTime as the startTime of its first word */
export function alignLineStartTime(line: LyricLine) {
  if (line.words.length === 0) return
  for (let i = 0; i < line.words.length; i++) {
    const word = line.words[i]!
    if (isWordTimed(word)) {
      line.startTime = word.startTime
      return
    }
  }
}
/** Set line's endTime as the endTime of its last word */
export function alignLineEndTime(line: LyricLine) {
  if (line.words.length === 0) return
  for (let i = line.words.length - 1; i >= 0; i--) {
    const word = line.words[i]!
    if (isWordTimed(word)) {
      line.endTime = word.endTime
      return
    }
  }
}
/** Set line's startTime and endTime according to its words */
export function alignLineTime(line: LyricLine) {
  alignLineStartTime(line)
  alignLineEndTime(line)
}
