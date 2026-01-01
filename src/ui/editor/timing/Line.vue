<template>
  <div
    class="tline"
    :class="{
      ignored,
      pgmignored,
      mnlignored,
      selected: runtimeStore.selectedLines.has(props.line),
    }"
    @mousedown.stop="handleMouseDown"
  >
    <div class="tline-head">
      <div class="tline-head-btns">
        <Button
          :severity="props.line.bookmarked ? 'warn' : 'secondary'"
          variant="text"
          size="small"
          :icon="'pi pi-bookmark' + (props.line.bookmarked ? '-fill' : '')"
          :class="{ active: props.line.bookmarked }"
          @click.stop="props.line.bookmarked = !props.line.bookmarked"
          v-tooltip="'书签'"
        />
        <Button
          :severity="props.line.duet ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-align-right"
          class="tline-tag-duet"
          :class="{ active: props.line.duet }"
          @click.stop="props.line.duet = !props.line.duet"
          v-tooltip="'对唱'"
        />
        <Button
          :severity="props.line.background ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-expand"
          class="tline-tag-background"
          :class="{ active: props.line.background }"
          @click.stop="props.line.background = !props.line.background"
          v-tooltip="'背景'"
        />
      </div>
      <div class="tline-head-timestamps">
        <Timestamp
          begin
          v-model="props.line.startTime"
          v-tooltip="'行起始时间'"
          v-if="!prefStore.hideLineTiming"
        />
        <span
          class="tline-index"
          @dblclick="props.line.ignoreInTiming = !props.line.ignoreInTiming"
          v-tooltip="tipMultiLine('行序号', '双击以切换时轴忽略状态')"
          >{{ props.index + 1 }}</span
        >
        <Timestamp
          end
          v-model="props.line.endTime"
          v-tooltip="'行结束时间'"
          v-if="!prefStore.hideLineTiming"
        />
      </div>
    </div>
    <div class="tline-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { LyricLine } from '@core/types'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import { tipMultiLine } from '@utils/generateTooltip'

import Timestamp from './Timestamp.vue'
import { Button } from 'primevue'

const pgmignored = computed(() => prefStore.alwaysIgnoreBackground && props.line.background)
const mnlignored = computed(() => props.line.ignoreInTiming)
const ignored = computed(() => mnlignored.value || pgmignored.value)

const props = defineProps<{
  index: number
  line: LyricLine
}>()

const prefStore = usePrefStore()
const runtimeStore = useRuntimeStore()

function handleMouseDown() {
  runtimeStore.selectLine(props.line)
}
</script>

<style lang="scss">
.tline {
  box-sizing: content-box;
  display: flex;
  --t-border-color: var(--p-button-secondary-background);
  --t-bg-color: transparent;
  border: 2px solid var(--t-border-color);
  background-color: var(--t-bg-color);
  border-radius: 0.5rem;
  overflow: hidden;
  margin: 0.2rem 0.5rem;
  --timestamp-space: 0.5rem;
  --tline-border-color: var(--p-content-border-color);
  --syl-height: 7.5rem;
  &:hover,
  &.selected {
    --t-bg-color: var(--p-content-background);
  }
  &.selected {
    --t-border-color: var(--p-button-secondary-hover-background);
    opacity: 1;
  }
  &.ignored {
    opacity: 0.4;
  }
  &.ignored.selected {
    opacity: 0.8;
  }
}
.tline-head {
  display: flex;
  gap: 0.5rem;
  padding-right: 0.5rem;
  border-right: 1px solid transparent;
  --tline-head-background: color-mix(in srgb, var(--t-border-color), var(--global-background) 40%);
  background-color: var(--tline-head-background);
}
.tline-head-btns {
  display: flex;
  flex-direction: column;
  justify-content: center;
  --p-button-text-secondary-color: color-mix(
    in srgb,
    var(--p-form-field-placeholder-color),
    transparent 70%
  );
  --p-button-text-secondary-hover-background: color-mix(
    in srgb,
    var(--t-border-color),
    transparent 40%
  );
  .tline-tag {
    &-duet {
      --p-button-text-primary-color: var(--e-duet-text-color);
      --p-button-text-primary-hover-background: var(--e-duet-hover-background);
      --p-button-text-primary-active-background: var(--e-duet-active-background);
    }
    &-background {
      --p-button-text-primary-color: var(--e-bg-text-color);
      --p-button-text-primary-hover-background: var(--e-bg-hover-background);
      --p-button-text-primary-active-background: var(--e-bg-active-background);
    }
  }
}
.tline-head-timestamps {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--timestamp-space) 0;
}
.tline-index {
  font-size: 1.3rem;
  text-align: center;
  font-family: var(--font-monospace);
  position: relative;

  height: 0;
  flex: 1;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  padding: 0 0.3rem;
  margin-left: -0.3rem;
  min-width: 2ch;

  --ignore-line-bg: currentColor;

  .tline-head-timestamps + & {
    padding: 0.6em 0.5rem;
    width: fit-content;
    margin: 0 auto;
  }
  .tline.pgmignored & {
    --ignore-line-bg: var(--p-primary-color);
  }
  .tline.pgmignored.mnlignored & {
    --ignore-line-bg: linear-gradient(90deg, var(--p-primary-color) 50%, currentColor 50%);
  }
  .tline.ignored &::after {
    content: '';
    position: absolute;
    height: 0.1rem;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: auto;
    background: var(--ignore-line-bg);
    transform: rotate(20deg);
    box-shadow: 0 0 0 0.1rem var(--tline-head-background);
    border-radius: 0.1rem;
  }
}
.tline-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  margin-bottom: -1px;
  cursor: cell;
}
</style>
