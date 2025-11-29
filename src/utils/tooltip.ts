import { usePreferenceStore } from '@/stores/preference'
import { hotkeyToString, type HotkeyCmd } from './hotkey'
import { escape } from 'lodash-es'

function getHotkeyStr(hotkeyCmd: HotkeyCmd) {
  const preferenceStore = usePreferenceStore()
  const hotkey = preferenceStore.hotkeyMap[hotkeyCmd][0]
  if (!hotkey) return undefined
  const hotkeyStr = hotkeyToString(hotkey, preferenceStore.isMac)
  return hotkeyStr
}

export function tipHotkey(label: string | undefined, hotkeyCmd: HotkeyCmd) {
  const hotkeyStr = getHotkeyStr(hotkeyCmd)
  if (!hotkeyStr) return label
  return {
    content: /* html */ `${label ?? ''} <span class="tooltip-hotkey">${escape(hotkeyStr)}</span>`,
    html: true,
  }
}

export function tipDesc(label: string, desc: string, hotkeyCmd?: HotkeyCmd) {
  const hotkeyStr = hotkeyCmd ? getHotkeyStr(hotkeyCmd) : ''
  return {
    content: /* html */ `
      <div class="tooltip-headline">
        <div class="tooltip-title">${escape(label)}</div>
        <span class="tooltip-hotkey">${escape(hotkeyStr)}</span>
      </div>
      <div class="tooltip-desc">${escape(desc)}</div>
    `,
    html: true,
    placement: 'bottom',
  }
}

export function tipMultiLine(...lines: string[]) {
  return {
    content: lines.map(escape).join(/* html */ `<br>`),
    html: true,
  }
}
