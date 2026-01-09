import type { FormattersInitializer } from 'typesafe-i18n'

import type { Formatters, Locales } from './i18n-types.js'

export const initFormatters: FormattersInitializer<Locales, Formatters> = (_locale: Locales) => {
  const formatters: Formatters = {
    time: (date: unknown) => (date instanceof Date ? date.toTimeString().split(' ')[0]! : ''),
  }
  return formatters
}
