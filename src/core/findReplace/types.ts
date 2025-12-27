export namespace FindReplace {
  export interface State {
    compiledPattern: RegExp | null
    replaceInput: string
    findInSyls: boolean
    findInSylRoman: boolean
    findInTranslations: boolean
    findInRoman: boolean
    crossWordMatch: boolean
    wrapSearch: boolean
  }
  export interface Notification {
    severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'
    summary: string
    detail?: string
  }
  export interface Actions {
    handleFindNext: () => void
    handleFindPrev: () => void
    handleReplace: () => void
    handleReplaceAll: () => void
  }

  export interface PosBasic {
    lineIndex: number
  }
  export interface PosLine extends PosBasic {
    field: 'TRANSLATION' | 'ROMAN'
  }
  export interface PosWhole extends PosBasic {
    field: 'WHOLE'
  }
  export interface PosSyl extends PosBasic {
    field: 'SYLLABLE'
    sylIndex: number
  }
  export interface PosMultiSyl extends PosBasic {
    field: 'MULTISYL'
    startSylIndex: number
    endSylIndex: number
  }
  export interface PosSylRoman extends PosBasic {
    field: 'SYLROMAN'
    sylIndex: number
  }
  export interface PosMultiSylRoman extends PosBasic {
    field: 'MULTISYLROMAN'
    startSylIndex: number
    endSylIndex: number
  }
  export type Pos = PosLine | PosSyl | PosMultiSyl | PosSylRoman | PosMultiSylRoman
  export type AbstractPos = PosWhole | Pos
  export type ReplaceablePos = PosSyl | PosSylRoman | PosLine
  export type InlinePos = PosSyl | PosSylRoman | PosMultiSyl | PosMultiSylRoman
  export type Dir = 'next' | 'prev'
}
