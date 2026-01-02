import { editHistory } from '@states/services/history'
import { useStaticStore } from '@states/stores'

const staticStore = useStaticStore()

export async function checkDataDropConfirm() {
  if (!editHistory.isDirty.value) return true
  if (staticStore.waitForConfirmHook)
    return await staticStore.waitForConfirmHook({
      header: '您有未保存的工作',
      message: '如果继续，所有未保存的更改将会丢失。此操作不可撤销。',
      icon: 'pi pi-exclamation-triangle',
      severity: 'danger',
      acceptLabel: '继续',
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
