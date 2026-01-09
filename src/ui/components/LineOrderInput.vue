<template>
  <div class="line-order-input">
    <div class="line-order-input-state-info">
      <div class="title">{{ tt.header() }}</div>
      <div class="count">{{ tt.cycleLengthHint(cycleLength) }}</div>
    </div>
    <hr class="line-order-hr" />
    <VueDraggable v-model="listItems" :animation="200">
      <div
        class="line-order-item"
        v-for="item in listItems"
        :key="item.key"
        :class="item.classname"
      >
        <i class="pi pi-bars line-order-item-icon"></i>{{ item.caption }}
      </div>
    </VueDraggable>
    <hr class="line-order-hr" />
    <div class="line-order-empty-line">
      {{ tt.emptyLineCount() }}
      <InputNumber
        class="line-order-empty-line-input"
        v-model="emptyLineCountModel"
        :useGrouping="false"
        :min="0"
        placeholder="0"
        fluid
        showButtons
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'

import { InputNumber } from 'primevue'

const tt = t.importFromText.lineOrder

const props = defineProps<{
  transEnabled: boolean
  romanEnabled: boolean
}>()

interface ListItem {
  caption: string
  key: number
  classname?: string
}
const original: ListItem = {
  caption: tt.original(),
  key: 0,
}
const translation: ListItem = {
  caption: tt.trans(),
  key: 1,
  classname: 'translation',
}
const romanization: ListItem = {
  caption: tt.roman(),
  key: 2,
  classname: 'romanization',
}
const listItems = ref<ListItem[]>(
  [
    original,
    props.transEnabled ? translation : null,
    props.romanEnabled ? romanization : null,
  ].filter((i) => i !== null),
)
const originalOrder = computed<number | undefined>(() => {
  const index = listItems.value.findIndex((item) => item.key === original.key)
  return index === -1 ? undefined : index
})
const translationOrder = computed<number | undefined>(() => {
  const index = listItems.value.findIndex((item) => item.key === translation.key)
  return index === -1 ? undefined : index
})
const romanizationOrder = computed<number | undefined>(() => {
  const index = listItems.value.findIndex((item) => item.key === romanization.key)
  return index === -1 ? undefined : index
})

watch(
  () => props.romanEnabled,
  (enabled) => {
    if (enabled && romanizationOrder.value === undefined) listItems.value.push(romanization)
    else if (!enabled && romanizationOrder.value !== undefined) {
      const index = listItems.value.findIndex((i) => i.key === romanization.key)
      listItems.value.splice(index, 1)
    }
  },
)
watch(
  () => props.transEnabled,
  (enabled) => {
    if (enabled && translationOrder.value === undefined) listItems.value.push(translation)
    else if (!enabled && translationOrder.value !== undefined) {
      const index = listItems.value.findIndex((i) => i.key === translation.key)
      listItems.value.splice(index, 1)
    }
  },
)

const emptyLineCountModel = ref<number | undefined>(0)
const emptyLineCount = computed(() => emptyLineCountModel.value ?? 0)
const cycleLength = computed(() => listItems.value.length + emptyLineCount.value)

defineExpose({
  /** 原文行 Index */
  originalOrder,
  /** 翻译行 Index */
  translationOrder,
  /** 音译行 Index */
  romanizationOrder,
  /** 循环节内空行数 */
  emptyLineCount,
  /** 循环节总行数 */
  cycleLength,
})
</script>

<style lang="scss">
.line-order-input {
  min-width: 10rem;
  background-color: var(--p-form-field-background);
  border: 1px solid var(--p-form-field-border-color);
  border-radius: var(--p-form-field-border-radius);
  padding: 0.3rem;
  overflow-y: auto;
}
.line-order-input-state-info {
  opacity: 0.9;
  margin-left: 0.1rem;
  .title {
    font-weight: bold;
  }
  .count {
    font-size: 0.9rem;
  }
}
.line-order-item {
  padding: 0.5rem;
  cursor: move;
  border-radius: var(--p-form-field-border-radius);
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  --hover-bg-color: var(--p-button-secondary-hover-background);
  &.translation {
    color: var(--p-button-text-help-color);
    --hover-bg-color: var(--p-button-text-help-active-background);
  }
  &.romanization {
    color: var(--p-button-text-info-color);
    --hover-bg-color: var(--p-button-text-info-active-background);
  }
  &:hover {
    background-color: var(--hover-bg-color);
  }
  .line-order-input:has(.sortable-chosen) & {
    background-color: transparent;
  }
  .line-order-item-icon {
    opacity: 0.6;
    font-size: 0.85em;
  }
}

.line-order-hr {
  margin: 0.5rem 0;
}
.line-order-empty-line {
  padding: 0 0.5rem;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  .line-order-empty-line-input {
    font-family: var(--font-monospace);
    width: auto;
    .p-inputtext {
      width: 2ch;
      box-sizing: content-box;
    }
  }
}
</style>
