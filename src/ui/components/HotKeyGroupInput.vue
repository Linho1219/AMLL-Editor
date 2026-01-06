<template>
  <InputText
    readonly
    :value="displayValue"
    size="small"
    :placeholder="t.hotkey.notBinded()"
    @keydown.prevent.stop="handleKeyDown"
    @blur="handleBlur"
  />
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { computed } from 'vue'

import { type HotKey as HK, hotkeyToString, parseKeyEvent } from '@core/hotkey'

import { usePrefStore } from '@states/stores'

import { InputText } from 'primevue'

const prefStore = usePrefStore()

const [model] = defineModel<HK.Key[]>({ required: true })

const displayValue = computed(() =>
  model.value.length
    ? model.value.map((hk) => hotkeyToString(hk, prefStore.macStyleShortcuts)).join(', ')
    : undefined,
)

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Escape' || e.code === 'Backspace') {
    model.value = []
    return
  }
  const newKey: HK.Key = parseKeyEvent(e, true)!
  model.value = [newKey]
}
function handleBlur() {
  if (model.value.length !== 0 && model.value.some((k) => !k.code))
    model.value = model.value.filter((k) => k.code)
}
</script>
