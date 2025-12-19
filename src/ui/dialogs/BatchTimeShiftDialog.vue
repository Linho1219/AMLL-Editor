<template>
  <Dialog class="thin-padding" v-model:visible="visible" header="批量时移">
    <div class="timeshift-content" v-focustrap>
      <div class="timeshift-description">推迟为正，提前为负</div>
      <InputNumber
        v-model="shiftMs"
        class="timeshift-ms-input"
        showButtons
        buttonLayout="horizontal"
        fluid
        :use-grouping="false"
        :invalid="shiftMs === null"
        :step="10"
      >
        <template #decrementicon>
          <span class="pi pi-arrow-left" />
        </template>
        <template #incrementicon>
          <span class="pi pi-arrow-right" />
        </template>
      </InputNumber>
      <Button
        label="应用到选定词"
        icon="pi pi-ellipsis-h"
        fluid
        severity="secondary"
        :disabled="!shiftMs || !runtimeStore.selectedWords.size"
        @click="handleApplyToSelectedWords"
      />
      <Button
        label="应用到选定行"
        icon="pi pi-bars"
        fluid
        severity="secondary"
        :disabled="!shiftMs || !runtimeStore.selectedLines.size"
        @click="handleApplyToSelectedLines"
      />
      <Button
        label="应用到全文"
        icon="pi pi-file"
        fluid
        severity="secondary"
        :disabled="!shiftMs"
        @click="handleApplyToAll"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import type { LyricLine, LyricWord } from '@core/types'
import { useCoreStore, useRuntimeStore } from '@states/stores'
import { Button, Dialog, InputNumber } from 'primevue'
import { ref } from 'vue'

const [visible] = defineModel<boolean>({ required: true })

const shiftMs = ref<number | null>(0)

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()

function applyToWord(ms: number, word: LyricWord) {
  word.startTime = Math.max(0, word.startTime + ms)
  word.endTime = Math.max(0, word.endTime + ms)
}
function applyToLine(ms: number, line: LyricLine) {
  line.startTime = Math.max(0, line.startTime + ms)
  line.endTime = Math.max(0, line.endTime + ms)
  line.words.forEach((word) => applyToWord(ms, word))
}

function handleApplyToSelectedWords() {
  if (!shiftMs.value) return
  const shift = shiftMs.value
  runtimeStore.selectedWords.forEach((word) => applyToWord(shift, word))
}
function handleApplyToSelectedLines() {
  if (!shiftMs.value) return
  const shift = shiftMs.value
  runtimeStore.selectedLines.forEach((line) => applyToLine(shift, line))
}
function handleApplyToAll() {
  if (!shiftMs.value) return
  const shift = shiftMs.value
  coreStore.lyricLines.forEach((line) => applyToLine(shift, line))
}
</script>

<style lang="scss">
.timeshift-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 12rem;
}
.timeshift-description {
  font-size: 0.9rem;
  opacity: 0.75;
}
.timeshift-ms-input {
  --p-inputtext-padding-y: 0.4rem;
  .p-inputtext {
    font-family: var(--font-monospace);
    font-size: 1.1rem;
  }
  position: relative;
  &::after {
    position: absolute;
    content: 'ms';
    top: 0;
    bottom: 0;
    right: var(--p-inputnumber-button-width);
    margin: auto 0.8rem auto 0;
    height: fit-content;
    opacity: 0.6;
    pointer-events: none;
  }
}
</style>
