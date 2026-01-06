import { t } from '@i18n'

import { lrcReg } from './formats/lrc'
import { lrcA2Reg } from './formats/lrca2'
import { qrcReg } from './formats/qrc'
import { splReg } from './formats/spl'
import { yrcReg } from './formats/yrc'
import MANIFEST from './manifest.json'
import type { Convert as CV } from './types'

export type { Convert } from './types'

export { detectFormat } from './detect'

export const portFormats = ['lrc', 'lrcA2', 'yrc', 'qrc', 'spl'] as const
export type PortFormat = (typeof portFormats)[number]

const portFormatHandlers: Record<PortFormat, CV.FormatHandler> = {
  lrc: lrcReg,
  lrcA2: lrcA2Reg,
  yrc: yrcReg,
  qrc: qrcReg,
  spl: splReg,
} as const

const tRefs = t.formats.sharedReferences
const formatReferences: Partial<Record<PortFormat, CV.FormatCaption['reference']>> = {
  lrc: [{ name: tRefs.wikipedia(), url: 'https://wikipedia.org/wiki/LRC_(file_format)' }],
  lrcA2: [{ name: tRefs.wikipedia(), url: 'https://en.wikipedia.org/wiki/LRC_(file_format)' }],
  spl: [{ name: tRefs.officialDoc(), url: 'https://moriafly.com/standards/spl.html' }],
}

type FormatWithKey = { key: PortFormat } & CV.Format
export const portFormatRegister: FormatWithKey[] = (
  [...Object.entries(portFormatHandlers)] as [PortFormat, CV.FormatHandler][]
).map(([key, handler]) => {
  const manifestItem: CV.FormatManifest = MANIFEST[key]
  return {
    key,
    name: t.formats[key].name(),
    description: t.formats[key].description(),
    reference: formatReferences[key],
    ...manifestItem,
    ...handler,
  }
})

export const portFormatRegisterMap: Record<PortFormat, FormatWithKey> = portFormatRegister.reduce(
  (acc, format) => {
    acc[format.key] = format
    return acc
  },
  {} as Record<PortFormat, FormatWithKey>,
)
