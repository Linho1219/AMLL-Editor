import { t } from '@i18n'

import { editHistory } from '@states/services/history'
import { useStaticStore } from '@states/stores'

const staticStore = useStaticStore()
const tDrop = t.file.dataDropConfirm

export async function checkDataDropConfirm() {
  if (!editHistory.isDirty.value) return true
  if (staticStore.waitForConfirmHook)
    return await staticStore.waitForConfirmHook({
      header: tDrop.header(),
      message: tDrop.message(),
      icon: 'pi pi-exclamation-triangle',
      severity: 'danger',
      acceptLabel: tDrop.acceptLabel(),
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
