import type { LyricLine, LyricSyllable } from '@core/types'

import { useCoreStore } from '@states/stores'

export function sortIndex(a: number, b: number): [number, number] {
  if (a < 0 || b < 0) throw new Error('Indices must be non-negative')
  return a < b ? [a, b] : [b, a]
}

export function sortSyllables(...syls: LyricSyllable[]): LyricSyllable[] {
  if (syls.length <= 1) return syls
  const coreStore = useCoreStore()
  const indexMap = new WeakMap<LyricSyllable, number>()
  let index = 0
  for (const line of coreStore.lyricLines)
    for (const syl of line.syllables) indexMap.set(syl, index++)
  return syls.sort((a, b) => indexMap.get(a)! - indexMap.get(b)!)
}

export function sortLines(...lines: LyricLine[]): LyricLine[] {
  if (lines.length <= 1) return lines
  const coreStore = useCoreStore()
  const indexMap = new WeakMap<LyricLine, number>()
  coreStore.lyricLines.forEach((line, index) => indexMap.set(line, index))
  return lines.sort((a, b) => indexMap.get(a)! - indexMap.get(b)!)
}
