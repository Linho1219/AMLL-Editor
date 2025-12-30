import type { Compatibility as CP } from '..'

const clipboardInfo = {
  key: 'clipboard',
  name: '剪贴板 API',
  description:
    '剪贴板 API 允许网页读写系统剪贴板的内容。从剪贴板导入 TTML、导出 TTML 到剪贴板功能依赖此 API。',
  severity: 'warning',
  referenceUrls: [
    { label: 'Can I Use: async-clipboard', url: 'https://caniuse.com/async-clipboard' },
  ],
} as const satisfies CP.CompatibilityInfo

const meet =
  window.isSecureContext &&
  'clipboard' in navigator &&
  'readText' in navigator.clipboard &&
  'writeText' in navigator.clipboard

function findWhy(): string | undefined {
  if (meet) return undefined
  if (!window.isSecureContext) return '浏览器未在安全上下文下运行。'
  return '浏览器不支持剪贴板相关的 API。此 API 在 Chromium 66 或 Firefox 125 及以上版本中支持。'
}
const why = findWhy()

export const clipboardItem = {
  ...clipboardInfo,
  meet,
  why,
} as const satisfies CP.CompatibilityItem
