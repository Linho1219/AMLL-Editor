import type { hotkeyCommandNames } from './schema'

export namespace HotKey {
  export type Command = keyof typeof hotkeyCommandNames
  export interface Key {
    code: string
    ctrl: boolean
    alt: boolean
    shift: boolean
  }
  export type Map = Record<Command, Key[]>
}
