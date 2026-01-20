import type { LyricLine } from '@core/types'

import { useRuntimeStore } from '@states/stores'

import type { PickTypeKeys } from '@utils/types'

export function toogleAttr(attr: PickTypeKeys<LyricLine, boolean>) {
  const runtimeStore = useRuntimeStore()
  if (runtimeStore.selectedLines.size === 0) return
  if ([...runtimeStore.selectedLines].some((line) => !line[attr]))
    runtimeStore.selectedLines.forEach((line) => (line[attr] = true))
  else runtimeStore.selectedLines.forEach((line) => (line[attr] = false))
}
