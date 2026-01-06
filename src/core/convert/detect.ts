import { portFormatRegister, portFormatRegisterMap } from '.'
import type { Convert } from './types'

export function detectFormat(extension: string, content: string): Convert.Format {
  const dotExt = `.${extension.toLowerCase()}` as string
  const formatCandidates = portFormatRegister.filter((format) => format.accept.includes(dotExt))
  if (formatCandidates.length === 0)
    throw new Error('No format candidates found for the given file extension.')
  if (formatCandidates.length === 1) return formatCandidates[0]!
  if (dotExt === '.lrc') return detectLrcVariants(content)
  throw new Error('Multiple format candidates found, but no disambiguation logic implemented.')
}

function detectLrcVariants(content: string): Convert.Format {
  const hasSylLevel = /(?<!^(\[[^\]+]\])*)[<[][>\]]/.test(content)
  if (!hasSylLevel) return portFormatRegisterMap.lrc
  const sqBracketEnding = /(?<!\])\[\d{1,3}:\d{1,2}\.\d{1,3}\d{0,3}\]$/.test(content)
  if (sqBracketEnding) return portFormatRegisterMap.spl
  return portFormatRegisterMap.lrcA2
}
