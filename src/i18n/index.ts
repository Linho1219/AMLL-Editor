import { computed, ref, watch } from 'vue'

import type { Locales } from './i18n-types'
import { i18nObject, isLocale } from './i18n-util'
import { loadLocale } from './i18n-util.sync'

export type { Locales } from './i18n-types'

const STORE_KEY = 'amll_editor:locale'

function detectEnvLocale(): Locales {
  // pending implementation
  return 'zh-hans'
}
const envLocale = detectEnvLocale()

function getStoredLocale(): Locales | null {
  const stored = localStorage.getItem(STORE_KEY)
  if (stored && isLocale(stored)) return stored
  return null
}

const currentLocale = getStoredLocale() ?? envLocale
loadLocale(currentLocale)
export const t = i18nObject(currentLocale)
export const localeOptRef = ref<Locales>(currentLocale)
export const localeOptNotMatch = computed(() => localeOptRef.value !== currentLocale)

watch(localeOptRef, (newLocale, oldLocale) => {
  if (newLocale === oldLocale) return
  if (newLocale === envLocale) localStorage.removeItem(STORE_KEY)
  else localStorage.setItem(STORE_KEY, newLocale)
})
