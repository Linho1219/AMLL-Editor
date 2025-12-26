<template>
  <div
    class="winsert-indicator"
    :class="{
      dragging: runtimeStore.isDraggingSyl,
      dragover,
      beginning: props.index === 0,
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  ></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { LyricLine, LyricSyllable } from '@core/types'

import { useCoreStore, useRuntimeStore, useStaticStore } from '@states/stores'

import { alignLineEndTime, alignLineStartTime } from '@utils/alignLineSylTime'
import { sortSyllables } from '@utils/sortLineSyls'

const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const dragover = ref(false)
const props = defineProps<{ parent: LyricLine; index: number }>()

function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDraggingSyl) return
  e.preventDefault()
  dragover.value = true
  runtimeStore.canDrop = true
}
function handleDragLeave() {
  dragover.value = false
  runtimeStore.canDrop = false
}
function handleDrop(e: DragEvent) {
  if (!runtimeStore.isDraggingSyl) return
  dragover.value = false
  runtimeStore.canDrop = false
  const pendingSyls = sortSyllables(...runtimeStore.selectedSyllables)
  if (e.ctrlKey || e.metaKey) {
    const duplicatedWords = pendingSyls.map(coreStore.newSyllable)
    const isBegin = props.index === 0
    const isEnd = props.index === props.parent.syllables.length
    props.parent.syllables.splice(props.index, 0, ...duplicatedWords)
    if (isBegin) alignLineStartTime(props.parent)
    if (isEnd) alignLineEndTime(props.parent)
    runtimeStore.selectLineSyl(props.parent, ...duplicatedWords)
    staticStore.touchLineWord(props.parent, duplicatedWords.at(-1)!)
  } else {
    const continuity = checkSylsContinuity(pendingSyls)
    if (continuity && runtimeStore.getFirstSelectedLine() === props.parent) {
      const [start, end] = continuity
      if (props.index >= start && props.index <= end + 1)
        // Dropping into itself, do nothing
        return
    }
    const isBegin = props.index === 0
    const isEnd = props.index === props.parent.syllables.length
    const placeholder = coreStore.newSyllable({ text: '#PLACEHOLDER#', bookmarked: true })
    props.parent.syllables.splice(props.index, 0, placeholder)
    coreStore.deleteSyllable(...pendingSyls)
    const insertIndex = props.parent.syllables.indexOf(placeholder)
    props.parent.syllables.splice(insertIndex, 1, ...pendingSyls)
    if (isBegin) alignLineStartTime(props.parent)
    if (isEnd) alignLineEndTime(props.parent)
    runtimeStore.selectLineSyl(props.parent, ...pendingSyls)
  }
}

function checkSylsContinuity(syls: Readonly<LyricSyllable[]>): null | [number, number] {
  if (syls.length === 0) return null
  const parentSyls = props.parent.syllables
  if (syls.length === 1) {
    const index = parentSyls.indexOf(syls[0]!)
    return [index, index]
  }
  const indices: number[] = []
  for (const [index, syl] of parentSyls.entries()) {
    if (!syls.includes(syl)) continue
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
  width: 0;
  position: relative;
  --extra-width: 0.85rem;
  margin: -0.2rem 0;
  margin-left: calc(var(--c-syl-gap) / -2 - var(--extra-width));
  margin-right: calc(var(--c-syl-gap) / 2 - var(--extra-width));
  padding: 0.1rem calc(var(--extra-width));
  z-index: 1;
  pointer-events: none;
  &.dragging {
    pointer-events: auto;
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
    .winsert-indicator.beginning & {
      box-shadow: none;
      width: 0.3rem;
    }
  }
  &.beginning {
    margin: -0.1rem -0.5rem;
    padding: 0.1rem 0.5rem 0.1rem 0;
    width: var(--c-syl-gap);
    &::after {
      transform: translateX(-0.2rem);
    }
  }
}
</style>
