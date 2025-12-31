<template>
  <template v-for="{ key, component } in dialogRegs">
    <component :is="component" v-model="runtimeStore.dialogShown[key]" />
  </template>
</template>
<script setup lang="ts">
import { watch } from 'vue'

import { useRuntimeStore } from '@states/stores'

import { DialogKey, dialogRegs } from '.'

const runtimeStore = useRuntimeStore()

watch(
  () => runtimeStore.isPreviewView,
  (newVal) => {
    if (newVal)
      for (const key of Object.keys(runtimeStore.dialogShown))
        runtimeStore.dialogShown[key as DialogKey] = false
  },
)
</script>
