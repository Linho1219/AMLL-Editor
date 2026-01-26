import { type HotKey, getDefaultHotkeyMap } from '@core/hotkey'

import { isAppleDevice } from '@utils/detectAppleDevice'

export interface PreferenceSchema {
  // Data
  maxUndoSteps: number
  autoSaveEnabled: boolean
  autoSaveIntervalMinutes: number
  packAudioToProject: boolean
  ttmlAsDefault: boolean
  // Shortcuts
  macStyleShortcuts: boolean
  hotkeyMap: HotKey.Map
  audioSeekingStepMs: number
  // Timing
  globalLatencyMs: number
  alwaysIgnoreBackground: boolean
  hideLineTiming: boolean
  // autoConnectLineTimes: boolean
  // autoConnectThresholdMs: number
  // Roman
  sylRomanEnabled: boolean
  swapTranslateRoman: boolean
  hideTranslateRoman: boolean
  // Misc
  notifyCompatIssuesOnStartup: boolean
  sidebarWidth: number
  scrollWithPlayback: boolean
}

export const getDefaultPref = (): PreferenceSchema => ({
  maxUndoSteps: 100,
  autoSaveEnabled: true,
  autoSaveIntervalMinutes: 3,
  packAudioToProject: true,
  ttmlAsDefault: false,
  macStyleShortcuts: isAppleDevice(),
  hotkeyMap: getDefaultHotkeyMap(),
  audioSeekingStepMs: 5000,
  globalLatencyMs: 0,
  alwaysIgnoreBackground: false,
  hideLineTiming: false,
  // autoConnectLineTimes: false,
  // autoConnectThresholdMs: 100,
  sylRomanEnabled: false,
  swapTranslateRoman: false,
  hideTranslateRoman: false,
  notifyCompatIssuesOnStartup: true,
  sidebarWidth: 360,
  scrollWithPlayback: false,
})
