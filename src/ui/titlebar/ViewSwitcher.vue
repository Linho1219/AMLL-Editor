<script setup lang="ts">
import { t } from '@i18n'
import { nextTick, ref, watch } from 'vue'

import { View } from '@core/types'

import { useRuntimeStore } from '@states/stores'

import { SelectButton } from 'primevue'

const tt = t.titlebar.view

const runtimeStore = useRuntimeStore()

// Middle view selector
const viewOptions = [
  { name: tt.content(), value: View.Content },
  { name: tt.timing(), value: View.Timing },
  { name: tt.preview(), value: View.Preview },
]

const stateToView = () => viewOptions.find((v) => v.value === runtimeStore.currentView)!
const viewHandler = ref<(typeof viewOptions)[number] | null>(stateToView())
watch(viewHandler, (value) => {
  if (!value) nextTick(() => (viewHandler.value = stateToView()))
  else runtimeStore.currentView = value.value
})
watch(
  () => runtimeStore.currentView,
  () => (viewHandler.value = stateToView()),
)
</script>

<template>
  <SelectButton
    v-model="viewHandler"
    :options="viewOptions"
    optionLabel="name"
    optionDisabled="disabled"
    size="large"
    class="view-switcher"
  />
</template>

<style lang="scss">
.view-switcher.view-switcher {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}
</style>
