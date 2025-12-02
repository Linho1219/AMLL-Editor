<template>
  <Dialog
    class="thin-padding"
    v-model:visible="visible"
    header="查找替换"
    @focusin="handleTopFocus"
  >
    <div class="findreplace-content" v-focustrap>
      <div class="findreplace-mode">
        <div class="findreplace-radios">
          <div class="findreplace-radio-item">
            <RadioButton
              v-model="showReplace"
              inputId="findMode"
              name="findReplaceMode"
              :value="false"
            />
            <label for="findMode" class="findreplace-radio-label">查找</label>
          </div>
          <div class="findreplace-radio-item">
            <RadioButton
              v-model="showReplace"
              inputId="replaceMode"
              name="findReplaceMode"
              :value="true"
            />
            <label for="replaceMode" class="findreplace-radio-label">替换</label>
          </div>
        </div>
        <div class="findreplace-options-toggle">
          <label
            for="findShowOptions"
            class="findreplace-options-toggle-label"
            :class="{ enabled: showOptions }"
          >
            更多选项
          </label>
          <ToggleSwitch v-model="showOptions" inputId="findShowOptions" />
        </div>
      </div>
      <div class="findreplace-inputs">
        <div
          class="findreplace-find-input findreplace-input"
          :class="{ showformatbtn: showOptions, regex: useRegex }"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="() => handleDrop('find')"
        >
          <IftaLabel>
            <InputText
              id="findInput"
              v-model.escapeEnter="findInput"
              fluid
              :invalid="findInputInvalid"
              ref="findInputComponent"
              @keydown="handleFindInputKeydown"
            />
            <label for="findInput">查找内容</label>
          </IftaLabel>
          <!-- <Button
            v-if="showOptions"
            icon="pi pi-hammer"
            size="small"
            severity="secondary"
            v-tooltip="'设置查找目标属性'"
            class="findreplace-format-btn"
          /> -->
        </div>
        <div
          class="findreplace-replace-input findreplace-input"
          :class="{ showformatbtn: showOptions, regex: useRegex }"
          v-if="showReplace"
          @dragenter="handleDragEnter"
          @dragleave="handleDragLeave"
          @dragover="handleDragOver"
          @drop="() => handleDrop('replace')"
        >
          <IftaLabel>
            <InputText
              id="replaceInput"
              v-model.escapeEnter="replaceInput"
              fluid
              ref="replaceInputComponent"
              @keydown="handleReplaceInputKeydown"
            />
            <label for="replaceInput">替换为</label>
          </IftaLabel>
          <!-- <Button
            v-if="showOptions"
            icon="pi pi-hammer"
            size="small"
            severity="secondary"
            v-tooltip="'设置替换属性'"
            class="findreplace-format-btn"
          /> -->
        </div>
      </div>
      <div class="findreplace-range">
        <div class="findreplace-range-title">匹配范围</div>
        <div class="findreplace-range-options">
          <div class="findreplace-range-option-item">
            <Checkbox v-model="findInWords" inputId="findInWords" binary />
            <label for="findInWords" class="findreplace-range-option-label">单词</label>
          </div>
          <div class="findreplace-range-option-item">
            <Checkbox v-model="findInTranslations" inputId="findInTranslations" binary />
            <label for="findInTranslations" class="findreplace-range-option-label">翻译</label>
          </div>
          <div class="findreplace-range-option-item">
            <Checkbox v-model="findInRoman" inputId="findInRoman" binary />
            <label for="findInRoman" class="findreplace-range-option-label">音译</label>
          </div>
        </div>
      </div>
      <div class="findreplace-options" v-if="showOptions">
        <div class="findreplace-options-title">匹配选项</div>
        <div class="findreplace-options-list">
          <div class="findreplace-option-item">
            <Checkbox v-model="matchCase" inputId="matchCase" binary />
            <label for="matchCase" class="findreplace-option-label">区分大小写</label>
          </div>
          <div class="findreplace-option-item">
            <Checkbox v-model="matchWholeWord" inputId="matchWholeWord" binary />
            <label for="matchWholeWord" class="findreplace-option-label">全字匹配</label>
          </div>
          <div class="findreplace-option-item">
            <Checkbox v-model="matchFullField" inputId="matchFullField" binary />
            <label for="matchFullField" class="findreplace-option-label">整字段匹配</label>
          </div>
          <div class="findreplace-option-item">
            <Checkbox
              v-model="crossWordMatch"
              inputId="crossWordMatch"
              binary
              :disabled="showReplace"
            />
            <label for="crossWordMatch" class="findreplace-option-label">跨词匹配</label>
          </div>
          <div class="findreplace-option-item">
            <Checkbox v-model="useRegex" inputId="useRegex" binary />
            <label for="useRegex" class="findreplace-option-label">使用正则</label>
          </div>
          <div class="findreplace-option-item">
            <Checkbox v-model="wrapSearch" inputId="wrapSearch" binary />
            <label for="wrapSearch" class="findreplace-option-label">循环搜索</label>
          </div>
        </div>
      </div>
      <div class="findreplace-actions">
        <template v-if="showReplace">
          <Button
            icon="pi pi-reply"
            label="替换"
            severity="secondary"
            :disabled="actionDisabled"
            @click="handleReplace"
          />
          <Button
            icon="pi pi-angle-double-right"
            v-tooltip="'全部替换'"
            severity="secondary"
            :disabled="actionDisabled"
            @click="handleReplaceAll"
          />
          <div style="flex: 1"></div>
        </template>
        <Button
          icon="pi pi-arrow-up"
          v-tooltip="'查找上一项'"
          severity="secondary"
          :disabled="actionDisabled"
          @click="handleFindPrev"
        />
        <Button
          label="查找下一项"
          icon="pi pi-arrow-down"
          severity="secondary"
          :disabled="actionDisabled"
          @click="handleFindNext"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useRuntimeStore } from '@/stores/runtime'
