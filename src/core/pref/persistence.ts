import stableStringify from 'json-stable-stringify'

import { type PreferenceSchema, getDefaultPref } from './schema'

const STORAGE_KEY = 'amll_editor:preference'
const PREF_VERSION = 1

interface PersistedPref {
  appVersion: string
  prefVersion: number
  data: Partial<PreferenceSchema>
}

export function loadPreference(): PreferenceSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultPref()
    const parsed = JSON.parse(raw) as PersistedPref
    if (parsed.prefVersion > PREF_VERSION)
      console.warn(
        `Found preference version ${parsed.prefVersion}, newer than current version ${PREF_VERSION}.`,
      )
    return {
      ...getDefaultPref(),
      ...parsed.data,
    }
  } catch {
    return getDefaultPref()
  }
}

export function savePreference(data: PreferenceSchema) {
  const prunedData: Partial<PreferenceSchema> = { ...data }
  const defaultPref = getDefaultPref()
  for (const [_key, value] of Object.entries(data)) {
    const key = _key as keyof PreferenceSchema
    if (value === defaultPref[key]) delete prunedData[key]
    if (typeof value === 'object' && value !== null) {
      if (stableStringify(value) === stableStringify(defaultPref[key])) delete prunedData[key]
    }
  }
  const payload: PersistedPref = {
    appVersion: __APP_VERSION__,
    prefVersion: PREF_VERSION,
    data: prunedData,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
