import { editHistory } from '@states/services/history'
import { useStaticStore } from '@states/stores'

const staticStore = useStaticStore()

export async function checkDataDropConfirm() {
  if (!editHistory.isDirty.value) return true
  if (staticStore.waitForDataDropConfirmHook) return await staticStore.waitForDataDropConfirmHook()
  return true
}
