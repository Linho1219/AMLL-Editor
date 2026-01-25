import { t } from '@i18n'

import { editHistory } from '@states/services/history'
import { useStaticStore } from '@states/stores'

import type { FileBackendPickerAccept } from './types'

const staticStore = useStaticStore()
const tt = t.file.dataDropConfirm

export async function checkDataDropConfirm() {
  if (!editHistory.isDirty.value) return true
  if (staticStore.waitForConfirmHook)
    return await staticStore.waitForConfirmHook({
      header: tt.header(),
      message: tt.message(),
      icon: 'pi pi-exclamation-triangle',
      severity: 'danger',
      acceptLabel: tt.acceptLabel(),
      acceptIcon: 'pi pi-arrow-right',
    })
  return true
}

export function breakExtension(filename: string): [name: string, extension: string] {
  const lastDotIndex = filename.lastIndexOf('.')
  const name = filename.slice(0, lastDotIndex)
  const extension = filename.slice(lastDotIndex + 1).toLowerCase()
  return [name, extension]
}

export const extractMIMEs = (...types: FileBackendPickerAccept[]): string[] =>
  types.flatMap(({ accept }) =>
    !accept ? [] : [...Object.entries(accept)].map(([mime, dotExts]) => [mime, ...dotExts]).flat(),
  )
export const extractDotExts = (...types: FileBackendPickerAccept[]): string[] =>
  extractMIMEs(...types).filter((s) => s.startsWith('.'))
