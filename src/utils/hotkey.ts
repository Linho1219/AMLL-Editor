import mitt from 'mitt'
import { onUnmounted } from 'vue'
const globalKeyboardEmit = mitt<{ [K in HotkeyCmd]: undefined }>()
export function useGlobalKeyboard(command: HotkeyCmd, handler: () => void) {
  globalKeyboardEmit.on(command, handler)
  onUnmounted(() => {
    globalKeyboardEmit.off(command, handler)
  })
}
export function emitGlobalKeyboard(command: HotkeyCmd) {
  globalKeyboardEmit.emit(command)
}

export type HotkeyCmd =
  | 'switchToContent'
  | 'switchToTiming'
  | 'switchToPreview'
  | 'goPrevLine'
  | 'goNextLine'
  | 'goPrevWord'
  | 'goNextWord'
  | 'goPrevWordnPlay'
  | 'playCurrWord'
  | 'goNextWordnPlay'
  | 'markBegin'
  | 'markEndBegin'
  | 'markEnd'
  | 'playPauseAudio'
  | 'seekBackward'
  | 'seekForward'
  | 'volumeUp'
  | 'volumeDown'
  | 'undo'
  | 'redo'
  | 'find'
  | 'replace'
  | 'delete'
  | 'backspace'
  | 'bookmark'
  | 'preferences'
  | 'batchSplitText'
  | 'metadata'
  | 'chooseMedia'
  | 'open'
  | 'batchTimeShift'

export interface HotKey {
  code: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

const Shift = Symbol('Shift')
const Ctrl = Symbol('Ctrl')
const Alt = Symbol('Alt')
function hkey(...args: (symbol | string)[]) {
  let ctrl = false,
    alt = false,
    shift = false,
    code = ''
  for (const arg of args) {
    if (arg === Ctrl) ctrl = true
    else if (arg === Alt) alt = true
    else if (arg === Shift) shift = true
    else if (typeof arg === 'string') {
      if (arg.match(/^[a-zA-Z]$/)) code = 'Key' + arg.toUpperCase()
      else if (arg.match(/^[0-9]$/)) code = 'Digit' + arg
      else code = arg
    }
  }
  return { code, ctrl, alt, shift }
}

const inputBlockList = [hkey(Ctrl, 'z'), hkey(Ctrl, Shift, 'z'), hkey(Ctrl, 'y'), hkey(Ctrl, 'a')]
export const shouldEscapeInInput = (hotKey: HotKey) => {
  if (!hotKey.ctrl && !hotKey.alt) return true
  if (inputBlockList.some((hk) => isHotkeyMatch(hk, hotKey))) return true
  return false
}

export const getDefaultHotkeyMap = (): HotkeyMap => ({
  switchToContent: [hkey(Shift, '1')],
  switchToTiming: [hkey(Shift, '2')],
  switchToPreview: [hkey(Shift, '3')],
  goPrevLine: [hkey('w')],
  goNextLine: [hkey('s')],
  goPrevWord: [hkey('a')],
  goNextWord: [hkey('d')],
  batchSplitText: [hkey(Ctrl, 'Backquote')],
  goPrevWordnPlay: [hkey('r')],
  playCurrWord: [hkey('t')],
  goNextWordnPlay: [hkey('y')],
  markBegin: [hkey('f')],
  markEndBegin: [hkey('g')],
  markEnd: [hkey('h')],
  playPauseAudio: [hkey('Space')],
  seekBackward: [hkey('ArrowLeft')],
  seekForward: [hkey('ArrowRight')],
  volumeUp: [hkey('ArrowUp')],
  volumeDown: [hkey('ArrowDown')],
  undo: [hkey(Ctrl, 'z')],
  redo: [hkey(Ctrl, 'y'), hkey(Ctrl, Shift, 'z')],
  find: [hkey(Ctrl, 'f')],
  replace: [hkey(Ctrl, 'h'), hkey(Ctrl, Shift, 'f')],
  delete: [hkey('Delete')],
  backspace: [hkey('Backspace')],
  bookmark: [hkey(Ctrl, 'd')],
  preferences: [hkey(Ctrl, ',')],
  chooseMedia: [hkey(Ctrl, 'm')],
  metadata: [hkey(Ctrl, 'i')],
  open: [hkey(Ctrl, 'o')],
  batchTimeShift: [hkey(Ctrl, Alt, 't')],
})

export function isHotkeyMatch(a: HotKey, b: HotKey) {
  return a.code === b.code && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift
}

export type HotkeyMap = Record<HotkeyCmd, HotKey[]>

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
export function parseKeyEvent(e: KeyboardEvent): HotKey | null {
  if (keyBlockList.has(e.key)) return null
  return {
    code: e.code,
    ctrl: e.ctrlKey || e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
  }
}

export function matchHotkeyInMap(hotkey: HotKey, hotkeyMap: HotkeyMap): HotkeyCmd | undefined {
  for (const cmd in hotkeyMap) {
    const hotkeys = hotkeyMap[cmd as HotkeyCmd]
    if (hotkeys.some((hk) => isHotkeyMatch(hk, hotkey))) return cmd as HotkeyCmd
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
}
export function hotkeyToString(hotkey: HotKey, isMac: boolean = false) {
  const parts: string[] = []
  if (hotkey.ctrl) parts.push(isMac ? '⌘' : 'Ctrl')
  if (hotkey.alt) parts.push(isMac ? '⌥' : 'Alt')
  if (hotkey.shift) parts.push(isMac ? '⇧' : 'Shift')
  const key = (keyRewrites[hotkey.code] ?? hotkey.code).replace(/^Key/, '').replace(/^Digit/, '')
  parts.push(key)
  return parts.join(isMac ? '' : '+')
}
