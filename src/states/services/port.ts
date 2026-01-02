import { cloneDeep } from 'lodash-es'
import { reactive, toRaw } from 'vue'

import type { LyricLine, Persist } from '@core/types'

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
  if (prefStore.autoConnectLineTimes) connectLineTimes(lines, prefStore.autoConnectThresholdMs)
  const outputData: Persist = { metadata, lines }
  return outputData
}

function connectLineTimes(lines: LyricLine[], thresMs: number) {
  function classifyLines(lines: LyricLine[]) {
    type Groups = [normal: LyricLine[], duet: LyricLine[], bg: LyricLine[], duetBg: LyricLine[]]
    const groups: Groups = [[], [], [], []]
    const classifier = (line: LyricLine): 0 | 1 | 2 | 3 => {
      if (line.duet && line.background) return 3
      if (line.duet) return 1
      if (line.background) return 2
      return 0
    }
    lines.forEach((l) => groups[classifier(l)].push(l))
    return groups
  }
  function connectLines(lines: LyricLine[]) {
    for (const [prev, curr] of pairwise(lines))
      if (curr.startTime - prev.endTime <= thresMs) prev.endTime = curr.startTime
  }
  classifyLines(lines).forEach((group) => connectLines(group))
}
