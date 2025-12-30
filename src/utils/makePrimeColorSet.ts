const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
type Level = (typeof levels)[number]

export function makePrimeColorSet(baseColor: string): Record<Level, string> {
  const colorSet = {} as Record<Level, string>
  for (const level of levels) colorSet[level] = `{${baseColor}.${level}}`
  return colorSet
}
