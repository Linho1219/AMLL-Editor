import type { HotKey as HK } from './types'

const Shift = Symbol('Shift')
const Ctrl = Symbol('Ctrl')
const Alt = Symbol('Alt')

export const hotkeyCommandList = [
  'open',
  'save',
  'saveAs',

  'new',
  'exportToClipboard',
  'importFromClipboard',

  'switchToContent',
  'switchToTiming',
  'switchToPreview',

  'preferences',
  'batchSplitText',
  'metadata',

  'batchTimeShift',
  'undo',
  'redo',
  'bookmark',
  'find',
  'replace',
  'delete',
  'selectAllLines',
  'selectAllSyls',
  'breakLine',
  'duet',
  'background',

  'goPrevLine',
  'goPrevSyl',
  'goPrevSylnPlay',
  'goNextLine',
  'goNextSyl',
  'goNextSylnPlay',
  'playCurrSyl',
  'markBegin',
  'markEndBegin',
  'markEnd',

  'chooseMedia',
  'seekBackward',
  'volumeUp',
  'playPauseAudio',
  'seekForward',
  'volumeDown',
] as const

export const hotkeyInputBlockList: HK.Key[] = [
  k(Ctrl, 'z'),
  k(Ctrl, Shift, 'z'),
  k(Ctrl, 'y'),
  k(Ctrl, 'a'),
]

export const getDefaultHotkeyMap = () =>
  formatMap({
    switchToContent: k(Shift, '1'),
    switchToTiming: k(Shift, '2'),
    switchToPreview: k(Shift, '3'),
    goPrevLine: k('w'),
    goNextLine: k('s'),
    goPrevSyl: k('a'),
    goNextSyl: k('d'),
    batchSplitText: k(Ctrl, 'Backquote'),
    goPrevSylnPlay: k('r'),
    playCurrSyl: k('t'),
    goNextSylnPlay: k('y'),
    markBegin: k('f'),
    markEndBegin: k('g'),
    markEnd: k('h'),
    playPauseAudio: k('Space'),
    seekBackward: k('ArrowLeft'),
    seekForward: k('ArrowRight'),
    volumeUp: k('ArrowUp'),
    volumeDown: k('ArrowDown'),
    undo: k(Ctrl, 'z'),
    redo: [k(Ctrl, 'y'), k(Ctrl, Shift, 'z')],
    find: k(Ctrl, 'f'),
    replace: [k(Ctrl, 'h'), k(Ctrl, Shift, 'f')],
    delete: k('Delete'),
    bookmark: k(Ctrl, 'd'),
    preferences: k(Ctrl, 'Comma'),
    chooseMedia: k(Ctrl, 'm'),
    metadata: k(Ctrl, 'i'),
    open: k(Ctrl, 'o'),
    batchTimeShift: k(Ctrl, Alt, 't'),
    save: k(Ctrl, 's'),
    saveAs: k(Ctrl, Shift, 's'),
    new: k(Ctrl, Alt, 'n'),
    exportToClipboard: k(Ctrl, Alt, 'c'),
    importFromClipboard: k(Ctrl, Alt, 'v'),
    selectAllLines: k(Ctrl, 'a'),
    selectAllSyls: k(Alt, 'a'),
    breakLine: k('Enter'),
    duet: k(Ctrl, 'u'),
    background: k(Ctrl, 'b'),
  })

//#region Helpers
/** Generate hotkey object */
function k(...args: (symbol | string)[]) {
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
function formatMap(map: Record<HK.Command, HK.Key | HK.Key[]>): HK.Map {
  const res: HK.Map = {} as HK.Map
  for (const cmd in map) {
    const val = map[cmd as HK.Command]
    res[cmd as HK.Command] = Array.isArray(val) ? val : [val]
  }
  return res
}
//#endregion
