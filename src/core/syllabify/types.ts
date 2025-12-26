import type { LyricSyllable } from '@core/types'

import type { Prettify } from '@utils/types'

export namespace Syllabify {
  export interface Rewrite {
    target: string
    indices: number[]
  }
  export type SplittedSyl =
    | string
    | Prettify<Partial<LyricSyllable> & { text: LyricSyllable['text'] }>
  export type Splitter = (
    strs: string[],
    rewrites: Readonly<Rewrite>[],
    caseSensitive: boolean,
  ) => SplittedSyl[][] | Promise<SplittedSyl[][]>

  export interface Engine {
    name: string
    description?: string
    notRecommend?: boolean
    processor: Splitter
  }
}
