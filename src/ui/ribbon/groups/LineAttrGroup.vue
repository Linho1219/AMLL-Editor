<template>
  <RibbonGroup :label="tt.groupLabel()">
    <div class="hflex" style="align-items: center; gap: 1rem">
      <div class="kvgrid">
        <Checkbox
          input-id="ribbon-duetline"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="duetIndeterminate"
          v-model="duetChecked"
          binary
        />
        <label for="ribbon-duetline">{{ tt.duet() }}</label>
        <Checkbox
          input-id="ribbon-bgline"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="backgroundIndeterminate"
          v-model="backgroundChecked"
          binary
        />
        <label for="ribbon-bgline">{{ tt.background() }}</label>
        <Checkbox
          input-id="ribbon-ignoretime"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="ignoreTimingIndeterminate"
          v-model="ignoreTimingChecked"
          binary
        />
        <label for="ribbon-ignoretime">{{ tt.ignoreInTiming() }}</label>
        <Checkbox
          input-id="ribbon-connectnext"
          size="small"
          :disabled="lineSelectedEmpty"
          :indeterminate="connectNextIndeterminate"
          v-model="connectNextChecked"
          binary
        />
        <label for="ribbon-connectnext">{{ tt.connectNext() }}</label>
      </div>
      <div class="kvgrid" v-if="!prefStore.hideLineTiming">
        <span>{{ tt.startTime() }}</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="lineSelectedEmpty"
          v-model.lazy="lineStartTime"
          autoselect
          v-keyfilter="/[0-9:.]/"
        />
        <span>{{ tt.endTime() }}</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="lineSelectedEmpty"
          v-model.lazy="lineEndTime"
          autoselect
          v-keyfilter="/[0-9:.]/"
        />
        <span>{{ tt.duration() }}</span>
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
import { t } from '@i18n'
import { computed } from 'vue'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import RibbonGroup from '../RibbonGroupShell.vue'
import InputText from '@ui/components/InputText.vue'
import { Checkbox, InputNumber } from 'primevue'

import { attrCheckbox, itemTimeInput } from '../common'

const tt = t.ribbon.lineAttr

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
const { checked: connectNextChecked, indeterminate: connectNextIndeterminate } = attrCheckbox(
  runtimeStore.selectedLines,
  'connectNext',
)

const {
  startTime: lineStartTime,
  endTime: lineEndTime,
  duration: lineDuration,
} = itemTimeInput(runtimeStore.selectedLines)
</script>
