import type { Equal, Expect } from '@utils/types'

import type { ProjManifest_0_0 } from './0_0'

export type { ProjManifest_0_0 } from './0_0'

export const supportedProjManifestVersions = ['ALPv0.0'] as const
export type SupportedProjManifest = ProjManifest_0_0

export const latestProjManifestVersion = 'ALPv0.0'
export type LatestProjManifest = ProjManifest_0_0

export type SupportedProjManifestFileVersion = (typeof supportedProjManifestVersions)[number]

type _SupportChecker = Expect<
  Equal<SupportedProjManifest['fileVersion'], SupportedProjManifestFileVersion>
>
type _LatestChecker = Expect<
  Equal<LatestProjManifest['fileVersion'], typeof latestProjManifestVersion>
>
