// Be aware: here're 3 'syllabify's
// 1. syllabify is the name of this module
// 2. syllabify is also the name of an external library for Russian syllabification
// 3. syllabify-fr is another external library for French syllabification
import { basicSplit } from './engines/basic'
import { compromiseSplit } from './engines/compromise'
import { japaneseSplit } from './engines/japanese'
import { prosoticSplit } from './engines/prosotic'
import { silabeadorSplit } from './engines/silabeador'
import { syllabifySplit } from './engines/syllabify'
import { syllabifyFrSplit } from './engines/syllabifyFr'
import type { Syllabify as SL } from './types'

export type { Syllabify } from './types'

const engines: SL.Engine[] = [
  {
    name: '基本断字',
    description:
      '对西文按词拆分，对于 CJK 按字拆分。若有自定义规则，将对拆分后的词应用，已拆分的词不会合并。',
    processor: basicSplit,
  },
  {
    name: '日语基本断字',
    description:
      '针对日语拗音等做专门处理。若有自定义规则，将优先提取自定义拆分，其余部分按规则拆分。',
    processor: japaneseSplit,
  },
  {
    name: 'Prosodic 英语断字',
    description:
      '将 SUBTLEXus 作为语料，由 Prosodic 根据 CMUDict 进行音节划分后，匹配回拼写得到词典，高频词经人工校对。未命中的词将回退至 Compromise。',
    processor: prosoticSplit,
  },
  {
    name: 'Silabeador 西班牙语断字',
    description:
      '由 Silabeador 库提供的正字法西班牙语音节划分，内置例外表。同时可容忍不常见或非西班牙语变音符号与辅音集群。',
    processor: silabeadorSplit,
  },
  {
    name: 'Compromise 英语断字',
    description: '由 Compromise 库提供的正字法英语音节拆分。',
    processor: compromiseSplit,
    notRecommend: true,
  },
  {
    name: 'Syllabify-fr 法语断字',
    description: '由 Syllabify-fr 库提供的正字法法语语音节划分。',
    processor: syllabifyFrSplit,
    notRecommend: true,
  },
  {
    name: 'Syllabify 俄语断字',
    description: '由 Syllabify 库提供的正字法俄语音节划分。',
    processor: syllabifySplit,
    notRecommend: true,
  },
]

export default engines
