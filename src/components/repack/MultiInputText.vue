<template>
  <ul class="r-multiinputtext" @mousedown="handleParentMouseDown">
    <li
      class="r-multiinputtext-item"
      v-for="(item, index) in internalList"
      :key="item.key"
      @mousedown.stop="
        (e) => {
          if (e.button !== 1) return
          internalList.splice(index, 1)
          triggerUpdate()
        }
      "
      @dblclick="
        () => {
          item.showInput = true
          focusItemInput(index)
        }
      "
      :class="{ inputshown: item.showInput }"
    >
      <div class="inner">
        <span class="text">{{ item.value }}</span>
        <InputText
          v-if="item.showInput"
          class="iteminput"
          :data-item-index="index"
          v-model.escapeEnter="item.value"
          @blur="
            () => {
              item.value ? (item.showInput = false) : internalList.splice(index, 1)
              triggerUpdate()
            }
          "
          unstyled
          autofocus
        />
      </div>
      <i
        class="pi pi-times delbtn"
        @click="
          () => {
            internalList.splice(index, 1)
            triggerUpdate()
          }
        "
      ></i>
    </li>
    <li class="r-multiinputtext-item r-multiinputtext-input-shell" @mousedown.stop>
      <span class="sizer">{{ inputText }}</span>
      <InputText
        class="input"
        ref="inputComponent"
        v-model.escapeEnter="inputText"
        @keydown="handleInputKeydown"
        @blur="handleInputBlur"
        unstyled
        escapeEnter
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { nanoid } from 'nanoid'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import InputText from './InputText.vue'
import { tryRaf } from '@/utils/tryRaf'

const [modelList] = defineModel<string[]>({ required: true })
interface InternalListItem {
  value: string
  key: string
  showInput: boolean
}
const internalList = ref<InternalListItem[]>([])
const computedList = computed(() => {
  return internalList.value.map((item) => item.value)
})

const areListSame = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

watch(
  modelList,
  (newVal) => {
    if (!newVal) newVal = []
    if (!areListSame(newVal, computedList.value))
      internalList.value = newVal.map((value) => ({
        value,
        key: nanoid(),
        showInput: false,
      }))
  },
  { immediate: true },
)
function triggerUpdate() {
  if (!areListSame(computedList.value, modelList.value)) modelList.value = computedList.value
}

const inputText = ref('')
const inputComponent = useTemplateRef('inputComponent')
function addItem(value: string) {
  internalList.value.push({
    value,
    key: nanoid(),
    showInput: false,
  })
}
function handleInputKeydown(event: KeyboardEvent) {
  if (['Enter', ',', ';'].includes(event.key)) {
    event.preventDefault()
    const inputValue = inputText.value.trim()
    if (inputValue.length === 0) return
    addItem(inputValue)
    inputText.value = ''
    triggerUpdate()
  } else if (event.key === 'Backspace' && inputText.value.length === 0) {
    event.preventDefault()
    if (internalList.value.length === 0) return
    const last = internalList.value.pop()
    inputText.value = last?.value || ''
    triggerUpdate()
  }
}
function handleInputBlur(event: FocusEvent) {
  const inputValue = inputText.value.trim()
  if (inputValue.length === 0) return
  addItem(inputValue)
  inputText.value = ''
  triggerUpdate()
}
function handleParentMouseDown(event: MouseEvent) {
  const inputEl = inputComponent.value?.input
  if (!inputEl) return
  if (document.activeElement === inputEl) {
    event.preventDefault()
    requestAnimationFrame(() =>
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length),
    )
  } else {
    requestAnimationFrame(() => {
      inputEl.focus()
      inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length)
    })
  }
}
function focusItemInput(index: number) {
  tryRaf(() => {
    const itemInput = document.querySelector(
      `.r-multiinputtext-item .iteminput[data-item-index="${index}"]`,
    ) as HTMLInputElement | null
    if (itemInput) {
      itemInput.focus()
      itemInput.setSelectionRange(0, itemInput.value.length)
      return true
    }
  })
}
</script>

<style lang="scss">
.r-multiinputtext {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 0.3rem;
  overflow-x: hidden;
  font-size: 1.1rem;

  background: var(--p-inputtext-background);
  padding: 0.35rem;
  border: 1px solid var(--p-inputtext-border-color);
  transition:
    background var(--p-inputtext-transition-duration),
    color var(--p-inputtext-transition-duration),
    border-color var(--p-inputtext-transition-duration),
    outline-color var(--p-inputtext-transition-duration),
    box-shadow var(--p-inputtext-transition-duration);
  appearance: none;
  border-radius: var(--p-inputtext-border-radius);
  outline-color: transparent;
  box-shadow: var(--p-inputtext-shadow);
  cursor: text;
  &:hover {
    border-color: var(--p-inputtext-hover-border-color);
  }
  &:focus-within {
    border-color: var(--p-inputtext-focus-border-color);
    box-shadow: var(--p-inputtext-focus-ring-shadow);
    outline: var(--p-inputtext-focus-ring-width) var(--p-inputtext-focus-ring-style)
      var(--p-inputtext-focus-ring-color);
    outline-offset: var(--p-inputtext-focus-ring-offset);
  }
}
.r-multiinputtext-item {
  cursor: default;
  list-style: none;
  padding: 0 0.5rem;
  background: var(--p-button-secondary-background);
  border-radius: 0.2rem;
  height: 1.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  .delbtn {
    font-size: 0.7rem;
    opacity: 0.6;
    cursor: pointer;
    &:hover {
      opacity: 0.9;
    }
    &:active {
      opacity: 0.4;
    }
  }
  &.inputshown {
    .text {
      visibility: hidden;
    }
  }
  .inner {
    position: relative;
    white-space: pre;
    min-width: 0.2rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .iteminput {
    position: absolute;
    appearance: none;
    border: none;
    outline: none;
    background: transparent;
    font-size: inherit;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 0;
  }
}
.r-multiinputtext-input-shell {
  position: relative;
  padding-left: 0.1rem;
  padding-right: 0.1rem;
  min-width: 0.5rem;
  background: transparent;
  .sizer {
    visibility: hidden;
    white-space: pre;
  }
  .input {
    position: absolute;
    appearance: none;
    border: none;
    outline: none;
    background: transparent;
    font-size: inherit;
    padding: 0 0.1rem;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>
