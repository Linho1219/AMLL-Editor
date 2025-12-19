<template>
  <div class="split-text-out-editor">
    <template v-for="(char, index) in splitedText">
      <span
        class="splitter"
        v-if="index !== 0"
        :class="{ active: breakpoints.has(index) }"
        @mousedown="toggleBreakpoint(index)"
        >&ZeroWidthSpace;</span
      >
      <span class="char">{{ char }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const [model] = defineModel<number[]>({ required: true })
const props = defineProps<{
  original: string
}>()
const splitedText = computed(() => [...props.original])
const breakpoints = reactive(new Set<number>())
function toggleBreakpoint(index: number) {
  if (breakpoints.has(index)) breakpoints.delete(index)
  else breakpoints.add(index)
}

watch(
  () => props.original,
  () => breakpoints.clear(),
)

watch(
  breakpoints,
  () => {
    const indices = [...breakpoints].sort((a, b) => a - b)
    model.value = indices
  },
  { immediate: true },
)
</script>

<style lang="scss">
.split-text-out-editor {
  font-size: 1.3rem;
  .char {
    white-space: pre;
  }
  .splitter {
    display: inline-block;
    position: relative;
    width: 0.4em;
    margin: 0 -0.2em;
    padding: 0 0.2em;
    box-sizing: content-box;
    cursor: text;
    --color: transparent;
    opacity: 0.5;
    &.active {
      --color: var(--p-primary-color);
      opacity: 1;
    }
    &:hover {
      --color: var(--p-primary-color);
    }
    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 0;
      margin: 0 auto;
      box-shadow: 0 0 0 1px var(--color);
    }
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      width: 0;
      margin: 0 auto;

      width: 0;
      height: 0;
      border: 0.3rem solid transparent;
      border-bottom: 0.5rem solid var(--color);
    }
  }
}
</style>