import { Button, Checkbox, Dialog, IftaLabel, RadioButton, ToggleSwitch } from 'primevue'
import { computed, readonly, ref, useTemplateRef, watch } from 'vue'
import InputText from '../repack/InputText.vue'
import { useGlobalKeyboard } from '@/utils/hotkey'
import { tryRaf } from '@/utils/tryRaf'
import { useToast } from 'primevue/usetoast'
import type { TimeoutHandle } from '@/utils/types'
import { useFindReplaceEngine } from '@/utils/findReplace'
import { escapeRegExp } from 'lodash-es'
import { sortWords } from '@/utils/selection'

const [visible] = defineModel<boolean>({ required: true })

const runtimeStore = useRuntimeStore()
const toast = useToast()

const showReplace = ref(false)
const showOptions = ref(false)

const findInput = ref('')
const replaceInput = ref('')

const findInWords = ref(true)
const findInTranslations = ref(false)
const findInRoman = ref(false)

const matchCase = ref(false)
const matchWholeWord = ref(false)
const useRegex = ref(false)
const matchFullField = ref(false)
const crossWordMatch = ref(false)
const wrapSearch = ref(true)

const compiledPattern = computed<RegExp | null>(() => {
  if (findInput.value === '') return null
  let pattern = useRegex.value ? findInput.value : escapeRegExp(findInput.value)
  if (matchWholeWord.value) pattern = `\\b${pattern}\\b`
  if (matchFullField.value) pattern = `^${pattern}$`
  const flags = matchCase.value ? '' : 'i'
  try {
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
})
const findInputInvalid = computed(() => {
  if (useRegex.value && findInput.value !== '' && !compiledPattern.value) return true
  return false
})
const findRangeEmpty = computed(
  () => !findInWords.value && !findInTranslations.value && !findInRoman.value,
)
const actionDisabled = computed(() => findRangeEmpty.value || !compiledPattern.value)

watch(showOptions, (newVal) => {
  if (!newVal) {
    matchCase.value = false
    matchWholeWord.value = false
    useRegex.value = false
    wrapSearch.value = true
    matchFullField.value = false
  }
})
watch(showReplace, (newVal) => {
  if (newVal) crossWordMatch.value = false
})

const { handleFindNext, handleFindPrev, handleReplace, handleReplaceAll } = useFindReplaceEngine(
  readonly({
    compiledPattern,
    replaceInput,
    findInWords,
    findInTranslations,
    findInRoman,
    crossWordMatch,
    wrapSearch,
  }),
  (n) => {
    toast.add({
      ...n,
      life: 3000,
    })
  },
)

//#region Keyboard Shortcuts
useGlobalKeyboard('find', () => {
  if (visible.value && !showReplace.value) {
    visible.value = false
  } else {
    if (!visible.value) visible.value = true
    else focusFindInput()
    showReplace.value = false
  }
})
useGlobalKeyboard('replace', () => {
  if (visible.value && showReplace.value) {
    visible.value = false
  } else {
    if (!visible.value) visible.value = true
    else focusFindInput()
    showReplace.value = true
  }
})
function handleFindInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleFindNext()
  } else if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    handleFindPrev()
  }
}
function handleReplaceInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleReplace()
  }
}
//#endregion

