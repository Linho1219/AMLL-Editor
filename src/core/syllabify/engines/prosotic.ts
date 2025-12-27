import nlpSpeech from 'compromise-speech'
import nlp from 'compromise/tokenize'

import type { Syllabify as SL } from '..'
import { splitTextByLengths } from '../shared'
import { basicSplit } from './basic'
import { compromiseSplitCore } from './compromise'

let dictCache: Map<string, 0 | number[]> | null = null
export async function prosoticSplit(
  strs: string[],
  rewrites: Readonly<SL.Rewrite>[],
  caseSensitive: boolean,
) {
  if (!dictCache) {
    const rawDict = (await fetch('/dicts/SUBTLEXus_prosotic.dict.json').then((res) =>
      res.json(),
    )) as Record<string, 0 | number[]>
    dictCache = new Map<string, 0 | number[]>(Object.entries(rawDict))
  }
  const dict = dictCache
  const nlpWithPlg = nlp.extend(nlpSpeech)
  return basicSplit(strs, rewrites, caseSensitive, (part) => {
    if (part.length === 0) return []
    const key = part.toLowerCase()
    if (dict.has(key)) {
      const lengths = dict.get(key)!
      if (!lengths) return [part]
      return splitTextByLengths(part, lengths)
    }
    if (key.endsWith('in')) {
      // handle g dropping cases like "runnin", "singin"
      const altKey = key + 'g'
      if (dict.has(altKey)) {
        const lengths = dict.get(altKey)!
        if (!lengths) return [part]
        return splitTextByLengths(part, lengths)
      }
    }
    return compromiseSplitCore(nlpWithPlg, part)
  })
}
