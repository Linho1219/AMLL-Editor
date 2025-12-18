<template>
  <div
    class="cword"
    :class="{
      selected: isSelected,
      removing: isSelected && runtimeStore.isDragging && !runtimeStore.isDraggingCopy,
    }"
    @mousedown.stop
    @click.stop
    @contextmenu.stop="handleContext"
    @dragstart.stop
  >
    <div class="cword-drag-ghost" ref="dragGhostEl"></div>
    <div
      class="cword-head"
      draggable="true"
      @mousedown="handleMousedown"
      @click="handleClick"
      @dblclick="handleDbClick"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
    >
      &ZeroWidthSpace;
      <i v-if="props.word.bookmarked" class="cword-head-bookmark pi pi-bookmark-fill"></i>
      <i v-else class="cword-head-bars pi pi-bars"></i>
      <div v-if="props.word.placeholdingBeat" class="cword-head-placeholding-beat">
        {{ props.word.placeholdingBeat }}
      </div>
    </div>
    <div class="cword-input-shell" :class="{ focused: focused }">
      <div class="cword-input-widthcontrol cword-input-alike">
        {{ widthController }}
      </div>
      <div class="cword-input-placeholder cword-input-alike">
        {{ placeholder }}
      </div>
      <InputText
        ref="wordInputComponent"
        class="cword-input"
        v-model="inputModel"
        size="large"
        @keydown="handleKeydown"
        @focus="handleFocus"
        @compositionend="handleCompositionEnd"
        @blur="props.word.text = inputModel"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { useFocus } from '@vueuse/core'
import InputText from '@/components/repack/InputText.vue'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { forceOutsideBlur, sortIndex } from '@/utils/selection'
import { digit2Sup } from '@/utils/toSupSub'
import { useStaticStore, type WordComponentActions } from '@/stores/static'
import type { TimeoutHandle } from '@/utils/types'
const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const props = defineProps<{
  word: LyricWord
  index: number
  parent: LyricLine
  lineIndex: number
}>()

// Input Element
const inputComponent = useTemplateRef('wordInputComponent')
const inputEl = shallowRef<HTMLInputElement | null | undefined>(null)
const { focused } = useFocus(inputEl)
onMounted(() => (inputEl.value = inputComponent.value?.input))
const inputModel = ref(props.word.text)
watch(
  () => props.word.text,
  (val) => (inputModel.value = val),
)
watch(inputModel, (val) => {
  if (!focused.value) props.word.text = val
})

// Selection
const touch = () => {
  forceOutsideBlur()
  staticStore.touchLineWord(props.parent, props.word)
}
const isSelected = computed(() => runtimeStore.selectedWords.has(props.word))
let leftForClick = false
function handleMousedown(e: MouseEvent) {
  if (e.button > 2) return
  leftForClick = false
  if (e.ctrlKey || e.metaKey) {
    touch()
    if (!isSelected.value) {
      runtimeStore.addWordToSelection(props.word)
    } else leftForClick = true
  } else if (e.shiftKey && staticStore.lastTouchedWord) {
    const { lastTouchedWord, lastTouchedLine } = staticStore
    touch()
    if (!lastTouchedLine || !lastTouchedWord) return
    if (lastTouchedLine !== props.parent) {
      const [start, end] = sortIndex(coreStore.lyricLines.indexOf(lastTouchedLine), props.lineIndex)
      runtimeStore.selectLine(...coreStore.lyricLines.slice(start, end + 1))
    } else {
      const [start, end] = sortIndex(lastTouchedLine.words.indexOf(lastTouchedWord), props.index)
      const affectedWords = props.parent.words.slice(start, end + 1)
      if (isSelected.value) runtimeStore.removeWordFromSelection(...affectedWords)
      else runtimeStore.addWordToSelection(...affectedWords)
    }
  } else {
    if (isSelected.value) return
    touch()
    runtimeStore.selectLineWord(props.parent, props.word)
  }
}
function handleClick(e: MouseEvent) {
  if (leftForClick && (e.ctrlKey || e.metaKey)) runtimeStore.removeWordFromSelection(props.word)
  leftForClick = false
}
function handleDbClick() {
  inputEl.value?.select()
}
function handleFocus() {
  if (isSelected.value && runtimeStore.selectedWords.size === 1) return
  touch()
  runtimeStore.selectLineWord(props.parent, props.word)
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
  (name: 'contextmenu', e: MouseEvent, lineIndex: number, wordIndex: number): void
}>()
function handleContext(e: MouseEvent) {
  handleFocus()
  emit('contextmenu', e, props.lineIndex, props.index)
}

