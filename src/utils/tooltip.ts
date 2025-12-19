import { usePrefStore } from '@states/stores'
import { hotkeyToString, type HotKey as HK } from '@core/hotkey'
import { escape } from 'lodash-es'

function getHotkeyStr(hotkeyCmd: HK.Command) {
  const prefStore = usePrefStore()
  const hotkey = prefStore.hotkeyMap[hotkeyCmd][0]
  if (!hotkey) return undefined
  const hotkeyStr = hotkeyToString(hotkey, prefStore.isMac)
  return hotkeyStr
}

export function tipHotkey(label: string | undefined, hotkeyCmd: HK.Command) {
  const hotkeyStr = getHotkeyStr(hotkeyCmd)
  if (!hotkeyStr) return label
  return {
    content: /* html */ `${label ?? ''} <span class="tooltip-hotkey">${escape(hotkeyStr)}</span>`,
    html: true,
  }
}

export function tipDesc(label: string, desc: string, hotkeyCmd?: HK.Command) {
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
