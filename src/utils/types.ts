export type TimeoutHandle = ReturnType<typeof setTimeout>

export type ValueOf<T extends Record<PropertyKey, unknown>> = T[keyof T]

export type Prettify<T extends object> = {
  [K in keyof T]: T[K]
} & {}

export type Falsy = false | 0 | '' | null | undefined | 0n

export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false

export type Expect<T extends true> = T

export type UnionKeys<T extends object> = T extends any ? keyof T : never

export type Maybe<T> = T | null | undefined
