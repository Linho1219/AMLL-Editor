import type { Equal, Expect } from '@utils/types'

import { type ProjDataTill_0_2, type ProjData_0_2, migrateTo_0_2 } from './0_2'

export type { ProjData_0_0 } from './0_0'
export type { ProjData_0_1 } from './0_1'
export type { ProjData_0_2 } from './0_2'

export const supportedProjDataVersions = ['ALDv0.0', 'ALDv0.1', 'ALDv0.2'] as const
export type SupportedProjData = ProjDataTill_0_2
type _SupportChecker = Expect<Equal<SupportedProjData['dataVersion'], SupportedProjDataFileVersion>>

export type LatestProjData = ProjData_0_2
export const migrateToLatestProjData: (data: SupportedProjData) => LatestProjData = migrateTo_0_2
export const latestProjDataVersion: LatestProjData['dataVersion'] = 'ALDv0.2'

export type SupportedProjDataFileVersion = (typeof supportedProjDataVersions)[number]
