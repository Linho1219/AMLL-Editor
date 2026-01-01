<template>
  <RibbonGroup label="行属性">
    <div class="hflex" style="align-items: center; gap: 1rem">
      <div class="kvgrid">
        <Checkbox
          inputId="ribbon-duetline"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="duetIndeterminate"
          v-model="duetChecked"
          binary
        />
        <label for="ribbon-duetline">对唱行</label>
        <Checkbox
          inputId="ribbon-bgline"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="backgroundIndeterminate"
          v-model="backgroundChecked"
          binary
        />
        <label for="ribbon-bgline">背景行</label>
        <Checkbox
          inputId="ribbon-ignoretime"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="ignoreTimingIndeterminate"
          v-model="ignoreTimingChecked"
          binary
        />
        <label for="ribbon-ignoretime">时轴中忽略</label>
        <Checkbox
          inputId="ribbon-alwaysignorebg"
          size="small"
          v-model="prefStore.alwaysIgnoreBackground"
          binary
        />
        <label for="ribbon-alwaysignorebg">始终忽略背景</label>
      </div>
      <div class="kvgrid" v-if="!prefStore.hideLineTiming">
        <span>开始时间</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="lineSelectedEmpty"
          v-model.lazy="lineStartTime"
          autoselect
          v-keyfilter="/[0-9:.]/"
        />
        <span>结束时间</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="lineSelectedEmpty"
          v-model.lazy="lineEndTime"
          autoselect
          v-keyfilter="/[0-9:.]/"
        />
        <span>持续时长</span>
        <InputNumber
          class="durationinput"
          size="small"
          placeholder="0"
          :disabled="lineSelectedEmpty"
          v-model="lineDuration"
          :invalid="(lineDuration ?? 0) < 0"
        />
      </div>
    </div>
  </RibbonGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import RibbonGroup from '../RibbonGroupShell.vue'
import InputText from '@ui/components/InputText.vue'
import { Checkbox, InputNumber } from 'primevue'

import { attrCheckbox, itemTimeInput } from '../common'

const runtimeStore = useRuntimeStore()
const prefStore = usePrefStore()

const lineSelectedEmpty = computed(() => runtimeStore.selectedLines.size === 0)

const { checked: backgroundChecked, indeterminate: backgroundIndeterminate } = attrCheckbox(
  runtimeStore.selectedLines,
  'background',
)
const { checked: duetChecked, indeterminate: duetIndeterminate } = attrCheckbox(
  runtimeStore.selectedLines,
  'duet',
)
const { checked: ignoreTimingChecked, indeterminate: ignoreTimingIndeterminate } = attrCheckbox(
  runtimeStore.selectedLines,
  'ignoreInTiming',
)

const {
  startTime: lineStartTime,
  endTime: lineEndTime,
  duration: lineDuration,
} = itemTimeInput(runtimeStore.selectedLines)
</script>
