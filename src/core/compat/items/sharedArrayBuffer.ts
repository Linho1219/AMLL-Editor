import type { Compatibility as CP } from '..'

const sharedArrayBufferInfo = {
  key: 'sharedArrayBuffer',
  name: '共享内存缓冲区',
  description: '共享内存缓冲区 (Shared Array Buffer) 允许在多个线程间高效共享数据。',
  referenceUrls: [
    { label: 'Can I Use: Shared Array Buffer', url: 'https://caniuse.com/sharedarraybuffer' },
  ],
  severity: 'warn',
  effect: '频谱图功能不可用。',
} as const satisfies CP.CompatibilityInfo

const meet =
  window.isSecureContext && window.crossOriginIsolated && typeof SharedArrayBuffer === 'function'

function findWhy(): string | undefined {
  if (meet) return undefined
  if (!window.isSecureContext) return '未在安全上下文中运行。需要 HTTPS 或从本地回环访问。'
  if (!window.crossOriginIsolated) {
    if (import.meta.env.VITE_COI_WORKAROUND)
      return '未启用跨源隔离 (COOP/COEP)。此部署已尝试通过 Service Worker 启用跨源隔离。若未生效，请尝试刷新页面。'
    else
      return '未启用跨源隔离 (COOP/COEP)。请联系部署方提供对应的 HTTP 响应头，或调整构建选项以启用 Service Worker 方式实现的跨源隔离。'
  }
  return '浏览器不支持 SharedArrayBuffer。此 API 在 Chromium 68、Firefox 79、Safari 15.2 或以上版本中支持。'
}
const why = findWhy()

export const sharedArrayBufferItem = {
  ...sharedArrayBufferInfo,
  meet,
  why,
} as const satisfies CP.CompatibilityItem
