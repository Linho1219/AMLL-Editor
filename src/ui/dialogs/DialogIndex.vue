<template>
  <template v-for="{ key, component } in dialogRegs">
    <component :is="component" v-model="runtimeStore.dialogShown[key]" />
  </template>
</template>
<script setup lang="ts">
import { useRuntimeStore } from '@states/stores'

import { dialogRegs } from '.'

const runtimeStore = useRuntimeStore()
</script>
