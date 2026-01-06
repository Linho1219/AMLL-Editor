import { t } from '@i18n'

import type { Compatibility as CP } from '..'

const tFs = t.compat.fileSystem

const fileSystemInfo = {
  key: 'fileSystem',
  name: tFs.name(),
  description: tFs.description(),
  referenceUrls: [
    {
      label: 'Can I Use: showOpenFilePicker',
      url: 'https://caniuse.com/mdn-api_window_showopenfilepicker',
    },
  ],
  severity: 'warn',
  effect: tFs.effect(),
} as const satisfies CP.CompatibilityInfo

const meet =
  window.isSecureContext &&
  typeof showOpenFilePicker === 'function' &&
  typeof showSaveFilePicker === 'function' &&
  typeof FileSystemHandle === 'function'

function findWhy(): string | undefined {
  if (meet) return undefined
  if (!window.isSecureContext) return t.compat.sharedReasons.insecureContext()
  return tFs.apiNotSupported()
}
const why = findWhy()

export const fileSystemItem = {
  ...fileSystemInfo,
  meet,
  why,
} as const satisfies CP.CompatibilityItem
