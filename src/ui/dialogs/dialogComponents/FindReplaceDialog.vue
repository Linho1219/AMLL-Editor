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
          @drop.prevent="() => handleDrop('find')"
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
        </div>
        <AnimatedFold :folded="!showReplace">
          <div
            class="findreplace-replace-input findreplace-input"
            :class="{ showformatbtn: showOptions, regex: useRegex }"
            @dragenter="handleDragEnter"
            @dragleave="handleDragLeave"
            @dragover="handleDragOver"
            @drop.prevent="() => handleDrop('replace')"
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
          </div>
        </AnimatedFold>
      </div>
      <div class="findreplace-params">
        <div class="findreplace-range">
          <div class="findreplace-range-title">匹配范围</div>
          <div class="findreplace-range-options" :class="{ 'two-cols': prefStore.sylRomanEnabled }">
            <div class="findreplace-range-option-item">
              <Checkbox v-model="findInSyls" inputId="findInWords" binary />
              <label for="findInWords" class="findreplace-range-option-label">音节内容</label>
            </div>
            <div class="findreplace-range-option-item" v-if="prefStore.sylRomanEnabled">
              <Checkbox v-model="findInSylRomanModel" inputId="findInSylRoman" binary />
              <label for="findInSylRoman" class="findreplace-range-option-label">音节音译</label>
            </div>
            <div class="findreplace-range-option-item">
              <Checkbox v-model="findInTranslations" inputId="findInTranslations" binary />
              <label for="findInTranslations" class="findreplace-range-option-label">翻译</label>
            </div>
            <div class="findreplace-range-option-item">
              <Checkbox v-model="findInRoman" inputId="findInRoman" binary />
              <label for="findInRoman" class="findreplace-range-option-label">{{
                prefStore.sylRomanEnabled ? '行音译' : '音译'
              }}</label>
            </div>
          </div>
        </div>
        <AnimatedFold :folded="!showOptions">
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
                <label for="crossWordMatch" class="findreplace-option-label">跨音节匹配</label>
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
        </AnimatedFold>
      </div>

      <div class="findreplace-actions">
        <Transition name="fade">
          <div class="replace-actions" v-if="showReplace">
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
          </div>
        </Transition>
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
import { escapeRegExp } from 'lodash-es'
import { computed, readonly, ref, useTemplateRef, watch } from 'vue'

import { useFindReplaceEngine } from '@core/findReplace'
import { useGlobalKeyboard } from '@core/hotkey'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import { isInputEl } from '@utils/isInputEl'
import { sortSyllables } from '@utils/sortLineSyls'
import { tryRaf } from '@utils/tryRaf'
import type { TimeoutHandle } from '@utils/types'

import AnimatedFold from '@ui/components/AnimatedFold.vue'
import InputText from '@ui/components/InputText.vue'
import { Button, Checkbox, Dialog, IftaLabel, RadioButton, ToggleSwitch } from 'primevue'
import { useToast } from 'primevue/usetoast'

const [visible] = defineModel<boolean>({ required: true })

const runtimeStore = useRuntimeStore()
const prefStore = usePrefStore()
const toast = useToast()

const showReplace = ref(false)
const showOptions = ref(false)

const findInput = ref('')
const replaceInput = ref('')

const findInSyls = ref(true)
const findInSylRomanModel = ref(false)
const findInTranslations = ref(false)
const findInRoman = ref(false)
const findInSylRoman = computed(() => prefStore.sylRomanEnabled && findInSylRomanModel.value)

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
  () => !findInSyls.value && !findInTranslations.value && !findInRoman.value,
)
const actionDisabled = computed(() => findRangeEmpty.value || !compiledPattern.value)

watch(showOptions, (newVal) => {
  if (!newVal) {
    matchCase.value = false
    matchWholeWord.value = false
    useRegex.value = false
    wrapSearch.value = true
    matchFullField.value = false
    crossWordMatch.value = false
  }
})
watch(showReplace, (newVal) => {
  if (newVal) crossWordMatch.value = false
})

