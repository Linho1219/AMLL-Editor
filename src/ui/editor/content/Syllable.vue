<template>
  <div
    class="csyl"
    :class="{
      selected: isSelected,
      removing: isSelected && runtimeStore.isDragging && !runtimeStore.isDraggingCopy,
    }"
    @mousedown.stop
    @click.stop
    @dblclick.stop
    @contextmenu.stop="handleContext"
    @dragstart.stop
  >
    <div class="csyl-drag-ghost" ref="dragGhostEl"></div>
    <div
      class="csyl-head"
      draggable="true"
      @mousedown="handleMousedown"
      @click="handleClick"
      @dblclick="handleDbClick"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      &ZeroWidthSpace;
      <i v-if="props.syllable.bookmarked" class="csyl-head-bookmark pi pi-bookmark-fill"></i>
      <i v-else class="csyl-head-bars pi pi-bars"></i>
      <div v-if="props.syllable.placeholdingBeat" class="csyl-head-placeholding-beat">
        {{ props.syllable.placeholdingBeat }}
      </div>
    </div>
    <div class="csyl-input-shell" :class="{ focused }">
      <div class="csyl-input-widthcontrol csyl-input-alike">
        {{ widthController }}
      </div>
      <div class="csyl-input-placeholder csyl-input-alike">
        {{ placeholder }}
      </div>
      <InputText
        ref="sylInputComponent"
        class="csyl-input"
        v-model="inputModel"
        size="large"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @compositionend="hijackCompositionBackquote"
        @blur="flushInputModel"
        data-syllable-field
      />
    </div>
    <div class="csyl-roman-shell" v-if="prefStore.sylRomanEnabled">
      <div class="csyl-roman-widthcontrol csyl-roman-input-alike">
        {{ romanModel }}
      </div>
      <InputText
        ref="romanInputComponent"
        class="csyl-roman-input"
        size="small"
        v-model="romanModel"
        @keydown="handleRomanKeydown"
        @focus="handleFocus"
        @blur="flushRomanModel"
        @compositionend="hijackCompositionBackquote"
        data-syllable-roman-field
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useFocus } from '@vueuse/core'
import { type Ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'

import type { LyricLine, LyricSyllable } from '@core/types'

import { useCoreStore, usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'
import type { SylComponentActions } from '@states/stores/static'

import { forceOutsideBlur } from '@utils/forceOutsideBlur'
import { sortIndex } from '@utils/sortLineSyls'
import { toLazyModel } from '@utils/toLazyModel'
import { digit2Sup } from '@utils/toSupSub'
import type { Maybe, TimeoutHandle } from '@utils/types'

import InputText from '@ui/components/InputText.vue'

import { handleSylInputKeydown } from './syllableLogics/inputHotkeys'
import { handleSylRomanInputKeydown } from './syllableLogics/romanHotkeys'
import { type SyllableState, hijackCompositionBackquote } from './syllableLogics/shared'

const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const prefStore = usePrefStore()
const props = defineProps<{
  syllable: LyricSyllable
  index: number
  parent: LyricLine
  lineIndex: number
}>()

// Input Element
const inputComponent = useTemplateRef('sylInputComponent')
const inputEl = computed(() => inputComponent.value?.input)
const romanInputComponent = useTemplateRef('romanInputComponent')
const romanInputEl = computed(() => romanInputComponent.value?.input)
const { focused } = useFocus(inputEl)
const { focused: romanFocused } = useFocus(romanInputEl)

const [inputModel, flushInputModel] = toLazyModel(
  computed({
    get: () => props.syllable.text,
    set: (val: string) => (props.syllable.text = val),
  }),
  () => !focused.value,
)
const [romanModel, flushRomanModel] = toLazyModel(
  computed({
    get: () => props.syllable.romanization,
    set: (val: string) => (props.syllable.romanization = val),
  }),
  () => !romanFocused.value,
)

function handleDbClick() {
  inputEl.value?.select()
}

// Selection
const touch = () => {
  forceOutsideBlur()
  staticStore.touchLineWord(props.parent, props.syllable)
}
const isSelected = computed(() => runtimeStore.selectedSyllables.has(props.syllable))
let leftForClick = false
function handleMousedown(e: MouseEvent) {
  if (e.button > 2) return
  leftForClick = false
  if (e.ctrlKey || e.metaKey) {
    touch()
    if (!isSelected.value) {
      runtimeStore.addSylToSelection(props.syllable)
    } else leftForClick = true
  } else if (e.shiftKey && staticStore.lastTouchedSyl) {
    const { lastTouchedSyl: lastTouchedWord, lastTouchedLine } = staticStore
    touch()
    if (!lastTouchedLine || !lastTouchedWord) return
    if (lastTouchedLine !== props.parent) {
      const [start, end] = sortIndex(coreStore.lyricLines.indexOf(lastTouchedLine), props.lineIndex)
      runtimeStore.selectLine(...coreStore.lyricLines.slice(start, end + 1))
    } else {
      const [start, end] = sortIndex(
        lastTouchedLine.syllables.indexOf(lastTouchedWord),
        props.index,
      )
      const affectedWords = props.parent.syllables.slice(start, end + 1)
      if (isSelected.value) runtimeStore.removeSylFromSelection(...affectedWords)
      else runtimeStore.addSylToSelection(...affectedWords)
    }
  } else {
    if (isSelected.value) return
    touch()
    runtimeStore.selectLineSyl(props.parent, props.syllable)
  }
}
function handleClick(e: MouseEvent) {
  if (leftForClick && (e.ctrlKey || e.metaKey)) runtimeStore.removeSylFromSelection(props.syllable)
  leftForClick = false
}
function handleFocus() {
  if (isSelected.value && runtimeStore.selectedSyllables.size === 1) return
  touch()
  runtimeStore.selectLineSyl(props.parent, props.syllable)
}
const dragGhostEl = useTemplateRef('dragGhostEl')
function handleDragStart(e: DragEvent) {
  touch()
  runtimeStore.isDragging = true
  runtimeStore.canDrop = false
  if (!e.dataTransfer) return
  e.dataTransfer.setDragImage(dragGhostEl.value!, 0, 0)
  e.dataTransfer.effectAllowed = 'copyMove'
  if (e.ctrlKey || e.metaKey) {
    e.dataTransfer.dropEffect = 'copy'
    runtimeStore.isDraggingCopy = true
  } else {
    e.dataTransfer.dropEffect = 'move'
    runtimeStore.isDraggingCopy = false
  }
}
function handleDragEnd(_e: DragEvent) {
  runtimeStore.isDragging = false
  runtimeStore.isDraggingCopy = false
}

// Context menu
const emit = defineEmits<{
  (name: 'contextmenu', e: MouseEvent, lineIndex: number, sylIndex: number): void
}>()
function handleContext(e: MouseEvent) {
  handleFocus()
  emit('contextmenu', e, props.lineIndex, props.index)
}

// Placeholder and input width control
const placeholder = computed(() => {
  if (focused.value) return ''
  const sylText = inputModel.value
  if (!sylText) return '/'
  if (sylText.match(/^\s+$/)) {
    if (sylText.length === 1) return '␣'
    const upperCount = [...sylText.length.toString()].map(digit2Sup).join('')
    return `␣${upperCount}`
  }
  return ''
})
const widthController = computed(() => {
  const sylText = inputModel.value
  if (!sylText) return '/'
  if (sylText === ' ') return '␣'
  return placeholder.value || sylText
})

// Hotkeys
const makeState = (): SyllableState => ({
  index: props.index,
  lineIndex: props.lineIndex,
  parent: props.parent,
  syllable: props.syllable,
  inputEl: inputEl.value,
  romanInputEl: romanInputEl.value,
})
function handleKeydown(e: KeyboardEvent) {
  handleSylInputKeydown(e, makeState())
}
function handleRomanKeydown(e: KeyboardEvent) {
  handleSylRomanInputKeydown(e, makeState())
}

// Register hooks
let highlightTimeout: TimeoutHandle | undefined = undefined
function __focusGivenInput(
  focusRef: Ref<boolean>,
  elRef: Ref<Maybe<HTMLInputElement>>,
  position?: number,
) {
  focusRef.value = true
  if (!elRef.value) {
    console.warn('Input element not found')
    return
  }
  if (position === undefined || Number.isNaN(position)) elRef.value.select()
  else if (position < 0) {
    const length = elRef.value.value.length
    const cursor = length + position + 1
    elRef.value.setSelectionRange(cursor, cursor)
  } else elRef.value.setSelectionRange(position, position)
}
function __hightLightGivenInput(elRef: Ref<Maybe<HTMLInputElement>>) {
  if (!elRef.value) return
  document.querySelectorAll('.p-inputtext[data-highlight]').forEach((el) => {
    delete (el as HTMLInputElement).dataset.highlight
  })
  const el = elRef.value
  if (highlightTimeout !== undefined) clearTimeout(highlightTimeout)
  delete el.dataset.highlight
  void el.offsetHeight
  el.dataset.highlight = ''
  highlightTimeout = setTimeout(() => {
    delete el.dataset.highlight
    highlightTimeout = undefined
  }, 2000)
}
const hooks: SylComponentActions = {
  focusInput: (position = undefined) => {
    __focusGivenInput(focused, inputEl, position)
  },
  focusRomanInput: (position = undefined) => {
    __focusGivenInput(romanFocused, romanInputEl, position)
  },
  hightLightInput: () => __hightLightGivenInput(inputEl),
  hightLightRoman: () => __hightLightGivenInput(romanInputEl),
}
onMounted(() => {
  staticStore.syllableHooks.set(props.syllable.id, hooks)
})
onUnmounted(() => {
  if (staticStore.syllableHooks.get(props.syllable.id) === hooks)
    staticStore.syllableHooks.delete(props.syllable.id)
})
</script>

<style lang="scss">
.csyl {
  height: var(--csyl-height);
  margin-right: var(--c-syl-gap);
  position: relative;

  --p-inputtext-lg-font-size: 1.3rem;
  --p-inputtext-sm-font-size: 0.95rem;
  --p-inputtext-lg-padding-x: 0.6rem;
  --p-inputtext-lg-padding-y: 0.5rem;
  --p-inputtext-sm-padding-x: 0.4rem;
  --p-inputtext-sm-padding-y: 0.3rem;

  --csyl-border-color: var(--p-inputtext-border-color);
  --csyl-head-bg: var(--c-border-color);
  --csyl-trans-dur: 0.1s;
  --csyl-remove-dur: 0.1s;

  border-radius: var(--p-inputtext-border-radius);
  background-color: var(--p-inputtext-background);
  box-shadow: var(--csyl-border-color) 0 0 0 1px inset;
  transition:
    transform var(--csyl-remove-dur),
    opacity var(--csyl-remove-dur),
    box-shadow var(--csyl-trans-dur);
  &:hover {
    --csyl-head-bg: var(--p-inputtext-border-color);
    --csyl-border-color: var(--p-inputtext-hover-border-color);
  }
  &.selected {
    --csyl-head-bg: var(--p-primary-color);
    --csyl-border-color: var(--p-primary-color);
    background-color: color-mix(
      in srgb,
      var(--p-primary-color) 10%,
      var(--p-inputtext-background) 90%
    );
    color: var(--p-primary-contrast-color);
    z-index: 3;
    transition:
      transform var(--csyl-remove-dur),
      opacity var(--csyl-remove-dur);
    --csyl-trans-dur: 0;
  }
  &.removing {
    opacity: 0.4;
    transform: scale(0.9);
  }
}
.csyl-head {
  flex: 1;
  font-size: 1rem;
  height: var(--csyl-head-height);
  cursor: move;
  background-color: var(--csyl-head-bg);
  border-top-left-radius: var(--p-inputtext-border-radius);
  border-top-right-radius: var(--p-inputtext-border-radius);
  box-shadow: var(--csyl-border-color) 0 1px 0;
  font-family: var(--font-monospace);
  position: relative;
  transition:
    background-color var(--csyl-trans-dur),
    box-shadow var(--csyl-trans-dur);
}
.csyl-head-bookmark,
.csyl-head-bars,
.csyl-head-placeholding-beat {
  position: absolute;
  top: 0.1rem;
  bottom: 0;
  margin: auto 0.2rem;
  height: fit-content;
}
.csyl-head-bookmark {
  left: 0;
  font-size: 0.8rem;
  color: var(--p-button-text-warn-color);
  .csyl.selected & {
    color: inherit;
  }
}
.csyl-head-bars {
  left: 0;
  font-size: 0.8rem;
  transform: scaleX(0.8);
  opacity: 0.4;
}
.csyl-head-placeholding-beat {
  right: 0.1rem;
  font-weight: bold;
}

.csyl-input-shell,
.csyl-roman-shell {
  height: var(--csyl-body-height);
  position: relative;
  border-bottom-left-radius: var(--p-inputtext-border-radius);
  border-bottom-right-radius: var(--p-inputtext-border-radius);
  font-size: var(--p-inputtext-lg-font-size);
}
.csyl-roman-shell {
  font-size: var(--p-inputtext-sm-font-size);
  height: var(--csyl-roman-height);
  box-shadow: 0 -1px 0 color-mix(in srgb, var(--csyl-border-color), transparent 30%);
  transition: box-shadow var(--csyl-trans-dur);
}
.syl-roman-enabled .csyl-input-shell {
  border-radius: 0;
}

.csyl-input-alike,
.csyl-roman-input-alike {
  padding: var(--p-inputtext-lg-padding-y) var(--p-inputtext-lg-padding-x);
  border: 1px solid transparent;
  white-space: pre;
  text-align: center;
}
.csyl-roman-input-alike {
  padding: var(--p-inputtext-sm-padding-y) var(--p-inputtext-sm-padding-x);
}

.csyl-input-widthcontrol,
.csyl-roman-widthcontrol {
  color: red;
  visibility: hidden;
}
.csyl-input,
.csyl-input-placeholder,
.csyl-roman-input {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
.csyl-input.csyl-input,
.csyl-roman-input.csyl-roman-input {
  padding-inline: 0;
  background: transparent;
  transition: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-color: transparent !important;
  text-align: center;
}
.syl-roman-enabled .csyl-input.csyl-input {
  border-radius: 0;
  border-bottom: none;
}
.csyl-roman-input.csyl-roman-input {
  border-top: none;
}
.csyl-input-placeholder {
  color: var(--p-inputtext-placeholder-color);
  font-weight: 300;
}
.csyl-drag-ghost {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
</style>
