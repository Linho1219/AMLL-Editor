import type { HotKey as HK } from './types'
export type { HotKey } from './types'
export { getDefaultHotkeyMap } from './data'

import mitt from 'mitt'
import { onUnmounted } from 'vue'
import { hotkeyInputBlockList } from './data'
import { usePrefStore } from '@states/stores'

const globalKeyboardEmit = mitt<{ [K in HK.Command]: undefined }>()
export function useGlobalKeyboard(command: HK.Command, handler: () => void) {
  globalKeyboardEmit.on(command, handler)
  onUnmounted(() => {
    globalKeyboardEmit.off(command, handler)
  })
}
export function emitGlobalKeyboard(command: HK.Command) {
  globalKeyboardEmit.emit(command)
}

export const shouldEscapeInInput = (hotKey: HK.Key) => {
  if (!hotKey.ctrl && !hotKey.alt) return true
  if (hotkeyInputBlockList.some((hk) => isHotkeyMatch(hk, hotKey))) return true
  return false
}

export function isHotkeyMatch(a: HK.Key, b: HK.Key) {
  return a.code === b.code && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift
}

const keyBlockList = new Set([
  'Meta',
  'CapsLock',
  'Tab',
  'Control',
  'Shift',
  'Alt',
  'Meta',
  'Unidentified',
])
export function parseKeyEvent(e: KeyboardEvent): HK.Key | null {
  if (keyBlockList.has(e.key)) return null
  return {
    code: e.code,
    ctrl: e.ctrlKey || e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
  }
}

export function matchHotkeyInMap(hotkey: HK.Key, hotkeyMap: HK.Map): HK.Command | undefined {
  for (const cmd in hotkeyMap) {
    const hotkeys = hotkeyMap[cmd as HK.Command]
    if (hotkeys.some((hk) => isHotkeyMatch(hk, hotkey))) return cmd as HK.Command
  }
  return undefined
}

const keyRewrites: Record<string, string> = {
  Space: '空格',
  Escape: 'Esc',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Backquote: '`',
  Comma: ',',
  Period: '.',
}
export function hotkeyToString(hotkey: HK.Key, isMac: boolean = false) {
  const parts: string[] = []
  if (hotkey.ctrl) parts.push(isMac ? '⌘' : 'Ctrl')
  if (hotkey.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (hotkey.shift) parts.push(isMac ? '⇧' : 'Shift')
  const key = (keyRewrites[hotkey.code] ?? hotkey.code).replace(/^Key/, '').replace(/^Digit/, '')
  parts.push(key)
  return parts.join(isMac ? '' : '+')
}

export function getHotkeyStr(hotkeyCmd: HK.Command) {
  const prefStore = usePrefStore()
  const hotkey = prefStore.hotkeyMap[hotkeyCmd][0]
  if (!hotkey) return undefined
  const hotkeyStr = hotkeyToString(hotkey, prefStore.isMac)
  return hotkeyStr
}
