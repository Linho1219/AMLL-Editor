import type { Component } from 'vue'

import type { ValueOf } from '@utils/types'

import BatchTimeShiftDialog from './dialogComponents/BatchTimeShiftDialog.vue'
import FindReplaceDialog from './dialogComponents/FindReplaceDialog.vue'
import FromOtherFormatModal from './dialogComponents/FromOtherFormatModal.vue'
import FromTextModal from './dialogComponents/FromTextModal.vue'

export const DialogKey = {
  BatchTimeShift: 'batchTimeShift',
  FindReplace: 'findReplace',
  FromOtherFormat: 'fromOtherFormat',
  FromText: 'fromText',
} as const
export type DialogKey = ValueOf<typeof DialogKey>

interface DialogReg {
  key: DialogKey
  component: Component
}

export const dialogRegs: DialogReg[] = [
  { key: DialogKey.BatchTimeShift, component: BatchTimeShiftDialog },
  { key: DialogKey.FindReplace, component: FindReplaceDialog },
  { key: DialogKey.FromOtherFormat, component: FromOtherFormatModal },
  { key: DialogKey.FromText, component: FromTextModal },
]
