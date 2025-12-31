<script setup lang="ts">
import { clamp } from 'lodash-es'
import { computed } from 'vue'

import { type PreferenceSchema, getDefaultPref } from '@core/pref'

import { usePrefStore } from '@states/stores'

import type { Maybe } from '@utils/types'

import PrefItem from './PrefItem.vue'
import { InputNumber } from 'primevue'

type NumberKeys = {
  [K in keyof PreferenceSchema]: PreferenceSchema[K] extends number ? K : never
}[keyof PreferenceSchema]

const props = defineProps<{
  prefKey: NumberKeys
  label: string
  desc?: string
  min?: number
  max?: number
  disabled?: boolean
  experimental?: boolean
  placeholder?: string
}>()

const prefStore = usePrefStore()

const defaultValue = getDefaultPref()[props.prefKey]
const model = computed({
  get: () => prefStore[props.prefKey],
  set: (value: Maybe<number>) => {
    if (typeof value !== 'number') prefStore[props.prefKey] = defaultValue
    else prefStore[props.prefKey] = clamp(value, props.min ?? -Infinity, props.max ?? Infinity)
  },
})
</script>

<template>
  <PrefItem :label :desc :disabled :experimental>
    <InputNumber
      v-model="model"
      :min
      :max
      :disabled
      :placeholder
      class="pref-number"
      fluid
      show-buttons
    />
  </PrefItem>
</template>

<style lang="scss">
.pref-number {
  max-width: 8rem;
}
</style>
