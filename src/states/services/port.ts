import { cloneDeep } from 'lodash-es'
import { reactive, toRaw } from 'vue'

import type { Persist } from '@core/types'

import { useCoreStore, usePrefStore, useRuntimeStore } from '@states/stores'

import { alignLineTime } from '@utils/alignLineSylTime'
import { pairwise } from '@utils/pairwise'

import { editHistory } from './history'

export function applyPersist(data: Persist) {
  data = cloneDeep(data)
  editHistory.shutdown()
  const coreStore = useCoreStore()
  const runtimeStore = useRuntimeStore()
  runtimeStore.clearSelection()
  coreStore.metadata = reactive(data.metadata)
  coreStore.lyricLines.splice(0, coreStore.lyricLines.length, ...data.lines)
  editHistory.init()
}

export function collectPersist(): Persist {
  const coreStore = useCoreStore()
  const prefStore = usePrefStore()
  const lines = cloneDeep(toRaw(coreStore.lyricLines))
  const metadata = cloneDeep(toRaw(coreStore.metadata))
  if (prefStore.hideLineTiming) lines.forEach((line) => alignLineTime(line))
  // if (prefStore.autoConnectLineTimes) connectLineTimes(lines, prefStore.autoConnectThresholdMs)
  for (const [prev, next] of pairwise(lines)) if (prev.connectNext) prev.endTime = next.startTime
  const outputData: Persist = { metadata, lines }
  return outputData
}
