export type { Port } from './types'
import type { Port as PT } from './types'
export { portFormatRegister } from './data'

import { useCoreStore, useRuntimeStore } from '@states/stores'
import { editHistory } from '@states/services/history'
import type { LyricLine, MetadataKey } from '@core/types'

export interface Persist {
  metadata: Record<MetadataKey, string[]>
  lyricLines: LyricLine[]
  version?: string
}

export function importPersist(data: Persist) {
  editHistory.shutdown()
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  runtimeStore.clearSelection()
  coreStore.metadata.length = 0
  for (const [k, values] of Object.entries(data.metadata)) {
    const key = k as MetadataKey
    coreStore.metadata.push({ key, values })
  }
  coreStore.lyricLines.splice(0, coreStore.lyricLines.length, ...data.lyricLines)
  editHistory.init()
}

export function exportPersist(): Persist {
  const coreStore = useCoreStore()
  const outputData: Persist = {
    metadata: [...coreStore.metadata].reduce(
      (obj, { key, values }) => ((obj[key] = values), obj),
      {} as Record<MetadataKey, string[]>,
    ),
    lyricLines: coreStore.lyricLines,
    version: __VERSION__,
  }
  return outputData
}
