<template>
  <div
    class="linsert-indicator"
    :class="{
      dragging: runtimeStore.isDragging,
      dragover,
      floatup,
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @contextmenu="handleContext"
  ></div>
</template>
<script setup lang="ts">
import { useCoreStore, type LyricLine } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { useStaticStore } from '@/stores/static'
import { alignLineTime } from '@/utils/alignLineTime'
import { sortLines, sortWords } from '@/utils/selection'
import { ref, watch } from 'vue'
const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const dragover = ref(false)
const props = defineProps<{ index: number }>()

const floatup = ref(false)
watch(
  () => runtimeStore.isDragging,
  (val) => setTimeout(() => (floatup.value = val), 200),
)

function handleDragOver(_e: DragEvent) {
  dragover.value = true
  runtimeStore.canDrop = true
}
function handleDragLeave() {
  dragover.value = false
  runtimeStore.canDrop = false
}
function handleDrop(e: DragEvent) {
  dragover.value = false
  runtimeStore.canDrop = false
  if (runtimeStore.isDraggingLine) {
    const pendingLines = sortLines(...runtimeStore.selectedLines)
    if (e.ctrlKey || e.metaKey) {
      const duplicatedLines = pendingLines.map((oldLine) => {
        const newLine = coreStore.newLine({
          ...oldLine,
          words: oldLine.words.map(coreStore.newWord),
        })
        return newLine
      })
      coreStore.lyricLines.splice(props.index, 0, ...duplicatedLines)
      runtimeStore.selectLine(...duplicatedLines)
      staticStore.touchLineOnly(duplicatedLines.at(-1)!)
    } else {
      const continuity = checkLineContinuity(pendingLines)
      if (continuity) {
        const [start, end] = continuity
        if (props.index >= start && props.index <= end + 1)
          // Dropping into itself, do nothing
          return
      }
      const placeholder = coreStore.newLine({ bookmarked: true, translation: '#PLACEHOLDER#' })
      coreStore.lyricLines.splice(props.index, 0, placeholder)
      coreStore.deleteLine(...pendingLines)
      const insertIndex = coreStore.lyricLines.indexOf(placeholder)
      coreStore.lyricLines.splice(insertIndex, 1, ...pendingLines)
      runtimeStore.selectLine(...pendingLines)
    }
  } else if (runtimeStore.isDraggingWord) {
    const pendingWords = sortWords(...runtimeStore.selectedWords)
    const isCopy = e.ctrlKey || e.metaKey
    const newLine = coreStore.newLine({ words: pendingWords })
    alignLineTime(newLine)
    if (isCopy) newLine.words = pendingWords.map(coreStore.newWord)
    else coreStore.deleteWord(...pendingWords)
    coreStore.lyricLines.splice(props.index, 0, newLine)
    runtimeStore.selectLineWord(newLine, ...newLine.words)
    staticStore.touchLineWord(newLine, newLine.words.at(-1)!)
  }
}

function checkLineContinuity(lines: Readonly<LyricLine[]>): null | [number, number] {
  if (lines.length === 0) return null
  if (lines.length === 1) {
    const index = coreStore.lyricLines.indexOf(lines[0]!)
    return [index, index]
  }
  const indices: number[] = []
  for (const [index, line] of coreStore.lyricLines.entries()) {
    if (!lines.includes(line)) continue
    if (indices.length === 0) indices.push(index)
    else if (indices.at(-1) === index - 1) indices.push(index)
    else return null
  }
  return [indices[0]!, indices.at(-1)!]
}

const emit = defineEmits<{
  (name: 'contextmenu', e: MouseEvent, lineIndex: number): void
}>()
function handleContext(e: MouseEvent) {
  emit('contextmenu', e, props.index)
}
</script>

<style lang="scss">
.linsert-indicator {
  box-sizing: content-box;
  height: 0.8rem;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  &.dragging {
    z-index: -1;
    &::before {
      top: -2rem;
      bottom: -0.6rem;
    }
  }
  &.floatup {
    z-index: 3;
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
    height: 0;
    margin: auto 1rem;
    box-shadow: 0 0 0 0.08rem var(--p-primary-color);
  }
}
</style>
