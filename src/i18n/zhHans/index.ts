import type { BaseTranslation } from '../i18n-types.js'

const zhHans = {
  compat: {
    sharedReasons: {
      insecureContext: '未在安全上下文中运行。需要 HTTPS 或从本地回环访问。',
    },
    clipboard: {
      name: '剪贴板 API',
      description: '剪贴板 API (Clipboard API) 允许网页在用户授权后读写系统剪贴板的内容。',
      effect: '复制和粘贴 TTML 功能不可用。',
      apiNotSupported:
        '浏览器不支持剪贴板相关的 API。此 API 在 Chromium 66、Firefox 125、Safari 13.1 或以上版本中支持。',
    },
    fileSystem: {
      name: '文件系统 API',
      description:
        '文件系统 API (File System API) 允许网页在用户授权后读写磁盘上的文件，提供接近原生的文件操作能力。',
      effect: '保存文件时无法直接写入，而是通过浏览器下载；自动保存不可用。',
      apiNotSupported:
        '浏览器不支持文件系统相关的 API。此 API 在 Chromium 86 及以上版本中支持，Firefox 和 Safari 暂不支持。',
    },
    mediaSession: {
      name: '媒体会话 API',
      description: '媒体会话 (Media Session) 允许网页自定义媒体通知和响应媒体键事件。',
      effect: '将不能从系统媒体控制界面（如锁屏界面或通知中心）控制媒体播放。',
      apiNotSupported:
        '浏览器不支持媒体会话相关的 API。此 API 在 Chromium 72、Firefox 82、Safari 15 或以上版本中支持。Firefox Android 目前不支持。',
    },
    sharedArrayBuffer: {
      name: '共享内存缓冲区',
      description: '共享内存缓冲区 (Shared Array Buffer) 允许在多个线程间高效共享数据。',
      effect: '频谱图功能不可用。',
      apiNotSupported:
        '浏览器不支持 SharedArrayBuffer。此 API 在 Chromium 68、Firefox 79、Safari 15.2 或以上版本中支持。',
      coiRequired:
        '未启用跨源隔离 (COOP/COEP)。请联系部署方提供对应的 HTTP 响应头，或调整构建选项以启用 Service Worker 方式实现的跨源隔离。',
      coiWorkaround:
        '未启用跨源隔离 (COOP/COEP)。此部署已尝试通过 Service Worker 启用跨源隔离。若未生效，请尝试刷新页面。',
    },
  },
  formats: {
    alp: {
      name: 'AMLL Editor 工程文件',
      description: 'AMLL Editor 的项目文件格式，内嵌音频文件和歌词数据，适合项目保存和传输。',
    },
    ttml: {
      name: 'AMLL TTML',
      description: '基于 W3C TTML 标准的歌词格式，遵循 AMLL TTML 歌词格式规范。',
    },
    lrc: {
      name: '基本 LRC',
      description:
        '最常见的歌词格式。支持以行时间戳，不支持逐字时间戳。此处指基本 LRC 格式，若导入基于 LRC 的扩展格式，请选择对应扩展格式选项。',
    },
    lrcA2: {
      name: 'LRC A2 扩展',
      description: '基于 LRC 的扩展格式，支持行时间戳和逐字时间戳，最早由 A2 Media Player 提出。',
    },
    yrc: {
      name: '网易云逐字',
      description: '网易云音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    },
    qrc: {
      name: 'QQ 音乐逐字',
      description: 'QQ 音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    },
    spl: {
      name: '椒盐音乐逐字',
      description:
        '椒盐音乐的私有格式，基于 LRC 扩展，支持行时间戳和逐字时间戳，并支持翻译。由于规则繁杂，可能不完全可用。',
    },
    sharedReferences: {
      wikipedia: '维基百科',
      officialDoc: '官方文档',
    }
  },
} satisfies BaseTranslation

export default zhHans
