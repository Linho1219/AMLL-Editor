const timeRegexp =
  /^(((?<hour>[0-9]+):)?(?<min>[0-9]+):)?((?<sec>[0-9]+)([.:](?<frac>[0-9]{1,3}))?)$/

export function str2ms(str: string): number | null {
  const matches = timeRegexp.exec(str)
  if (!matches) return null
  const hour = Number(matches.groups?.hour || '0')
  const min = Number(matches.groups?.min || '0')
  const sec = Number(matches.groups?.sec || '0')
  const frac = Number((matches.groups?.frac || '0').padEnd(3, '0'))
  if ([hour, min, sec, frac].some((v) => isNaN(v))) return null
  return (hour * 3600 + min * 60 + sec) * 1000 + frac
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
  const m = Math.floor(num / 60000).toString()
  const s = Math.floor((num % 60000) / 1000)
    .toString()
    .padStart(2, '0')
  const msNum = Math.floor(num) % 1000
  if (msNum > 0) {
    const ms = (msNum / 1000).toString().slice(1)
    return `${m}:${s}${ms}`
  }
  return `${m}:${s}`
}
