import { type ProjDataTill_0_1, migrateTo_0_1 } from './0_1'

/**
 * Data version 0.2
 *
 * CHANELOG (v0.1 -> v0.2):
 * - Add connectNext to lines (default to false)
 */
export interface ProjData_0_2 {
  dataVersion: 'ALDv0.2'

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
    connectNext: boolean
  }[]
}

export type ProjDataTill_0_2 = ProjDataTill_0_1 | ProjData_0_2
export function migrateTo_0_2(data: ProjDataTill_0_2): ProjData_0_2 {
  if (data.dataVersion === 'ALDv0.2') return data
  const data_0_1 = migrateTo_0_1(data)
  return {
    dataVersion: 'ALDv0.2',
    metadata: data_0_1.metadata,
    lines: data_0_1.lines.map((line) => ({
      ...line,
      connectNext: false,
    })),
  }
}
