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

const [model] = defineModel<HK.Key | null>({ required: true })

const displayValue = computed(() =>
  model.value ? hotkeyToString(model.value, prefStore.macStyleShortcuts) : undefined,
)

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Escape' || e.code === 'Backspace') {
    model.value = null
    return
  }
  const newKey: HK.Key = parseKeyEvent(e, true)!
  model.value = newKey
}
function handleBlur() {
  if (!model.value?.code) model.value = null // prune incomplete key
}
</script>
