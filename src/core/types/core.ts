/** 元数据键 */
export type MetadataKey = string
/** 元数据 */
export type MetadataMap = Record<MetadataKey, string[]>

/** 歌词行 */
export interface LyricLine {
  /** 私有唯一标识符，由 nanoid 生成 */
  id: string
  /** 该行的翻译 */
  translation: string
  /** 该行的音译 */
  romanization: string
  /** 该行是否为背景歌词行 */
  background: boolean
  /** 该行是否为对唱歌词行（即歌词行靠右对齐） */
  duet: boolean
  /** 该行的开始时间 并不总是等于第一个单词的开始时间 */
  startTime: number
  /** 该行的结束时间 并不总是等于最后一个单词的开始时间 */
  endTime: number
  /** 该行的所有单词  */
  syllables: LyricSyllable[]
  /** 在时轴上忽略 */
  ignoreInTiming: boolean
  /** 已添加书签 */
  bookmarked: boolean
}

/** 单词 */
export interface LyricSyllable {
  id: string
  /** 单词的起始时间 */
  startTime: number
  /** 单词的结束时间 */
  endTime: number
  /** 词内容 */
  text: string
  /** 音译 */
  romanization: string
  /** 占位拍，用于日语多音节汉字时轴 */
  placeholdingBeat: number
  /** 当前占位拍 */
  currentplaceholdingBeat: number
  /** 已添加书签 */
  bookmarked: boolean
}

/** 批注 */
// export interface Comment {
//   /** 创建时间 */
//   createTime: number
//   /** 上次编辑时间 */
//   lastEditTime: number
//   /** 内容 */
//   content: string
//   /** 目标行或词 */
//   target: LyricLine | LyricSyllable
// }
