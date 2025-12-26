import type { LyricLine, LyricSyllable } from '@core/types'

const isSyllableTimed = (syl: LyricSyllable) =>
  !!((syl.startTime || syl.endTime) && syl.text.trim())

/** Set line's startTime as the startTime of its first syllable */
export function alignLineStartTime(line: LyricLine) {
  if (line.syllables.length === 0) return
  for (let i = 0; i < line.syllables.length; i++) {
    const syl = line.syllables[i]!
    if (isSyllableTimed(syl)) {
      line.startTime = syl.startTime
      return
    }
  }
}
/** Set line's endTime as the endTime of its last syllable */
export function alignLineEndTime(line: LyricLine) {
  if (line.syllables.length === 0) return
  for (let i = line.syllables.length - 1; i >= 0; i--) {
    const syl = line.syllables[i]!
    if (isSyllableTimed(syl)) {
      line.endTime = syl.endTime
      return
    }
  }
}
/** Set line's startTime and endTime according to its syllables */
export function alignLineTime(line: LyricLine) {
  alignLineStartTime(line)
  alignLineEndTime(line)
}
