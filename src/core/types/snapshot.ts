import type { LyricLine, Metadata } from './core'
import type { View } from './runtime'

export interface RuntimeSnapShot {
  currentView: View
  selectedLineIds: string[]
  selectedWordIds: string[]
  lastTouchedLineId: string | undefined
  lastTouchedWordId: string | undefined
}

export interface Snapshot {
  timestamp: number
  core: {
    metadata: Metadata
    lyricLines: LyricLine[]
  }
  firstRuntime: RuntimeSnapShot
  lastRuntime?: RuntimeSnapShot
}
