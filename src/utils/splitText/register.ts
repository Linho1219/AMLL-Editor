import type { LyricWord } from '@/stores/core'
import { basicSplit } from './basic'
import { compromiseSplit } from './compromise'
import { prosoticSplit } from './prosotic'
import { japaneseSplit } from './japanese'

export interface Rewrite {
  target: string
  indices: number[]
}
export type SplittedWord = string | (Partial<LyricWord> & { text: LyricWord['text'] })
export type Splitter = (
  strs: string[],
  rewrites: Readonly<Rewrite>[],
  caseSensitive: boolean,
) => SplittedWord[][] | Promise<SplittedWord[][]>

export interface SplitEngine {
  name: string
  description?: string
  processor: Splitter
}

const engines: SplitEngine[] = [
  {
    name: '基本断词',
    description:
      '对西文按词拆分，对于 CJK 按字拆分。若有自定义规则，将对拆分后的词应用，已拆分的词不会合并。',
    processor: basicSplit,
  },
  {
    name: 'Compromise 英语正字法断词',
    description:
      '在基本断词基础上，由 Compromise 库提供基于正字法规则匹配的英语音节拆分。若有自定义规则，将覆盖词内音节拆分。',
    processor: compromiseSplit,
  },
  {
    name: 'Prosodic 英语词库断词',
    description:
      '将 SUBTLEXus 作为语料，由 Prosodic 根据 CMUDict 进行音节划分后，匹配回拼写得到词典，高频词经人工校对。未命中的词将回退至 Compromise。',
    processor: prosoticSplit,
  },
  {
    name: '日语基本断词',
    description:
      '针对日语拗音等做专门处理，逻辑来自 @Xionghaizi001。若有自定义规则，将优先提取自定义词拆分，其余部分按规则拆分。',
    processor: japaneseSplit,
  },
]

export default engines