const { handleFindNext, handleFindPrev, handleReplace, handleReplaceAll } = useFindReplaceEngine(
  readonly({
    compiledPattern,
    replaceInput,
    findInSyls,
    findInSylRoman,
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
  applyCurrentToFind()
  if (!visible.value) visible.value = true
  else focusFindInput()
  showReplace.value = false
})
useGlobalKeyboard('replace', () => {
  applyCurrentToFind()
  if (!visible.value) visible.value = true
  else focusFindInput()
  showReplace.value = true
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

function enableCrossMatch() {
  showOptions.value = true
  crossWordMatch.value = true
  matchFullField.value = false
}
function disableCrossMatch() {
  crossWordMatch.value = false
}
const escapeRegOnUsing = (text: string) => (useRegex.value ? escapeRegExp(text) : text)
function applyCurrentToFind() {
  const nativeSel = window.getSelection()?.toString()
  const activeEl = document.activeElement as HTMLElement | null
  let inputSel = nativeSel
  if (
    activeEl &&
    isInputEl(activeEl) &&
    activeEl !== findInputComponent.value?.input &&
    activeEl !== replaceInputComponent.value?.input
  ) {
    if (activeEl)
      if (activeEl.dataset.syllableField !== undefined) {
        findInSyls.value = true
        disableCrossMatch()
        inputSel ||= (activeEl as HTMLInputElement).value
      } else if (activeEl.dataset.syllableRomanField !== undefined) {
        findInSylRomanModel.value = true
        disableCrossMatch()
        inputSel ||= (activeEl as HTMLInputElement).value
      } else if (activeEl.dataset.lineFieldKey === 'translation') {
        findInTranslations.value = true
        inputSel ||= (activeEl as HTMLInputElement).value
      } else if (activeEl.dataset.lineFieldKey === 'roman') {
        findInRoman.value = true
        inputSel ||= (activeEl as HTMLInputElement).value
      }
    inputSel = inputSel?.trim()
    console.log('applyCurrentToFind', { nativeSel, inputSel, activeEl })
    if (inputSel) {
      const escapedSel = escapeRegOnUsing(inputSel)
      findInput.value = escapedSel
      return
    }
  }

  const sel = extractSylText()
  if (sel) {
    disableCrossMatch()
    findInSyls.value = true
    findInput.value = escapeRegOnUsing(sel)
    return
  }
  if (showReplace.value) return
  const crossSel = extractSylText(true) || extractLineText(true)
  if (crossSel) {
    enableCrossMatch()
    findInSyls.value = true
    findInput.value = escapeRegOnUsing(crossSel)
    return
  }
}
function extractSylText(crossWordMatch: boolean = false): string | undefined {
  if (crossWordMatch)
    return sortSyllables(...runtimeStore.selectedSyllables)
      .map((s) => s.text)
      .join('')
      .trim()
  if (runtimeStore.selectedSyllables.size !== 1) return
  return runtimeStore.getFirstSelectedSyl()?.text.trim()
}
function extractLineText(crossWordMatch: boolean = false): string | undefined {
  if (!crossWordMatch) return
  if (runtimeStore.selectedLines.size !== 1) return
  return runtimeStore
    .getFirstSelectedLine()!
    .syllables.map((s) => s.text)
    .join('')
    .trim()
}
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
  if (!runtimeStore.isDragging) return
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
function extractDropText() {
  if (runtimeStore.isDraggingLine) return { text: extractLineText(true), cross: true }
  if (runtimeStore.selectedSyllables.size > 1) return { text: extractSylText(true), cross: true }
  return { text: extractSylText(), cross: false }
}
function handleDrop(where: 'find' | 'replace') {
  dragCounter = 0
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
  const { text, cross } = extractDropText()
  if (!text) return
  findInSyls.value = true
  const escapedText = escapeRegOnUsing(text)
  findInSyls.value = true
  if (where === 'find') findInput.value = escapedText
  else replaceInput.value = text
  if (cross) enableCrossMatch()
  else disableCrossMatch()
  const inputComponent = where === 'find' ? findInputComponent : replaceInputComponent
  tryRaf(() => {
    const inputEl = inputComponent.value?.input
    if (!inputEl) return
    inputEl.select()
    return true
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
}
.findreplace-input {
  position: relative;
  // &.showformatbtn {
  //   --p-inputtext-padding-x: 0.75rem 3rem;
  // }
  &.regex .p-inputtext {
    font-family: var(--font-monospace);
    &::placeholder {
      font-family: var(--font-main);
    }
  }
}
.findreplace-replace-input {
  margin-top: 0.5rem;
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
.findreplace-options {
  margin-top: 0.5rem;
}
.findreplace-range-title,
.findreplace-options-title {
  font-weight: bold;
  flex-shrink: 0;
}
.findreplace-range-options {
  display: grid;
  row-gap: 0.4rem;
  column-gap: 1.2rem;
  align-items: center;
  grid-template-columns: auto auto auto;
  &.two-cols {
    grid-template-columns: auto auto;
  }
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
.replace-actions {
  width: 0;
  flex: 1;
  display: flex;
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
