import type { Equal, Expect } from '@utils/types'

import type { ProjData_0_0 } from './0_0'
import { type ProjData_0_1, migrateTo_0_1 } from './0_1'

export type { ProjData_0_0 } from './0_0'
export type { ProjData_0_1 } from './0_1'

export const supportedProjDataVersions = ['ALDv0.0', 'ALDv0.1'] as const
export type SupportedProjData = ProjData_0_0 | ProjData_0_1
type _SupportChecker = Expect<Equal<SupportedProjData['dataVersion'], SupportedProjDataFileVersion>>

export type LatestProjData = ProjData_0_1
export const migrateToLatestProjData: (data: SupportedProjData) => LatestProjData = migrateTo_0_1
export const latestProjDataVersion: LatestProjData['dataVersion'] = 'ALDv0.1'

export type SupportedProjDataFileVersion = (typeof supportedProjDataVersions)[number]
