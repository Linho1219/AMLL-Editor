import { computed, ref, watch } from 'vue'

import type { Locales } from './i18n-types'
import { i18nObject, isLocale } from './i18n-util'
import { loadLocale } from './i18n-util.sync'

export type { Locales } from './i18n-types'

const STORE_KEY = 'amll_editor:locale'

function detectEnvLocale(): Locales {
  // pending implementation
  return 'zhHans'
}

function getStoredLocale(): Locales | null {
  const stored = localStorage.getItem(STORE_KEY)
  if (stored && isLocale(stored)) return stored
  return null
}

const currentLocale = getStoredLocale() ?? detectEnvLocale()
loadLocale(currentLocale)
export const t = i18nObject(currentLocale)
export const localeOpt = ref<Locales>(currentLocale)
export const localeOptNotMatch = computed(() => localeOpt.value !== currentLocale)

watch(localeOpt, (newLocale, oldLocale) => {
  if (newLocale !== oldLocale) localStorage.setItem(STORE_KEY, newLocale)
})
