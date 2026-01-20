import { omitAttrs } from '@utils/omitAttrs'

import type { ProjDataTill_0_0 } from './0_0'

/**
 * Data version 0.1
 *
 * CHANGELOG (v0.0 -> v0.1):
 * - Rename "words" to "syllables"
 * - Rename "lyricLines" to "lines"
 * - Remove "currentplaceholdingBeat" from syllables
 *
 * CHANGELOG (v0.1 -> v0.1.1):
 * - Add "connectNext" to lines
 */
export interface ProjData_0_1 {
  dataVersion: 'ALDv0.1'

  metadata: Record<string, string[]>
  lines: {
    id: string
    translation: string
    romanization: string
    background: boolean
    duet: boolean
    startTime: number
    endTime: number
    syllables: {
      id: string
      startTime: number
      endTime: number
      text: string
      romanization: string
      placeholdingBeat: number
      bookmarked: boolean
    }[]
    ignoreInTiming: boolean
    bookmarked: boolean
    connectNext?: boolean
  }[]
}

export type ProjDataTill_0_1 = ProjDataTill_0_0 | ProjData_0_1
export function migrateTo_0_1(data: ProjDataTill_0_1): ProjData_0_1 {
  if (data.dataVersion === 'ALDv0.1') return data
  const data_0_0 = data
  return {
    dataVersion: 'ALDv0.1',
    metadata: data_0_0.metadata,
    lines: data_0_0.lyricLines.map((line) => ({
      ...omitAttrs(line, 'words'),
      syllables: line.words.map((word) => ({
        ...omitAttrs(word, 'currentplaceholdingBeat'),
      })),
    })),
  }
}