// Placeholder and input width control
const placeholder = computed(() => {
  if (focused.value) return ''
  const word = inputModel.value
  if (!word) return '/'
  if (word.match(/^\s+$/)) {
    if (word.length === 1) return '␣'
    const upperCount = [...word.length.toString()].map(digit2Sup).join('')
    return `␣${upperCount}`
  }
})
const widthController = computed(() => {
  const word = inputModel.value
  if (!word) return '/'
  if (word === ' ') return '␣'
  return placeholder.value || word
})

// Hotkeys
function handleKeydown(event: KeyboardEvent) {
  if (!inputEl.value || !focused.value) return
  const el = inputEl.value
  switch (event.code) {
    case 'Backspace': {
      // Combine with previous word
      if (props.index === 0 || el.selectionStart !== 0 || el.selectionEnd !== 0) return
      event.preventDefault()
      const prevWord = props.parent.words[props.index - 1]
      if (!prevWord) return
      const cursorPos = prevWord.text.length
      prevWord.text += el.value
      if (props.word.startTime && props.word.endTime) {
        prevWord.endTime = props.word.endTime
      }
      props.parent.words.splice(props.index, 1)
      runtimeStore.selectLineWord(props.parent, prevWord)
      nextTick(() => staticStore.wordHooks.get(prevWord.id)?.focusInput(cursorPos))
      return
    }
    case 'ArrowLeft': {
      // If at start, focus previous word
      if (el.selectionStart !== 0 || props.index === 0) return
      event.preventDefault()
      const prevWord = props.parent.words[props.index - 1]
      if (!prevWord) return
      nextTick(() => staticStore.wordHooks.get(prevWord.id)?.focusInput(-1))
      return
    }
    case 'ArrowRight': {
      // If at end, focus next word
      if (el.selectionStart !== el.value.length || props.index === props.parent.words.length - 1)
        return
      event.preventDefault()
      const nextWord = props.parent.words[props.index + 1]
      if (!nextWord) return
      nextTick(() => staticStore.wordHooks.get(nextWord.id)?.focusInput(0))
      return
    }
    case 'Backquote': {
      // Break word at cursor
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
      event.preventDefault()
      // preventDefault won't work with IME!
      // handle later in compositionend
      const breakIndex = el.selectionStart || 0
      const totDuration = props.word.endTime - props.word.startTime
      const breakTime = props.word.startTime + (totDuration * breakIndex) / (el.value.length || 1)
      const newWord = coreStore.newWord({
        text: el.value.slice(breakIndex),
        startTime: breakTime,
        endTime: props.word.endTime,
      })
      props.word.endTime = breakTime
      props.word.text = el.value.slice(0, breakIndex)
      props.parent.words.splice(props.index + 1, 0, newWord)
      runtimeStore.selectLineWord(props.parent, newWord)
      nextTick(() => staticStore.wordHooks.get(newWord.id)?.focusInput(0))
      return
    }
  }
}
function handleCompositionEnd(_e: CompositionEvent) {
  const pos = inputEl.value?.selectionStart || 0
  const lastChar = inputModel.value.charAt(pos - 1)
  if (lastChar === '·') {
    inputModel.value = inputModel.value.slice(0, pos - 1) + inputModel.value.slice(pos)
    nextTick(() => inputEl.value?.setSelectionRange(pos - 1, pos - 1))
  }
}