//#region Focus Management
const focusFindInput = () => {
  tryRaf(() => {
    const inputEl = findInputComponent.value?.input
    if (!inputEl) return
    inputEl.focus()
    inputEl.select()
    return true
  })
}
// WORKAROUND:
// PrimeVue automatically focus close button after open animation ends
// So wait after that to focus our input
// Ideal waiting time should be 200ms
const openingPendingMaxTimeout = 1000
let openingPending: undefined | TimeoutHandle = undefined
watch(visible, (newVal) => {
  if (newVal)
    openingPending = setTimeout(() => {
      openingPending = undefined
      console.warn('FindReplaceDialog opening pending timeout reached')
      focusFindInput()
    }, openingPendingMaxTimeout)
})
function handleTopFocus(e: FocusEvent) {
  if (!openingPending) return
  clearTimeout(openingPending)
  openingPending = undefined
  if ((e.target as HTMLElement).classList.contains('p-dialog-close-button')) {
    focusFindInput()
  }
}
//#endregion

//#region Word Drag & Drop
const findInputComponent = useTemplateRef('findInputComponent')
const replaceInputComponent = useTemplateRef('replaceInputComponent')
let dragCounter = 0
function handleDragEnter() {
  dragCounter++
}
function handleDragOver(e: DragEvent) {
  if (crossWordMatch.value) {
    if (!runtimeStore.isDragging) return
  } else {
    if (!runtimeStore.isDraggingWord || runtimeStore.selectedWords.size !== 1) return
  }
  e.preventDefault()
  runtimeStore.canDrop = true
  runtimeStore.isDraggingCopy = true
}
function handleDragLeave() {
  dragCounter--
  if (dragCounter > 0) return
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
}
function handleDrop(where: 'find' | 'replace') {
  dragCounter = 0
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
  let text = ''
  if (crossWordMatch.value) {
    if (!runtimeStore.isDragging) return
    if (runtimeStore.isDraggingLine)
      text = runtimeStore
        .getFirstSelectedLine()!
        .words.map((w) => w.text)
        .join('')
        .trim()
    else
      text = sortWords(...runtimeStore.selectedWords)
        .map((w) => w.text)
        .join('')
        .trim()
  } else {
    if (!runtimeStore.isDraggingWord || runtimeStore.selectedWords.size !== 1) return
    text = (runtimeStore.getFirstSelectedWord()?.text || '').trim()
  }
  if (!text.length) return
  if (where === 'find') findInput.value = useRegex.value ? escapeRegExp(text) : text
  else replaceInput.value = text

  requestAnimationFrame(() => {
    const inputEl = (where === 'find' ? findInputComponent : replaceInputComponent).value?.input
    if (!inputEl) return
    inputEl.focus()
    inputEl.setSelectionRange(0, text.length)
  })
}
//#endregion
</script>

<style lang="scss">
.findreplace-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 22rem;
  margin-top: 0.3rem;
}
.findreplace-mode {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.findreplace-radios {
  display: flex;
  gap: 1.5rem;
}
.findreplace-radio-item {
  display: flex;
  align-items: center;
}
.findreplace-radio-label {
  padding-left: 0.5rem;
}
.findreplace-options-toggle {
  display: flex;
  align-items: center;
}
.findreplace-options-toggle-label {
  padding-right: 0.5rem;
  opacity: 0.7;
  font-size: 0.9rem;
  transition: opacity 0.2s;
  &.enabled {
    opacity: 1;
  }
}
.findreplace-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.findreplace-input {
  position: relative;
  &.showformatbtn {
    --p-inputtext-padding-x: 0.75rem 3rem;
  }
  &.regex .p-inputtext {
    font-family: var(--font-monospace);
    &::placeholder {
      font-family: var(--font-main);
    }
  }
}
// .findreplace-format-btn {
//   position: absolute !important;
//   bottom: 0.5rem;
//   right: 0.5rem;
// }
.findreplace-range,
.findreplace-options {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}
.findreplace-range-title,
.findreplace-options-title {
  font-weight: bold;
  flex-shrink: 0;
}
.findreplace-range-options {
  display: flex;
  gap: 1.2rem;
  align-items: center;
}
.findreplace-range-option-item {
  display: flex;
  align-items: center;
}
.findreplace-range-option-label {
  padding-left: 0.5rem;
}
.findreplace-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.findreplace-options-list {
  display: grid;
  row-gap: 0.4rem;
  column-gap: 1.5rem;
  grid-template-columns: auto auto;
}
.findreplace-option-item {
  display: flex;
  align-items: center;
}
.findreplace-option-label {
  padding-left: 0.5rem;
}
</style>
