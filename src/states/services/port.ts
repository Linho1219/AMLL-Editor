import type { MetadataKey, Persist } from '@core/types'
import { editHistory } from './history'
import { useCoreStore, useRuntimeStore } from '@states/stores'
import { cloneDeep } from 'lodash-es'

export function applyPersist(data: Persist) {
  data = cloneDeep(data)
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

export function collectPersist(): Persist {
  const coreStore = useCoreStore()
  const outputData: Persist = {
    metadata: [...coreStore.metadata].reduce(
      (obj, { key, values }) => ((obj[key] = [...values]), obj),
      {} as Record<MetadataKey, string[]>,
    ),
    lyricLines: cloneDeep(coreStore.lyricLines),
  }
  return outputData
}
