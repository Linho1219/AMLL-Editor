import type { LyricLine } from '@/stores/core'
/** Set line's startTime as the startTime of its first word */
export function alignLineStartTime(line: LyricLine) {
  if (line.words.length === 0) return
  const firstWord = line.words[0]!
  line.startTime = firstWord.startTime
}
/** Set line's endTime as the endTime of its last word */
export function alignLineEndTime(line: LyricLine) {
  if (line.words.length === 0) return
  const lastWord = line.words.at(-1)!
  line.endTime = lastWord.endTime
}
/** Set line's startTime and endTime according to its words */
export function alignLineTime(line: LyricLine) {
  alignLineStartTime(line)
  alignLineEndTime(line)
}
