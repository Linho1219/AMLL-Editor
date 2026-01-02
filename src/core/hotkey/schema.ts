import type { HotKey as HK } from './types'

const Shift = Symbol('Shift')
const Ctrl = Symbol('Ctrl')
const Alt = Symbol('Alt')

export const hotkeyCommandNames = {
  open: '打开',
  save: '保存',
  saveAs: '另存为',

  new: '新建空项目',
  exportToClipboard: '导出到剪贴板',
  importFromClipboard: '从剪贴板导入',

  switchToContent: '切换到内容视图',
  switchToTiming: '切换到时轴视图',
  switchToPreview: '切换到预览视图',

  preferences: '偏好设置',
  batchSplitText: '批量断字',
  metadata: '元数据',

  batchTimeShift: '批量时移',
  undo: '撤销',
  redo: '重做',
  bookmark: '书签',
  find: '查找',
  replace: '替换',
  delete: '删除',
  selectAllLines: '全选所有行',
  selectAllSyls: '全选所有音节',
  breakLine: '拆分行',

  goPrevLine: '上一行',
  goPrevSyl: '上一音节',
  goPrevSylnPlay: '上一音节并播放',
  goNextLine: '下一行',
  goNextSyl: '下一音节',
  goNextSylnPlay: '下一音节并播放',
  playCurrSyl: '播放当前音节',
  markBegin: '标记开始时间',
  markEndBegin: '标记连缀时间',
  markEnd: '标记结束时间',

  chooseMedia: '选择媒体',
  seekBackward: '快退',
  volumeUp: '增大音量',
  playPauseAudio: '播放/暂停音频',
  seekForward: '快进',
  volumeDown: '减小音量',
} as const
export const hotkeyCommandList = Object.keys(hotkeyCommandNames) as HK.Command[]

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
