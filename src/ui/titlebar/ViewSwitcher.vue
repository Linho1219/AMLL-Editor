<script setup lang="ts">
import { View } from '@core/types'
import { useRuntimeStore } from '@states/stores'
import { SelectButton } from 'primevue'
import { nextTick, ref, watch } from 'vue'

const runtimeStore = useRuntimeStore()

// Middle view selector
const viewOptions = [
  { name: '内容', value: View.Content },
  { name: '时轴', value: View.Timing },
  { name: '预览', value: View.Preview },
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
  />
</template>
