import type { MetadataKey, Persist } from '@core/types'
import { editHistory } from './history'
import { useCoreStore, useRuntimeStore } from '@states/stores'

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
  editHistory.clear()
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
