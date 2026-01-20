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
          v-tooltip="tt.bookmark()"
        />
        <Button
          :severity="props.line.duet ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-align-right"
          class="tline-tag-duet"
          :class="{ active: props.line.duet }"
          @click.stop="props.line.duet = !props.line.duet"
          v-tooltip="tt.duet()"
        />
        <Button
          :severity="props.line.background ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-expand"
          class="tline-tag-background"
          :class="{ active: props.line.background }"
          @click.stop="props.line.background = !props.line.background"
          v-tooltip="tt.background()"
        />
      </div>
      <div class="tline-head-timestamps" :class="{ 'time-hidden': prefStore.hideLineTiming }">
        <Timestamp
          begin
          v-model="props.line.startTime"
          v-tooltip="tt.startTime()"
          v-if="!prefStore.hideLineTiming"
        />
        <span
          class="tline-index"
          @dblclick="props.line.ignoreInTiming = !props.line.ignoreInTiming"
          v-tooltip="tipMultiLine(tt.index(), tt.indexDbClickToToogleIgnore())"
          >{{ props.index + 1 }}</span
        >

        <TimeConnectSwitch
          v-model="props.line.endTime"
          v-model:connect="props.line.connectNext"
          v-tooltip="
            tipMultiLine(tt.endTime(), tt.endTimeClickToConnect(), tt.endTimeDbClickToEdit())
          "
          v-if="!prefStore.hideLineTiming"
        />
        <Button
          v-else
          class="tline-connect-button"
          :severity="props.line.connectNext ? 'danger' : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-link"
          :class="{ active: props.line.connectNext }"
          @click.stop="props.line.connectNext = !props.line.connectNext"
          v-tooltip="tt.connectNext()"
        />
      </div>
    </div>
    <div class="tline-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { computed } from 'vue'

import type { LyricLine } from '@core/types'

import { usePrefStore, useRuntimeStore } from '@states/stores'

import { forceOutsideBlur } from '@utils/forceOutsideBlur'
import { tipMultiLine } from '@utils/generateTooltip'

import TimeConnectSwitch from './TimeConnectSwitch.vue'
import Timestamp from './Timestamp.vue'
import { Button } from 'primevue'

const tt = t.editor.line

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
  forceOutsideBlur()
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
}
.tline-head-btns {
  display: flex;
  flex-direction: column;
  justify-content: center;

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
  align-items: center;
  padding: var(--timestamp-space) 0;
  position: relative;
  &.time-hidden {
    justify-content: center;
    margin-left: -0.3rem;
  }
}
.tline-index {
  font-size: 1.3rem;
  text-align: center;
  font-family: var(--font-monospace);
  position: relative;

  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: content-box;
  padding: 0 0.3rem;
  min-width: 2ch;

  --ignore-line-bg: currentColor;

  .timestamp + & {
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
.tline-head-timestamps .tline-connect-button {
  position: absolute;
  bottom: 0.3rem;
}
.tline-content {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  margin-bottom: -1px;
  cursor: cell;
}
</style>
