import { parse, stringify } from 'flatted'
import type { Persist } from '..'

export function stringifyNative(data: Persist): string {
  return stringify(data)
}

export function parseNative(dataString: string): Persist {
  const data: Persist = parse(dataString)
  return data
}
