<template>
  <div class="hotkey-popup">
    <div class="hotkey-popup-item" v-for="(item, index) in innerList">
      <HotKeyInput v-model="innerList[index]!" fluid />
      <Button
        icon="pi pi-times"
        size="small"
        severity="secondary"
        @click="innerList.splice(index, 1)"
      ></Button>
    </div>
    <div class="hotkey-popup-item add">
      <Button
        label="添加"
        icon="pi pi-plus"
        size="small"
        fluid
        severity="secondary"
        @click="innerList.push(null)"
      />
      <Button icon="pi pi-sync" size="small" severity="secondary" @click="handleReset"></Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import stableStringify from 'json-stable-stringify'
import { cloneDeep } from 'lodash-es'
import { ref, toRaw, watch } from 'vue'

import { type HotKey as HK, getDefaultHotkeyMap } from '@core/hotkey'

import { usePrefStore } from '@states/stores'

import HotKeyInput from './HotKeyInput.vue'
import { Button } from 'primevue'

const props = defineProps<{
  command: HK.Command
}>()

const prefStore = usePrefStore()

const innerList = ref<(HK.Key | null)[]>([])

function handleReset() {
  prefStore.hotkeyMap[props.command] = getDefaultHotkeyMap()[props.command]
  innerList.value = getDefaultHotkeyMap()[props.command]
}

watch(
  () => prefStore.hotkeyMap[props.command],
  () => (innerList.value = cloneDeep(toRaw(prefStore.hotkeyMap[props.command]))),
  { immediate: true, deep: true },
)
watch(
  innerList,
  (newList) => {
    const filteredList = toRaw(newList).filter((k): k is HK.Key => k !== null)
    if (stableStringify(filteredList) !== stableStringify(prefStore.hotkeyMap[props.command])) {
      prefStore.hotkeyMap[props.command] = cloneDeep(filteredList)
    }
  },
  { deep: true },
)
</script>

<style lang="scss">
.hotkey-popup {
  width: 15rem;

  .hotkey-popup-item {
    margin-bottom: 8px;
    display: flex;
    gap: 0.5rem;
    &.add {
      margin-bottom: 0;
    }
  }
}
</style>
