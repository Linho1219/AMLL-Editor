<template>
  <RibbonGroup :label="tt.groupLabel()">
    <Button
      icon="pi pi-wave-pulse"
      :label="tt.delayTest()"
      size="small"
      severity="secondary"
      disabled
    />
    <div class="hflex" style="align-items: center; gap: 0.5rem">
      <span>{{ tt.delay() }}</span>
      <InputNumber
        class="durationinput"
        style="width: 0; flex: 1"
        fluid
        size="small"
        placeholder="0"
        v-model="prefStore.globalLatencyMs"
        :use-grouping="false"
        :max="5000"
        :min="-5000"
      />
    </div>
    <Button
      icon="pi pi-sliders-h"
      :label="tt.batchTimeShift()"
      size="small"
      :severity="runtimeStore.dialogShown.batchTimeShift ? undefined : 'secondary'"
      @click="runtimeStore.dialogShown.batchTimeShift = !runtimeStore.dialogShown.batchTimeShift"
      v-tooltip="tipDesc(tt.batchTimeShift(), tt.batchTimeShiftDesc(), 'batchTimeShift')"
    />
  </RibbonGroup>
</template>

<script setup lang="ts">
import { t } from '@i18n'

import { useGlobalKeyboard } from '@core/hotkey'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import { tipDesc } from '@utils/generateTooltip'

import RibbonGroup from '../RibbonGroupShell.vue'
import { Button, InputNumber } from 'primevue'

const tt = t.ribbon.timeShift

const prefStore = usePrefStore()
const runtimeStore = useRuntimeStore()

useGlobalKeyboard('batchTimeShift', () => {
  runtimeStore.dialogShown.batchTimeShift = !runtimeStore.dialogShown.batchTimeShift
})
</script>
