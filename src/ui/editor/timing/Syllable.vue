<template>
  <div
    class="tsyl"
    @mousedown.stop="handleMouseDown"
    :class="{ selected: isSelected, active: isActive }"
  >
    <Timestamp
      class="tsyl-timestamp"
      begin
      v-model="props.syllable.startTime"
      v-tooltip="tt.startTime()"
    />
    <div class="tsyl-content">
      <i
        v-if="props.syllable.bookmarked"
        class="pi pi-bookmark-fill"
        style="color: var(--p-button-text-warn-color); margin-right: 0.3em"
      ></i>
      <span class="tsyl-text" @dblclick="handleTextDbClick">
        {{ props.syllable.text }}
      </span>
    </div>
    <Timestamp
      class="tsyl-timestamp"
      end
      v-model="props.syllable.endTime"
      v-tooltip="tt.endTime()"
    />
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { computed, watch } from 'vue'

import { audioEngine } from '@core/audio'
import { type LyricLine, type LyricSyllable, View } from '@core/types'

import { usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'

import { forceOutsideBlur } from '@utils/forceOutsideBlur'
import { tryRaf } from '@utils/tryRaf'

import Timestamp from './Timestamp.vue'

const tt = t.editor.syllable

const props = defineProps<{
  syllable: LyricSyllable
  parent: LyricLine
  parentIndex: number
}>()
const runtimeStore = useRuntimeStore()
const prefStore = usePrefStore()
function handleMouseDown() {
  forceOutsideBlur()
  runtimeStore.selectLineSyl(props.parent, props.syllable)
}
const isSelected = computed(() => {
  return runtimeStore.selectedSyllables.has(props.syllable)
})

const isActive = computed(
  () =>
    (props.syllable.startTime || props.syllable.endTime) &&
    audioEngine.amendedProgressComputed.value >= props.syllable.startTime &&
    audioEngine.amendedProgressComputed.value <= props.syllable.endTime,
)

const emit = defineEmits<{
  (e: 'needScroll', parentIndex: number): void
}>()
watch([isActive, () => prefStore.scrollWithPlayback], () => {
  if (props.parent.background) return
  if (isActive.value && prefStore.scrollWithPlayback) emit('needScroll', props.parentIndex)
})
// watch([isSelected, () => prefStore.scrollWithPlayback], () => {
//   if (isSelected.value && !prefStore.scrollWithPlayback) emit('needScroll', props.parentIndex)
// })

function handleTextDbClick() {
  runtimeStore.currentView = View.Content
  const id = props.syllable.id
  tryRaf(() => {
    const hooks = useStaticStore().syllableHooks.get(id)
    if (hooks) {
      hooks.focusInput()
      return true
    }
  })
}
</script>

<style lang="scss">
.tsyl {
  height: var(--syl-height);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--timestamp-space) 0.5rem;
  justify-content: space-between;
  --tsyl-border-color: var(--tline-border-color);
  --tsyl-thick-border-color: transparent;
  box-shadow:
    -1px -1px 0 var(--tsyl-border-color),
    inset -1px -1px 0 var(--tsyl-border-color),
    var(--tsyl-thick-border-color) inset -1px -1px 0 3px,
    var(--tsyl-thick-border-color) inset 0 0 0 3px;
  transition: box-shadow 0.1s;
  &:hover {
    --tsyl-thick-border-color: color-mix(in srgb, var(--p-primary-color), transparent 75%);
  }
  &.selected {
    --tsyl-thick-border-color: var(--p-primary-color);
    transition: none;
    .tsyl-timestamp {
      opacity: 1;
    }
    .tsyl-content {
      color: color-mix(in srgb, var(--p-primary-color), var(--p-button-text-plain-color) 50%);
    }
  }
  &.active {
    background-color: color-mix(in srgb, var(--p-primary-color), transparent 75%);
  }
}
.tsyl-timestamp {
  opacity: 0.7;
}
.tsyl-content {
  text-align: center;
  font-size: 1.5rem;
}
.tsyl-text {
  white-space: pre;
}
</style>
