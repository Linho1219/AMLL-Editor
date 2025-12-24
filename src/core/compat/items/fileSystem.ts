import type { Compatibility as CP } from '..'

const fileSystemInfo: CP.CompatibilityInfo = {
  key: 'fileSystem',
  name: '文件系统 API',
  description:
    '文件系统 API 提供接近原生的文件操作能力。例如保存时直接写入用户选定的文件，而不是下载一个新文件。',
  severity: 'warning',
  referenceUrls: [
    { label: 'Can I Use: showOpenFilePicker', url: 'https://caniuse.com/mdn-api_window_showopenfilepicker' },
  ],
}

const meet =
  window.isSecureContext && 'showOpenFilePicker' in window && 'showSaveFilePicker' in window

function findWhy(): string | undefined {
  if (meet) return undefined
  if (!window.isSecureContext) return '浏览器未在安全上下文下运行。'
  return '浏览器不支持文件系统相关的 API。此 API 在 Chromium 86 及以上版本中支持，Firefox 和 Safari 暂不支持。'
}
const why = findWhy()

export const fileSystemItem: CP.CompatibilityItem = {
  ...fileSystemInfo,
  meet,
  why,
}
