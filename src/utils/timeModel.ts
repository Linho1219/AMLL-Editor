export function str2ms(str: string): number | null {
  str = str.trim()
  const match = str.match(/^(?:(\d+):)?(\d+)?((?:\.|:)\d+)?$/)
  if (!match) return null
  const [, strM, strS, strMs] = match
  const m = Number(strM || 0) * 60 * 1000
  const s = Number(strS || 0) * 1000
  const ms = strMs ? Number(strMs.replace(/^:/, '.')) * 1000 : 0
  const combined = m + s + ms
  if (isNaN(combined)) return null
  return combined
}

export function ms2str(num: number): string {
  if (num < 0) num = 0
  const m = Math.floor(num / 60000)
    .toString()
    .padStart(2, '0')
  const s = Math.floor((num % 60000) / 1000)
    .toString()
    .padStart(2, '0')
  const ms = (Math.floor(num) % 1000).toString().padStart(3, '0')
  return `${m}:${s}.${ms}`
}

export function ms2strShort(num: number): string {
  if (num < 0) num = 0
  const m = Math.floor(num / 60000)
    .toString()
    .padStart(2, '0')
  const s = Math.floor((num % 60000) / 1000)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}
