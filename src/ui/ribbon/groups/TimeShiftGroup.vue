<template>
  <RibbonGroup label="时移">
    <Button icon="pi pi-wave-pulse" label="延迟测试" size="small" severity="secondary" disabled />
    <div class="hflex" style="align-items: center; gap: 0.5rem">
      <span>延迟</span>
      <InputNumber
        class="durationinput"
        style="width: 0; flex: 1"
        fluid
        size="small"
        placeholder="0"
        v-model="prefStore.globalLatency"
      />
    </div>
    <Button
      icon="pi pi-sliders-h"
      label="批量时移"
      size="small"
      :severity="batchShiftDialogVisible ? undefined : 'secondary'"
      @click="batchShiftDialogVisible = !batchShiftDialogVisible"
      v-tooltip="
        tipDesc('批量时移', '打开批量时移对话框，调整多个词或行的时间戳。', 'batchTimeShift')
      "
    />
    <BatchTimeShiftDialog v-model="batchShiftDialogVisible" />
  </RibbonGroup>
</template>

<script setup lang="ts">
import { Button, InputNumber } from 'primevue'
import RibbonGroup from '../RibbonGroupShell.vue'
import { usePrefStore } from '@states/stores'
import BatchTimeShiftDialog from '@ui/dialogs/BatchTimeShiftDialog.vue'
import { ref } from 'vue'
import { tipDesc } from '@utils/tooltip'
import { useGlobalKeyboard } from '@core/hotkey'

const prefStore = usePrefStore()
const batchShiftDialogVisible = ref(false)

useGlobalKeyboard('batchTimeShift', () => {
  batchShiftDialogVisible.value = !batchShiftDialogVisible.value
})
</script>
