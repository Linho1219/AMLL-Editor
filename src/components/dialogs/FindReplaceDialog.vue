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
          @drop="handleDrop"
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
        >
          <IftaLabel>
            <InputText
              id="replaceInput"
              v-model.escapeEnter="replaceInput"
              fluid
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
import { useCoreStore } from '@/stores/core'
import { useRuntimeStore, View } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { Button, Checkbox, Dialog, IftaLabel, RadioButton, ToggleSwitch } from 'primevue'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'
import InputText from '../repack/InputText.vue'
import { useGlobalKeyboard } from '@/utils/hotkey'
import { usePreferenceStore } from '@/stores/preference'
import { tryRaf } from '@/utils/tryRaf'
import { useToast } from 'primevue/usetoast'

const [visible] = defineModel<boolean>({ required: true })
const focusFindInput = () => {
  tryRaf(() => {
    const inputEl = findInputComponent.value?.input
    if (!inputEl) return
    inputEl.focus()
    inputEl.select()
    return true
  })
}
// PrimeVue automatically focus close button after open animation ends
// So wait after that to focus our input
// Ideal waiting time should be 200ms
const openingPendingMaxTimeout = 1000
let openingPending: undefined | number = undefined
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

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()
const toast = useToast()

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
type Jumper = (pos: DocPos | null) => DocPos | null

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
  if (lineFieldKey)
    return {
      lineIndex,
      field: lineFieldKey,
    }
  return { lineIndex, field: 'word', wordIndex: -1 }
}
const currPos = shallowRef<DocPos | null>(null)
watch(
  [() => runtimeStore.selectedLines, () => runtimeStore.selectedWords],
  () => (currPos.value = getCurrPos()),
  { immediate: true },
)

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
    if (!swapTranslateRoman && field === 'translation') return 'roman'
    else if (swapTranslateRoman && field === 'roman') return 'translation'
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
  if (nextLineIndex >= coreStore.lyricLines.length) return null
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
    if (!swapTranslateRoman && field === 'roman') return 'translation'
    else if (swapTranslateRoman && field === 'translation') return 'roman'
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
  const currLine = coreStore.lyricLines[pos.lineIndex]!
  if (currLine.words.length)
    return {
      lineIndex: pos.lineIndex,
      field: 'word',
      wordIndex: currLine.words.length - 1,
    }
  const prevLineIndex = pos.lineIndex - 1
  if (prevLineIndex < 0) return null
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
function rangedJumpPos(
  fromPos: DocPos | null,
  jumper: Jumper,
  forceDisableWrap = false,
): DocPos | null {
  if (!fromPos) return jumper(null)
  let pos: DocPos | null = fromPos
  while (true) {
    const nextPos = jumper(pos)
    if (!nextPos) {
      if (wrapSearch.value && !forceDisableWrap) return jumper(null)
      return null
    }
    if (checkPosInRange(nextPos)) return nextPos
    pos = nextPos
  }
}
function focusPosInEditor(pos: DocPos) {
  let shouldSwitchToContent = false
  if (pos.field === 'word') {
    const line = coreStore.lyricLines[pos.lineIndex]!
    const word = line.words[pos.wordIndex]!
    runtimeStore.selectLineWord(line, word)
    if (!word.word.trim()) shouldSwitchToContent = true
    if (runtimeStore.isContentView || shouldSwitchToContent)
      tryRaf(() => {
        const hook = staticStore.wordHooks.get(word.id)
        if (!hook) return
        hook.hightLightInput()
        return true
      })
  } else if (pos.field === 'translation' || pos.field === 'roman') {
    shouldSwitchToContent = true
    const line = coreStore.lyricLines[pos.lineIndex]!
    runtimeStore.selectLine(line)
    tryRaf(() => {
      const hook = staticStore.lineHooks.get(line.id)
      if (!hook) return
      if (pos.field === 'translation') hook.hightLightTranslation()
      else hook.hightLightRoman()
      return true
    })
  }
  if (shouldSwitchToContent) {
    if (!runtimeStore.isContentView) runtimeStore.currentView = View.Content
    tryRaf(() => {
      if (!staticStore.editorHook || staticStore.editorHook.view !== View.Content) return
      staticStore.editorHook.scrollTo(pos.lineIndex, { align: 'nearest' })
      return true
    })
  } else
    tryRaf(() => {
      if (!staticStore.editorHook) return
      staticStore.editorHook.scrollTo(pos.lineIndex, { align: 'nearest' })
      return true
    })
}
function isPosMatch(pos: DocPos, pattern: RegExp): boolean {
  const line = coreStore.lyricLines[pos.lineIndex]!
  let textToMatch = ''
  if (pos.field === 'word') {
    if (pos.wordIndex < 0) return false
    const word = line.words[pos.wordIndex]!
    textToMatch = word.word
  } else if (pos.field === 'translation') {
    textToMatch = line.translation
  } else if (pos.field === 'roman') {
    textToMatch = line.romanization
  }
  const result = textToMatch.search(pattern) !== -1
  return result
}
function replacePosText(pos: DocPos, pattern: RegExp, replaceText: string) {
  const line = coreStore.lyricLines[pos.lineIndex]!
  let changed = false
  if (pos.field === 'word' && findInWords.value) {
    const word = line.words[pos.wordIndex]!
    const replaced = word.word.replace(pattern, replaceText)
    changed = word.word !== replaced
    word.word = replaced
  } else if (pos.field === 'translation' && findInTranslations.value) {
    const replaced = line.translation.replace(pattern, replaceText)
    changed = line.translation !== replaced
    line.translation = replaced
  } else if (pos.field === 'roman' && findInRoman.value) {
    const replaced = line.romanization.replace(pattern, replaceText)
    changed = line.romanization !== replaced
    line.romanization = replaced
  }
  return changed
}
function arePosEqual(a: DocPos | null, b: DocPos | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  if (a.lineIndex !== b.lineIndex) return false
  if (a.field !== b.field) return false
  if (a.field === 'word' && b.field === 'word' && a.wordIndex !== b.wordIndex) return false
  return true
}
function handleFind(jumper: Jumper, noAlert = false) {
  const startingPos = currPos.value ? rangedJumpPos(currPos.value, jumper) : getFirstPos()
  const pattern = compiledPattern.value
  let firstFlag = true
  if (!pattern) return
  for (
    let pos = startingPos;
    pos && (firstFlag || !arePosEqual(pos, startingPos)); // avoid infinite loop when no match
    pos = rangedJumpPos(pos, jumper)
  ) {
    firstFlag = false
    if (!isPosMatch(pos, pattern)) continue
    focusPosInEditor(pos)
    currPos.value = pos
    return
  }
  runtimeStore.clearSelection()
  if (!noAlert)
    toast.add({
      severity: 'warn',
      summary: '找不到结果',
      detail: wrapSearch.value
        ? '全文搜索完毕，未找到匹配项。'
        : '已到达文档末端，无匹配项。\n启用循环搜索可从头开始继续搜索。',
      life: 3000,
    })
}
function handleFindNext() {
  handleFind(getNextPos)
}
function handleFindPrev() {
  handleFind(getPrevPos)
}
function handleReplace() {
  const pattern = compiledPattern.value
  const replacement = replaceInput.value
  if (!pattern) return
  if (currPos.value && isPosMatch(currPos.value, pattern)) {
    replacePosText(currPos.value, pattern, replacement)
    handleFind(getNextPos, true)
  } else handleFind(getNextPos)
}
function handleReplaceAll() {
  const pattern = compiledPattern.value
  let counter = 0
  if (!pattern) return
  for (let pos = getFirstPos(); pos; pos = rangedJumpPos(pos, getNextPos, true)) {
    if (!isPosMatch(pos, pattern)) continue
    counter += replacePosText(pos, pattern, replaceInput.value) ? 1 : 0
  }
  if (counter)
    toast.add({
      severity: 'info',
      summary: '全部替换完成',
      detail: `共替换了 ${counter} 个匹配项。`,
      life: 3000,
    })
  else
    toast.add({
      severity: 'warn',
      summary: '找不到结果',
      detail: '全文搜索完毕，未找到匹配项。',
      life: 3000,
    })
}
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
