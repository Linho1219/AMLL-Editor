import syllabify from 'syllabify-fr'

import type { Syllabify as SL } from '..'
import { basicSplit } from './basic'

export const syllabifyFrSplit = async (
  strs: string[],
  rewrites: Readonly<SL.Rewrite>[],
  caseSensitive: boolean,
) =>
  basicSplit(strs, rewrites, caseSensitive, (token) => {
    const { syllabes } = syllabify(token)
    return [...syllabes]
  })
