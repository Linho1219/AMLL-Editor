<script setup lang="ts">
import { t } from '@i18n'

import type { PreferenceSchema } from '@core/pref'

import { usePrefStore } from '@states/stores'

import type { PickTypeKeys } from '@utils/types'

import PrefItem from './PrefItem.vue'
import { ToggleSwitch } from 'primevue'

const tt = t.sidebar.preference.items

type BooleanKeys = PickTypeKeys<PreferenceSchema, boolean>

const props = defineProps<{
  prefKey: BooleanKeys
  disabled?: boolean
  experimental?: boolean
}>()

const prefStore = usePrefStore()

const label = tt[props.prefKey]()
const desc = tt[`${props.prefKey}Desc`]()
</script>

<template>
  <PrefItem :label :desc :disabled :experimental :for="props.prefKey">
    <ToggleSwitch v-model="prefStore[props.prefKey]" :disabled :input-id="props.prefKey" />
  </PrefItem>
</template>
