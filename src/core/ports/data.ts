import { parseLRC } from './formats/lrc'
import { parseLRCa2 } from './formats/lrca2'
import { parseQRC } from './formats/qrc'
import { parseSPL } from './formats/spl'
import { parseYRC } from './formats/yrc'
import type { Port as PT } from './types'

export const portFormatRegister: PT.Format[] = [
  {
    name: '基本 LRC',
    description:
      '最常见的歌词格式。支持以行时间戳，不支持逐字时间戳。此处指基本 LRC 格式，若导入基于 LRC 的扩展格式，请选择对应扩展格式选项。',
    accept: '.lrc',
    example:
      `[02:01.079]Get in the line, to dream alive\n` +
      `[02:03.552]In our souls, do we know?\n` +
      `[02:06.103][02:08.916][02:11.135]On the journey`,
    reference: [{ name: '维基百科', url: 'https://en.wikipedia.org/wiki/LRC_(file_format)' }],
    parser: parseLRC,
  },
  {
    name: 'LRC A2 扩展',
    description: '基于 LRC 的扩展格式，支持行时间戳和逐字时间戳，最早由 A2 Media Player 提出。',
    accept: '.lrc',
    example:
      `[02:38.850]<02:38.850>Words <02:39.030>are <02:39.120>made <02:39.360>of <02:39.420>plastic<02:40.080>\n` +
      `[02:40.080]<02:40.080>Come <02:40.290>back <02:40.470>like <02:40.680>elastic<02:41.370>`,
    reference: [{ name: '维基百科', url: 'https://en.wikipedia.org/wiki/LRC_(file_format)' }],
    parser: parseLRCa2,
  },
  {
    name: '网易云逐字',
    description: '网易云音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    accept: '.yrc',
    example:
      `[190871,1984](190871,361,0)For(0,0,0) (191232,172,0)the(0,0,0) (191404,376,0)first(0,0,0) (191780,1075,0)time\n` +
      `[193459,4198](193459,412,0)What's(0,0,0) (193871,574,0)past(0,0,0) (194445,506,0)is(0,0,0) (194951,2706,0)past`,
    parser: parseYRC,
  },
  {
    name: 'QQ 音乐逐字',
    description: 'QQ 音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    accept: '.qrc',
    example:
      `[190871,1984]For(190871,361) (0,0)the(191232,172) (0,0)first(191404,376) (0,0)time(191780,1075)\n` +
      `[193459,4198]What's(193459,412) (0,0)past(193871,574) (0,0)is(194445,506) (0,0)past(194951,2706)`,
    parser: parseQRC,
  },
  {
    name: '椒盐音乐逐字',
    description:
      '椒盐音乐的私有格式，基于 LRC 扩展，支持行时间戳和逐字时间戳，并支持翻译。由于规则繁杂，可能不完全可用。',
    accept: '.spl,.lrc',
    example:
      `[02:38.850]<02:38.850>Words <02:39.030>are <02:39.120>made <02:39.360>of <02:39.420>plastic[02:40.080]\n` +
      `[02:40.080]<02:40.080>Come <02:40.290>back <02:40.470>like <02:40.680>elastic[02:41.370]`,
    reference: [{ name: '椒盐官方文档', url: 'https://moriafly.com/standards/spl.html' }],
    parser: parseSPL,
  },
]
