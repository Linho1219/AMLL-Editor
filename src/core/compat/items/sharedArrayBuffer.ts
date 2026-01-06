import { t } from '@i18n'

import type { Compatibility as CP } from '..'

const tSAB = t.compat.sharedArrayBuffer

const sharedArrayBufferInfo = {
  key: 'sharedArrayBuffer',
  name: tSAB.name(),
  description: tSAB.description(),
  referenceUrls: [
    { label: 'Can I Use: Shared Array Buffer', url: 'https://caniuse.com/sharedarraybuffer' },
  ],
  severity: 'warn',
  effect: tSAB.effect(),
} as const satisfies CP.CompatibilityInfo

const meet =
  window.isSecureContext && window.crossOriginIsolated && typeof SharedArrayBuffer === 'function'

function findWhy(): string | undefined {
  if (meet) return undefined
  if (!window.isSecureContext) return t.compat.sharedReasons.insecureContext()
  if (!window.crossOriginIsolated) {
    if (import.meta.env.VITE_COI_WORKAROUND) return tSAB.coiWorkaround()
    else return tSAB.coiRequired()
  }
  return tSAB.apiNotSupported()
}
const why = findWhy()

export const sharedArrayBufferItem = {
  ...sharedArrayBufferInfo,
  meet,
  why,
} as const satisfies CP.CompatibilityItem
