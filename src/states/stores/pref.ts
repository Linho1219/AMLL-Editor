import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import { getDefaultHotkeyMap } from '@core/hotkey'

export const usePrefStore = defineStore('preference', () => {
  const globalLatency = ref(0)
  const hltLineTimeConflicts = ref(false)
  const hltWordTimeConflicts = ref(false)
  const scrollWithPlayback = ref(false)
  const swapTranslateRoman = ref(false)
  const alwaysIgnoreBackground = ref(false)
  const sidebarWidth = ref(360)
  const hotkeyMap = reactive(getDefaultHotkeyMap())
  const isMac = ref(isAppleDevice())
  const packAudioToProject = ref(true)

  return {
    globalLatency,
    hltLineTimeConflicts,
    swapTranslateRoman,
    alwaysIgnoreBackground,
    hltWordTimeConflicts,
    scrollWithPlayback,
    sidebarWidth,
    hotkeyMap,
    isMac,
    packAudioToProject,
  }
})

function isAppleDevice() {
  const ua = navigator.userAgent
  // Chrome-based browsers
  if (navigator.userAgentData?.platform) {
    return (
      navigator.userAgentData.platform === 'macOS' || navigator.userAgentData.platform === 'iOS'
    )
  }
  // Safari fallback
  if (ua.includes('Macintosh')) return true
  if (/iPhone|iPad|iPod/.test(ua)) return true

  // navigator.plaform is deprecated, only for fallback
  if (navigator.platform.toLowerCase().includes('mac')) return true

  return false
}
