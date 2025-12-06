import type { Rewrite } from './register'
import nlp from 'compromise/tokenize'
import nlpSpeech from 'compromise-speech'
import { basicSplit, splitTextByLengths } from './basic'
import { compromiseSplitCore } from './compromise'

let dictCache: Map<string, 0 | number[]> | null = null
export async function prosoticSplit(
  strs: string[],
  rewrites: Readonly<Rewrite>[],
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
    } else {
      return compromiseSplitCore(nlpWithPlg, part)
    }
  })
}
