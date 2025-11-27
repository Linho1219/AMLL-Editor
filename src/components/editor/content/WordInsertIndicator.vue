<template>
  <div
    class="winsert-indicator"
    :class="{
      dragging: runtimeStore.isDraggingWord,
      dragover,
      floatup,
      zerowidth: props.index === 0,
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  ></div>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { alignLineEndTime, alignLineStartTime } from '@/utils/alignLineTime'
import { sortWords } from '@/utils/selection'
import { ref, watch } from 'vue'
const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const dragover = ref(false)
const props = defineProps<{ parent: LyricLine; index: number }>()

const floatup = ref(false)
watch(
  () => runtimeStore.isDraggingWord,
  (val) => setTimeout(() => (floatup.value = val), 200),
)

function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDraggingWord) return
  e.preventDefault()
  dragover.value = true
  runtimeStore.canDrop = true
}
function handleDragLeave() {
  dragover.value = false
  runtimeStore.canDrop = false
}
function handleDrop(e: DragEvent) {
  if (!runtimeStore.isDraggingWord) return
  dragover.value = false
  runtimeStore.canDrop = false
  const pendingWords = sortWords(...runtimeStore.selectedWords)
  if (e.ctrlKey || e.metaKey) {
    const duplicatedWords = pendingWords.map(coreStore.newWord)
    const isBegin = props.index === 0
    const isEnd = props.index === props.parent.words.length
    props.parent.words.splice(props.index, 0, ...duplicatedWords)
    if (isBegin) alignLineStartTime(props.parent)
    if (isEnd) alignLineEndTime(props.parent)
    runtimeStore.selectLineWord(props.parent, ...duplicatedWords)
    staticStore.touchLineWord(props.parent, duplicatedWords.at(-1)!)
  } else {
    const continuity = checkWordContinuity(pendingWords)
    if (continuity && runtimeStore.getFirstSelectedLine() === props.parent) {
      const [start, end] = continuity
      if (props.index >= start && props.index <= end + 1)
        // Dropping into itself, do nothing
        return
    }
    const isBegin = props.index === 0
    const isEnd = props.index === props.parent.words.length
    const placeholder = coreStore.newWord({ word: '#PLACEHOLDER#', bookmarked: true })
    props.parent.words.splice(props.index, 0, placeholder)
    coreStore.deleteWord(...pendingWords)
    const insertIndex = props.parent.words.indexOf(placeholder)
    props.parent.words.splice(insertIndex, 1, ...pendingWords)
    if (isBegin) alignLineStartTime(props.parent)
    if (isEnd) alignLineEndTime(props.parent)
    runtimeStore.selectLineWord(props.parent, ...pendingWords)
  }
}

function checkWordContinuity(words: Readonly<LyricWord[]>): null | [number, number] {
  if (words.length === 0) return null
  const parentWords = props.parent.words
  if (words.length === 1) {
    const index = parentWords.indexOf(words[0]!)
    return [index, index]
  }
  const indices: number[] = []
  for (const [index, word] of parentWords.entries()) {
    if (!words.includes(word)) continue
    if (indices.length === 0) indices.push(index)
    else if (indices.at(-1) === index - 1) indices.push(index)
    else return null
  }
  return [indices[0]!, indices.at(-1)!]
}
</script>

<style lang="scss">
.winsert-indicator {
  box-sizing: content-box;
  width: 0.5rem;
  position: relative;
  &.dragging {
    margin: -0.1rem -0.8rem;
    padding: 0.1rem 0.8rem;
    z-index: -1;
  }
  &.floatup {
    z-index: 1;
  }
  &.dragover {
    &::after {
      visibility: visible;
    }
  }

  &::after {
    visibility: hidden;
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 0;
    margin: 0.2rem auto;
    box-shadow: 0 0 0 0.08rem var(--p-primary-color);
    .winsert-indicator.zerowidth & {
      box-shadow: none;
      width: 0.3rem;
    }
  }
  &.zerowidth {
    margin-left: -0.5rem;
    &.dragging {
      z-index: 1;
      margin: -0.1rem -0.5rem;
      padding: 0.1rem 0.5rem 0.1rem 0;
    }
    &::after {
      transform: translateX(-0.2rem);
    }
  }
}
</style>
