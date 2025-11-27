<template>
  <Dialog class="thin-padding" v-model:visible="visible" header="查找替换">
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
          @drop="handleDrop"
        >
          <IftaLabel>
            <InputText
              id="findInput"
              v-model="findInput"
              fluid
              :placeholder="showOptions ? '留空仅匹配属性' : undefined"
              :invalid="findInputInvalid"
              ref="findInputComponent"
            />
            <label for="findInput">查找内容</label>
          </IftaLabel>
          <Button
            v-if="showOptions"
            icon="pi pi-hammer"
            size="small"
            severity="secondary"
            v-tooltip="'设置查找目标属性'"
            class="findreplace-format-btn"
          />
        </div>
        <div
          class="findreplace-replace-input findreplace-input"
          :class="{ showformatbtn: showOptions, regex: useRegex }"
          v-if="showReplace"
        >
          <IftaLabel>
            <InputText
              id="replaceInput"
              v-model="replaceInput"
              fluid
              :placeholder="showOptions ? '留空仅替换属性' : undefined"
            />
            <label for="replaceInput">替换为</label>
          </IftaLabel>
          <Button
            v-if="showOptions"
            icon="pi pi-hammer"
            size="small"
            severity="secondary"
            v-tooltip="'设置替换属性'"
            class="findreplace-format-btn"
          />
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
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import {
  Button,
  Checkbox,
  Dialog,
  IftaLabel,
  InputNumber,
  RadioButton,
  ToggleSwitch,
} from 'primevue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import InputText from '../repack/InputText.vue'
import { useGlobalKeyboard } from '@/utils/hotkey'
import { usePreferenceStore } from '@/stores/preference'

const [visible] = defineModel<boolean>({ required: true })

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()

const showReplace = ref(false)
const showOptions = ref(false)

const findInput = ref('')
const replaceInput = ref('')

const findInWords = ref(true)
const findInTranslations = ref(false)
const findInRoman = ref(false)
const findRangeEmpty = computed(
  () => !findInWords.value && !findInTranslations.value && !findInRoman.value,
)
const actionDisabled = computed(() => findRangeEmpty.value || !compiledPattern.value)

const matchCase = ref(false)
const matchWholeWord = ref(false)
const useRegex = ref(false)
const matchFullField = ref(false)
const wrapSearch = ref(true)

watch(showOptions, (newVal) => {
  if (!newVal) {
    matchCase.value = false
    matchWholeWord.value = false
    useRegex.value = false
    wrapSearch.value = true
    matchFullField.value = false
  }
})

function handleFindNext() {}
function handleFindPrev() {}
function handleReplace() {}
function handleReplaceAll() {}

useGlobalKeyboard('find', () => {
  if (visible.value && !showReplace.value) {
    visible.value = false
  } else {
    visible.value = true
    showReplace.value = false
  }
})
useGlobalKeyboard('replace', () => {
  if (visible.value && showReplace.value) {
    visible.value = false
  } else {
    visible.value = true
    showReplace.value = true
  }
})

