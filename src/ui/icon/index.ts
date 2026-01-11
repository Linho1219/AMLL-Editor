import MANIFEST from './iconManifest.json'

type IconClassMap = Record<keyof typeof MANIFEST, string>

const additionalClassNames = ['fi']

const transformIconKey = (key: string) =>
  [...additionalClassNames, key.replace(/:/g, '-')].join(' ')

export const i = Object.fromEntries(
  Object.entries(MANIFEST).map(([key, value]) => [key, transformIconKey(value)]),
) as IconClassMap
