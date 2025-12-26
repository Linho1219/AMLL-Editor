import { cloneDeep } from 'lodash-es'

import type { MetadataKey, Persist } from '@core/types'

import { useCoreStore, useRuntimeStore } from '@states/stores'

import { editHistory } from './history'

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
  coreStore.lyricLines.splice(0, coreStore.lyricLines.length, ...data.lines)
  editHistory.init()
}

export function collectPersist(): Persist {
  const coreStore = useCoreStore()
  const outputData: Persist = {
    metadata: [...coreStore.metadata].reduce(
      (obj, { key, values }) => ((obj[key] = [...values]), obj),
      {} as Record<MetadataKey, string[]>,
    ),
    lines: cloneDeep(coreStore.lyricLines),
  }
  return outputData
}