const findInputComponent = useTemplateRef('findInputComponent')
let dragCounter = 0
function handleDragEnter() {
  dragCounter++
}
function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDraggingWord || runtimeStore.selectedWords.size !== 1) return
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
function handleDrop() {
  dragCounter = 0
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
  const text = (runtimeStore.getFirstSelectedWord()?.word || '').trim()
  if (!text.length) return
  if (useRegex.value) {
    findInput.value = escapeRegex(text)
  } else {
    findInput.value = text
  }
  requestAnimationFrame(() => {
    const inputEl = findInputComponent.value?.input
    if (!inputEl) return
    inputEl.focus()
    inputEl.setSelectionRange(0, text.length)
  })
}

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function compileRegexPattern(input: string): RegExp | null {
  let pattern = useRegex.value ? input : escapeRegex(input)
  if (matchWholeWord.value) pattern = `\\b${pattern}\\b`
  if (matchFullField.value) pattern = `^${pattern}$`
  const flags = matchCase.value ? 'g' : 'gi'
  try {
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
}
const compiledPattern = computed<RegExp | null>(() => {
  if (findInput.value === '') return null
  return compileRegexPattern(findInput.value)
})
const findInputInvalid = computed(() => {
  if (useRegex.value && findInput.value !== '' && !compiledPattern.value) return true
  return false
})

type DocPos = {
  lineIndex: number
} & (
  | {
      field: 'translation' | 'roman'
    }
  | {
      field: 'word'
      wordIndex: number
    }
)
function getCurrPos(): DocPos | null {
  const currLine = runtimeStore.getFirstSelectedLine()
  if (!currLine) return null
  const lineIndex = coreStore.lyricLines.indexOf(currLine)
  const currWord = runtimeStore.getFirstSelectedWord()
  if (currWord) {
    const wordIndex = currLine.words.indexOf(currWord)
    return {
      lineIndex,
      field: 'word',
      wordIndex,
    }
  }
  const focusedEl = document.activeElement as HTMLElement | null
  if (!focusedEl) return null
  const lineFieldKey = focusedEl.dataset.lineFieldKey as 'translation' | 'roman' | undefined
  if (!lineFieldKey) return null
  return {
    lineIndex,
    field: lineFieldKey,
  }
}
const preferenceStore = usePreferenceStore()
const getFirstPos = () => getNextPos({ lineIndex: 0, field: 'word', wordIndex: -1 })
function getNextPos(nullablePos: DocPos | null): DocPos | null {
  if (!nullablePos) return getFirstPos()
  const pos = nullablePos
  if (!coreStore.lyricLines.length) return null
  const { swapTranslateRoman } = preferenceStore
  // true:  word -> translation -> roman
  // false: word -> roman -> translation
  const firstField = swapTranslateRoman ? 'roman' : 'translation'
  function nextField(field: 'translation' | 'roman'): 'translation' | 'roman' | undefined {
    if (!swapTranslateRoman && field === 'roman') return 'translation'
    else if (swapTranslateRoman && field === 'translation') return 'roman'
  }
  const currLine = coreStore.lyricLines[pos.lineIndex]!
  if (pos.field === 'word') {
    const nextWordIndex = pos.wordIndex + 1
    if (nextWordIndex < currLine.words.length)
      return {
        lineIndex: pos.lineIndex,
        field: 'word',
        wordIndex: nextWordIndex,
      }
    else
      return {
        lineIndex: pos.lineIndex,
        field: firstField,
      }
  }
  const nextFieldKey = nextField(pos.field)
  if (nextFieldKey)
    return {
      lineIndex: pos.lineIndex,
      field: nextFieldKey,
    }
  const nextLineIndex = pos.lineIndex + 1
  if (nextLineIndex < coreStore.lyricLines.length) return null
  if (coreStore.lyricLines[nextLineIndex]!.words.length)
    return {
      lineIndex: nextLineIndex,
      field: 'word',
      wordIndex: 0,
    }
  return {
    lineIndex: nextLineIndex,
    field: firstField,
  }
}
function getPrevPos(nullablePos: DocPos | null): DocPos | null {
  if (!nullablePos) return getLastPos()
  const pos = nullablePos
  if (!coreStore.lyricLines.length) return null
  const { swapTranslateRoman } = preferenceStore
  // true:  word -> translation -> roman
  // false: word -> roman -> translation
  const lastField = swapTranslateRoman ? 'translation' : 'roman'
  function prevField(field: 'translation' | 'roman'): 'translation' | 'roman' | undefined {
    if (!swapTranslateRoman && field === 'translation') return 'roman'
    else if (swapTranslateRoman && field === 'roman') return 'translation'
  }
  if (pos.field === 'word') {
    const prevWordIndex = pos.wordIndex - 1
    if (prevWordIndex >= 0)
      return {
        lineIndex: pos.lineIndex,
        field: 'word',
        wordIndex: prevWordIndex,
      }
    else {
      const lastLineIndex = pos.lineIndex - 1
      if (lastLineIndex < 0) return null
      return {
        lineIndex: lastLineIndex,
        field: lastField,
      }
    }
  }
  const prevFieldKey = prevField(pos.field)
  if (prevFieldKey)
    return {
      lineIndex: pos.lineIndex,
      field: prevFieldKey,
    }
  const prevLineIndex = pos.lineIndex - 1
  if (prevLineIndex < 0) return null
  const prevLine = coreStore.lyricLines[prevLineIndex]!
  if (prevLine.words.length)
    return {
      lineIndex: prevLineIndex,
      field: 'word',
      wordIndex: prevLine.words.length - 1,
    }
  return {
    lineIndex: prevLineIndex,
    field: lastField,
  }
}
function getLastPos(): DocPos | null {
  if (!coreStore.lyricLines.length) return null
  const lastLineIndex = coreStore.lyricLines.length - 1
  return {
    lineIndex: lastLineIndex,
    field: preferenceStore.swapTranslateRoman ? 'translation' : 'roman',
  }
}
function checkPosInRange(pos: DocPos): boolean {
  if (pos.field === 'word' && !findInWords.value) return false
  if (pos.field === 'translation' && !findInTranslations.value) return false
  if (pos.field === 'roman' && !findInRoman.value) return false
  return true
}
function rangedJumpPos(fromPos: DocPos | null, jumper: (pos: DocPos | null) => DocPos | null) {
  if (!fromPos) return jumper(null)
  let pos: DocPos | null = fromPos
  while (true) {
    const nextPos = jumper(pos)
    if (!nextPos) {
      if (wrapSearch.value) return jumper(null)
      return null
    }
    if (checkPosInRange(nextPos)) return nextPos
    pos = nextPos
  }
}
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
.findreplace-format-btn {
  position: absolute !important;
  bottom: 0.5rem;
  right: 0.5rem;
}
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
  display: flex;
  row-gap: 0.4rem;
  column-gap: 1.5rem;
  flex-wrap: wrap;
}
.findreplace-option-item {
  display: flex;
  align-items: center;
}
.findreplace-option-label {
  padding-left: 0.5rem;
}
</style>
