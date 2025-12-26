import { toRaw } from 'vue'

import { audioEngine } from '@core/audio'
import type { Persist } from '@core/types'

import { applyPersist, collectPersist } from '@states/services/port'
import { usePrefStore, useStaticStore } from '@states/stores'

export { makeProjectFile } from './make'
export { parseProjectFile } from './parse'

export interface ProjPayload {
  persist: Persist
  createdAt?: Date
  audioFile?: File
}

export function collectProjectData(createdAt?: Date): ProjPayload {
  const staticStore = useStaticStore()
  const prefStore = usePrefStore()
  const data = collectPersist()
  const audioFile: File | null = toRaw(audioEngine.rawFileComputed.value)
  const payload: ProjPayload = { persist: data, createdAt }
  if (audioFile && prefStore.packAudioToProject) {
    payload.audioFile = audioFile
  }
  return payload
}

export function mountProjectData(payload: ProjPayload) {
  applyPersist(payload.persist)
  if (payload.audioFile) audioEngine.mount(payload.audioFile)
}