// Register hooks
let highlightTimeout: TimeoutHandle | undefined = undefined
const hooks: WordComponentActions = {
  focusInput: (position = undefined) => {
    focused.value = true
    if (!inputEl.value) {
      console.warn('Input element not found')
      return
    }
    if (position === undefined || Number.isNaN(position)) inputEl.value.select()
    else if (position < 0) {
      const length = props.word.text.length
      const cursor = length + position + 1
      inputEl.value.setSelectionRange(cursor, cursor)
    } else inputEl.value.setSelectionRange(position, position)
  },
  hightLightInput: () => {
    if (!inputEl.value) return
    document.querySelectorAll('.p-inputtext[data-highlight]').forEach((el) => {
      delete (el as HTMLInputElement).dataset.highlight
    })
    const el = inputEl.value
    if (highlightTimeout !== undefined) clearTimeout(highlightTimeout)
    delete el.dataset.highlight
    void el.offsetHeight
    el.dataset.highlight = ''
    highlightTimeout = window.setTimeout(() => {
      delete el.dataset.highlight
      highlightTimeout = undefined
    }, 2000)
  },
}
onMounted(() => {
  staticStore.wordHooks.set(props.word.id, hooks)
})
onUnmounted(() => {
  if (staticStore.wordHooks.get(props.word.id) === hooks)
    staticStore.wordHooks.delete(props.word.id)
})
</script>

<style lang="scss">
.cword {
  height: var(--content-word-height);
  --head-height: 1.8rem;
  --body-height: calc(var(--content-word-height) - var(--head-height));
  --p-inputtext-lg-font-size: 1.3rem;
  --w-bg-color: var(--c-border-color);
  position: relative;
  margin-right: var(--c-word-gap);
  transition:
    transform 0.1s,
    opacity 0.1s;
  &.selected {
    --w-bg-color: var(--p-primary-color);
    color: var(--p-primary-contrast-color);
    z-index: 3;
  }
  &.removing {
    opacity: 0.5;
    transform: scale(0.9);
  }
}
.cword-head {
  flex: 1;
  font-size: 1rem;
  height: var(--head-height);
  cursor: move;
  background-color: var(--w-bg-color);
  border-top-left-radius: var(--p-inputtext-border-radius);
  border-top-right-radius: var(--p-inputtext-border-radius);
  font-family: var(--font-monospace);
  position: relative;
}
.cword-head-bookmark,
.cword-head-bars,
.cword-head-placeholding-beat {
  position: absolute;
  top: 0.1rem;
  bottom: 0;
  margin: auto 0.2rem;
  height: fit-content;
}
.cword-head-bookmark {
  left: 0;
  font-size: 0.8rem;
  color: var(--p-button-text-warn-color);
  .cword.selected & {
    color: inherit;
  }
}
.cword-head-bars {
  left: 0;
  font-size: 0.8rem;
  transform: scaleX(0.8);
  opacity: 0.4;
}
.cword-head-placeholding-beat {
  right: 0.1rem;
  font-weight: bold;
}
.cword-input-shell {
  height: var(--body-height);
  --p-inputtext-lg-padding-x: 0.6rem;
  --p-inputtext-lg-padding-y: 0.5rem;
  position: relative;
  background-color: var(--p-inputtext-background);
  border-bottom-left-radius: var(--p-inputtext-border-radius);
  border-bottom-right-radius: var(--p-inputtext-border-radius);
  font-size: var(--p-inputtext-lg-font-size);
  .cword.selected & {
    background-color: color-mix(
      in srgb,
      var(--p-primary-color) 10%,
      var(--p-inputtext-background) 90%
    );
  }
}
.cword-input-alike {
  padding: var(--p-inputtext-lg-padding-y) var(--p-inputtext-lg-padding-x);
  border: 1px solid transparent;
  white-space: pre;
}
.cword-input-widthcontrol {
  visibility: hidden;
}
.cword-input,
.cword-input-placeholder {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
.cword-input.cword-input {
  padding-inline: 0;
  text-align: center;
  background: transparent;
  transition: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  .cword.selected & {
    border-color: var(--p-primary-color);
  }
}
.cword-input-placeholder {
  color: var(--p-inputtext-placeholder-color);
  font-weight: 300;
}
.cword-drag-ghost {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
</style>
