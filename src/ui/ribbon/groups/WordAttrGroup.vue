<template>
  <RibbonGroup label="词属性">
    <div class="hflex" style="align-items: center; gap: 1rem">
      <div class="kvgrid">
        <span>开始时间</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="wordSelectedEmpty"
          v-model.lazy="wordStartTime"
          v-keyfilter="/[0-9:.]/"
        />
        <span>结束时间</span>
        <InputText
          class="timeinput"
          placeholder="00:00.000"
          size="small"
          :disabled="wordSelectedEmpty"
          v-model.lazy="wordEndTime"
          v-keyfilter="/[0-9:.]/"
        />
        <span>持续时长</span>
        <InputNumber
          class="durationinput"
          size="small"
          placeholder="0"
          :useGrouping="false"
          :disabled="wordSelectedEmpty"
          v-model="wordDuration"
          :invalid="(wordDuration ?? 0) < 0"
        />
      </div>
      <div class="vflex" style="gap: 0.5rem; width: 7.5rem">
        <span style="text-align: center">
          占位拍
          <span style="font-family: var(--font-monospace)"
            >{{ currPhBeatInput ?? 'N' }}/{{ phBeatInput ?? 'A' }}</span
          >
        </span>
        <div class="hflex">
          <InputGroup>
            <InputNumber
              class="monospace"
              showButtons
              :min="0"
              size="small"
              placeholder="0"
              :disabled="wordSelectedEmpty"
              v-model="phBeatInput"
            />
            <InputGroupAddon class="placeholderbeat-applytoall-addon">
              <Button
                class="placeholderbeat-applytoall"
                icon="pi pi-angle-double-right"
                severity="secondary"
                variant="text"
                size="small"
                fluid
                :disabled="wordSelectedEmpty || !phBeatApplyToAllEnabled"
                @click="phBeatApplyToAll"
                v-tooltip="'应用到所有相同词'"
              />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <Slider
          :step="1"
          style="margin: 0.5rem"
          :disabled="wordSelectedEmpty || !phBeatInput"
          :min="0"
          :max="phBeatInput || 1"
          v-model="currPhBeatInput"
        />
      </div>
    </div>
  </RibbonGroup>
</template>

<script setup lang="ts">
import RibbonGroup from '../RibbonGroupShell.vue'
import { itemTimeInput } from '../common'
import InputText from '@ui/components/InputText.vue'
import { computed } from 'vue'
import { useRuntimeStore, useCoreStore } from '@states/stores'
import { Button, InputGroup, InputGroupAddon, InputNumber, Slider } from 'primevue'

const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()

const wordSelectedEmpty = computed(() => runtimeStore.selectedWords.size === 0)

const {
  startTime: wordStartTime,
  endTime: wordEndTime,
  duration: wordDuration,
} = itemTimeInput(runtimeStore.selectedWords)

function placeholdingBeatInputs() {
  const setOnlyOne = computed(() => runtimeStore.selectedWords.size === 1)
  const setFirstItem = computed(() => runtimeStore.selectedWords.values().next().value)
  const numericComputed = (key: 'placeholdingBeat' | 'currentplaceholdingBeat') =>
    computed<number | undefined>({
      get() {
        if (!setFirstItem.value) return undefined
        const firstValue = setFirstItem.value[key]
        if (setOnlyOne.value) return firstValue
        for (const item of runtimeStore.selectedWords)
          if (item[key] !== firstValue) return undefined
        return firstValue
      },
      set(value) {
        if (typeof value !== 'number') value = 0
        runtimeStore.selectedWords.forEach((item) => (item[key] = value))
      },
    })

  const phBeatInput = numericComputed('placeholdingBeat')
  const currPhBeatInput = numericComputed('currentplaceholdingBeat')
  const phBeatApplyToAllEnabled = computed(() => {
    return typeof phBeatInput.value === 'number' && typeof currPhBeatInput.value === 'number'
  })
  const phBeatApplyToAll = () => {
    if (typeof phBeatInput.value !== 'number' || typeof currPhBeatInput.value !== 'number') return
    coreStore.lyricLines.forEach((line) => {
      line.words.forEach((word) => {
        if (word.text !== setFirstItem.value?.text) return
        word.placeholdingBeat = phBeatInput.value!
      })
    })
  }
  return { phBeatInput, currPhBeatInput, phBeatApplyToAllEnabled, phBeatApplyToAll }
}
const { phBeatInput, currPhBeatInput, phBeatApplyToAllEnabled, phBeatApplyToAll } =
  placeholdingBeatInputs()
</script>
