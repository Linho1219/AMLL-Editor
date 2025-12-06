import { basicSplit } from './basic'
import type { Rewrite } from './register'
import syllabify from 'syllabify'

export async function syllabifySplit(
  strs: string[],
  rewrites: Readonly<Rewrite>[],
  caseSensitive: boolean,
) {
  return basicSplit(strs, rewrites, caseSensitive, (token) => {
    try {
      return syllabify(token)
    } catch {
      return [token]
    }
  })
}
