import syllabify from 'syllabify-fr'
import type { Rewrite } from './register'
import { basicSplit } from './basic'

export async function syllabifyFrSplit(
  strs: string[],
  rewrites: Readonly<Rewrite>[],
  caseSensitive: boolean,
) {
  return basicSplit(strs, rewrites, caseSensitive, (token) => {
    const { syllabes } = syllabify(token)
    return [...syllabes]
  })
}
