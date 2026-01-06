import type { hotkeyCommandList } from './schema'

export namespace HotKey {
  export type Command = (typeof hotkeyCommandList)[number]
  export interface Key {
    code: string
    ctrl: boolean
    alt: boolean
    shift: boolean
  }
  export type Map = Record<Command, Key[]>
}
