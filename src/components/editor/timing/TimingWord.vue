<template>
  <div
    class="tword"
    @mousedown.stop="handleMouseDown"
    :class="{ selected: isSelected, active: isActive }"
  >
    <Timestamp
      class="tword-timestamp"
      begin
      v-model="props.word.startTime"
      v-tooltip="'词起始时间'"
    />
    <div class="tword-content">
      <i
        v-if="props.word.bookmarked"
        class="pi pi-bookmark-fill"
        style="color: var(--p-button-text-warn-color); margin-right: 0.3em"
      ></i>
      <span class="tword-text" @dblclick="handleTextDbClick">
        {{ props.word.word }}
      </span>
    </div>
    <Timestamp class="tword-timestamp" end v-model="props.word.endTime" v-tooltip="'词结束时间'" />
  </div>
</template>

<script setup lang="ts">
import type { LyricLine, LyricWord } from '@/stores/core'
import Timestamp from './Timestamp.vue'
import { useRuntimeStore, View } from '@/stores/runtime'
import { computed, nextTick, watch } from 'vue'
import { useStaticStore } from '@/stores/static'
import { usePreferenceStore } from '@/stores/preference'

const props = defineProps<{
  word: LyricWord
  parent: LyricLine
  parentIndex: number
}>()
const runtimeStore = useRuntimeStore()
const configStore = usePreferenceStore()
function handleMouseDown() {
  runtimeStore.selectLineWord(props.parent, props.word)
}
const isSelected = computed(() => {
  return runtimeStore.selectedWords.has(props.word)
})

const audio = useStaticStore().audio
const isActive = computed(
  () =>
    (props.word.startTime || props.word.endTime) &&
    audio.progressComputed.value - audio.amendmentRef.value >= props.word.startTime &&
    audio.progressComputed.value - audio.amendmentRef.value <= props.word.endTime,
)

const emit = defineEmits<{
  (e: 'needScroll', parentIndex: number): void
}>()
watch([isActive, () => configStore.scrollWithPlayback], () => {
  if (props.parent.background) return
  if (isActive.value && configStore.scrollWithPlayback) emit('needScroll', props.parentIndex)
})
// watch([isSelected, () => configStore.scrollWithPlayback], () => {
//   if (isSelected.value && !configStore.scrollWithPlayback) emit('needScroll', props.parentIndex)
// })

function handleTextDbClick() {
  runtimeStore.currentView = View.Content
  let attemptCount = 20
  const id = props.word.id
  const focusTarget = () => {
    const hooks = useStaticStore().wordHooks.get(id)
    if (hooks) requestAnimationFrame(() => hooks.focusInput())
    else if (attemptCount-- > 0) requestAnimationFrame(() => focusTarget())
    else console.warn(`Failed to focus word input for word id ${id}: max attempts reached`)
  }
  requestAnimationFrame(() => focusTarget())
}
</script>

<style lang="scss">
.tword {
  height: var(--word-height);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--timestamp-space) 0.5rem;
  justify-content: space-between;
  --tword-border-color: var(--tline-border-color);
  --tword-thick-border-color: transparent;
  box-shadow:
    -1px -1px 0 var(--tword-border-color),
    inset -1px -1px 0 var(--tword-border-color),
    var(--tword-thick-border-color) inset -1px -1px 0 3px,
    var(--tword-thick-border-color) inset 0 0 0 3px;
  &:hover {
    --tword-thick-border-color: color-mix(in srgb, var(--p-primary-color), transparent 75%);
  }
  &.selected {
    --tword-thick-border-color: var(--p-primary-color);
    .tword-timestamp {
      opacity: 1;
    }
    .tword-content {
      color: color-mix(in srgb, var(--p-primary-color), var(--p-button-text-plain-color) 50%);
    }
  }
  &.active {
    background-color: color-mix(in srgb, var(--p-primary-color), transparent 75%);
  }
}
.tword-timestamp {
  opacity: 0.7;
}
.tword-content {
  text-align: center;
  font-size: 1.5rem;
}
.tword-text {
  white-space: pre;
}
</style>
