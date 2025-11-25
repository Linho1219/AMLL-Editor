<template>
  <Dialog class="thin-padding" v-model:visible="visible" header="查找替换">
    <div class="findreplace-content" v-focustrap>
      <div class="findreplace-mode"></div>
      <div class="findreplace-inputs">
        <div class="findreplace-find-input"></div>
        <div class="findreplace-replace-input"></div>
      </div>
      <div class="findreplace-range"></div>
      <div class="findreplace-options"></div>
      <div class="findreplace-actions"></div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { Button, Dialog, InputNumber } from 'primevue'
import { ref } from 'vue'

const [visible] = defineModel<boolean>({ required: true })

const shiftMs = ref<number | null>(0)

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

const showReplace = ref(false)
const showOptions = ref(false)
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
