import { t } from '@i18n'

import type { Compatibility as CP } from '..'

const tMs = t.compat.mediaSession

const mediaSessionInfo = {
  key: 'mediaSession',
  name: tMs.name(),
  description: tMs.description(),
  referenceUrls: [
    { label: 'Can I Use: Media Session', url: 'https://caniuse.com/wf-media-session' },
  ],
  severity: 'info',
  effect: tMs.effect(),
} as const satisfies CP.CompatibilityInfo

const meet =
  'mediaSession' in navigator &&
  typeof navigator.mediaSession.metadata === 'object' &&
  typeof navigator.mediaSession.setActionHandler === 'function'

function findWhy(): string | undefined {
  if (meet) return undefined
  return tMs.apiNotSupported()
}
const why = findWhy()

export const mediaSessionItem = {
  ...mediaSessionInfo,
  meet,
  why,
} as const satisfies CP.CompatibilityItem
