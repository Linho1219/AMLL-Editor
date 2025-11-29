<template>
  <div
    class="cline"
    :class="{
      selected: isSelected,
      removing: isSelected && runtimeStore.isDraggingLine && !runtimeStore.isDraggingCopy,
      ignored,
      mnlignored,
      pgmignored,
    }"
    @mousedown.stop="handleMouseDown"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @contextmenu.stop="handleContext"
  >
    <div class="cline-drag-ghost" ref="dragGhostEl"></div>
    <div class="cline-head" draggable="true">
      <div class="cline-drag-indicator">
        <i class="cline-drag-icon pi pi-bars"></i>
      </div>
      <div class="cline-head-info">
        <Button
          class="cline-tag cline-bookmark"
          :severity="props.line.bookmarked ? 'warn' : 'secondary'"
          variant="text"
          :icon="'pi pi-bookmark' + (props.line.bookmarked ? '-fill' : '')"
          :class="{ active: props.line.bookmarked }"
          @click.stop="props.line.bookmarked = !props.line.bookmarked"
          v-tooltip="'书签'"
        />
        <div
          class="cline-index"
          @dblclick="props.line.ignoreInTiming = !props.line.ignoreInTiming"
          v-tooltip="tipMultiLine('行序号', '双击以切换时轴忽略状态')"
        >
          {{ props.index + 1 }}
        </div>
        <div style="flex: 1"></div>
        <Button
          class="cline-tag cline-tag-duet"
          :severity="props.line.duet ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-align-right"
          :class="{ active: props.line.duet }"
          @click.stop="props.line.duet = !props.line.duet"
          v-tooltip="'对唱'"
        />
        <Button
          class="cline-tag cline-tag-background"
          :severity="props.line.background ? undefined : 'secondary'"
          variant="text"
          size="small"
          icon="pi pi-expand"
          :class="{ active: props.line.background }"
          @click.stop="props.line.background = !props.line.background"
          v-tooltip="'背景'"
        />
      </div>
    </div>
    <div class="cline-inner">
      <div class="cline-content">
        <slot></slot>
      </div>
      <div class="cline-secondary" ref="secondaryInputShellEl">
        <template v-for="f in orderedFields" :key="f.key">
          <FloatLabel variant="on">
            <InputText
              fluid
              v-model.lazy="props.line[f.model]"
              @focus="handleFocus"
              @mousedown.stop
              @click.stop
              @dragstart.stop
              :data-line-field-key="f.key"
            />
            <label>{{ f.label }}</label>
          </FloatLabel>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { forceOutsideBlur, sortIndex } from '@/utils/selection'
import { Button, ContextMenu, FloatLabel } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import InputText from '@/components/repack/InputText.vue'
import { useStaticStore, type LineComponentActions } from '@/stores/static'
import { usePreferenceStore } from '@/stores/preference'
import type { TimeoutHandle } from '@/utils/types'
import { tipMultiLine } from '@/utils/tooltip'

const props = defineProps<{
  line: LyricLine
  index: number
}>()
const runtimeStore = useRuntimeStore()
const preferenceStore = usePreferenceStore()
const coreStore = useCoreStore()
const staticStore = useStaticStore()
const isSelected = computed(() => runtimeStore.selectedLines.has(props.line))

const pgmignored = computed(() => preferenceStore.alwaysIgnoreBackground && props.line.background)
const mnlignored = computed(() => props.line.ignoreInTiming)
const ignored = computed(() => mnlignored.value || pgmignored.value)

const touch = () => {
  forceOutsideBlur()
  staticStore.touchLineOnly(props.line)
}
function handleFocus() {
  touch()
  runtimeStore.selectLine(props.line)
}
let leftForClick = false
function handleMouseDown(e: MouseEvent) {
  if (e.button > 2) return
  leftForClick = false
  if (e.metaKey || e.ctrlKey) {
    touch()
    staticStore.lastTouchedLine = props.line
    if (!isSelected.value) {
      runtimeStore.addLineToSelection(props.line)
    } else leftForClick = true
  } else if (e.shiftKey && staticStore.lastTouchedLine) {
    const lastTouchedLine = staticStore.lastTouchedLine
    touch()
    const lines = coreStore.lyricLines
    const [start, end] = sortIndex(lines.indexOf(lastTouchedLine), props.index)
    const affectedLines = lines.slice(start, end + 1)
    if (isSelected.value)
      affectedLines.forEach((line) => runtimeStore.removeLineFromSelection(line))
    else affectedLines.forEach((line) => runtimeStore.addLineToSelection(line))
  } else {
    touch()
    runtimeStore.clearWordSelection()
    if (isSelected.value) return
    runtimeStore.selectLine(props.line)
  }
}
function handleClick(e: MouseEvent) {
  if (leftForClick && (e.ctrlKey || e.metaKey))
    if (isSelected.value) runtimeStore.removeLineFromSelection(props.line)
  leftForClick = false
}
const dragGhostEl = useTemplateRef('dragGhostEl')
function handleDragStart(e: DragEvent) {
  staticStore.touchLineOnly(props.line)
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

const emit = defineEmits<{
  (name: 'contextmenu', e: MouseEvent, lineIndex: number): void
}>()
function handleContext(e: MouseEvent) {
  handleFocus()
  emit('contextmenu', e, props.index)
}

const secondaryFields = [
  {
    key: 'translation',
    label: '行翻译',
    model: 'translation',
  },
  {
    key: 'roman',
    label: '行音译',
    model: 'romanization',
  },
] as const
const orderedFields = computed(() =>
  preferenceStore.swapTranslateRoman ? [...secondaryFields].reverse() : secondaryFields,
)

const secondaryInputShellEl = useTemplateRef('secondaryInputShellEl')
const lineHooks: LineComponentActions = {
  focusRomanInput: (position) => handleSecondaryInputFocus('roman', position),
  focusTranslationInput: (position) => handleSecondaryInputFocus('translation', position),
  hightLightRoman: () => handleSecondaryInputHighlight('roman'),
  hightLightTranslation: () => handleSecondaryInputHighlight('translation'),
}
function handleSecondaryInputFocus(fieldKey: string, position?: number) {
  const inputEl = secondaryInputShellEl.value?.querySelector(
    `input[data-line-field-key="${fieldKey}"]`,
  ) as HTMLInputElement | null
  if (!inputEl) return
  inputEl.focus()
  if (position === undefined || Number.isNaN(position)) inputEl.select()
  else if (position < 0) {
    const length = inputEl.value.length
    const cursor = length + position + 1
    inputEl.setSelectionRange(cursor, cursor)
  } else inputEl.setSelectionRange(position, position)
}
const elementTimeouts = new WeakMap<HTMLElement, TimeoutHandle>()
function handleSecondaryInputHighlight(fieldKey: string) {
  document.querySelectorAll('.p-inputtext[data-highlight]').forEach((el) => {
    delete (el as HTMLInputElement).dataset.highlight
  })
  const inputEl = secondaryInputShellEl.value?.querySelector(
    `.p-inputtext[data-line-field-key="${fieldKey}"]`,
  ) as HTMLInputElement | null
  if (!inputEl) return
  delete inputEl.dataset.highlight
  void inputEl.offsetHeight
  inputEl.dataset.highlight = ''
  void inputEl.offsetHeight
  if (elementTimeouts.has(inputEl)) {
    const oldTimeoutId = elementTimeouts.get(inputEl)!
    clearTimeout(oldTimeoutId)
  }
  const timeoutId = setTimeout(() => {
    delete inputEl.dataset.highlight
    elementTimeouts.delete(inputEl)
  }, 2000)
  elementTimeouts.set(inputEl, timeoutId)
}
onMounted(() => {
  staticStore.lineHooks.set(props.line.id, lineHooks)
})
onUnmounted(() => {
  if (staticStore.lineHooks.get(props.line.id) === lineHooks)
    staticStore.lineHooks.delete(props.line.id)
})
</script>

<style lang="scss">
.cline {
  margin: 0 0.5rem;
  min-height: 9.8rem;
  display: flex;
  overflow: hidden;
  border: 2px var(--l-border-color) solid;
  background-color: var(--l-bg-color);
  border-radius: 0.5rem;
  --l-border-color: var(--p-button-secondary-background);
  --l-bg-color: transparent;
  opacity: 0.8;
  transition: transform 0.2s;
  // animation: fade 0.2s;
  &:hover,
  &.selected {
    --l-bg-color: var(--p-content-background);
  }
  &.selected {
    --l-border-color: var(--p-button-secondary-hover-background);
    opacity: 1;
  }
  &.removing {
    opacity: 0.5;
    transform: scale(0.98);
  }
}
.cline-head {
  display: flex;
  --cline-head-background: color-mix(in srgb, var(--l-border-color), var(--global-background) 40%);
  background-color: var(--cline-head-background);
  color: var(--p-button-secondary-color);
  cursor: move;
}
.cline-drag-indicator {
  width: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: right;
}
.cline-drag-icon {
  opacity: 0.5;
  font-size: 0.8rem;
  .cline.selected & {
    opacity: 0.8;
  }
}
.cline-head-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0.3rem 0.1rem;
}
.cline-index {
  padding: 0.3rem 0 0.5rem;
  font-size: 1.2rem;
  text-align: center;
  width: 3ch;
  font-family: var(--font-monospace);
  position: relative;
  --ignore-line-bg: currentColor;
  .cline.pgmignored & {
    --ignore-line-bg: var(--p-primary-color);
  }
  .cline.pgmignored.mnlignored & {
    --ignore-line-bg: linear-gradient(90deg, var(--p-primary-color) 50%, currentColor 50%);
  }
  .cline.ignored &::after {
    content: '';
    position: absolute;
    height: 0.1rem;
    width: 2rem;
    top: 0;
    right: 0;
    bottom: 0.1rem;
    left: 0;
    margin: auto;
    background: var(--ignore-line-bg);
    transform: rotate(30deg);
    box-shadow: 0 0 0 0.1rem var(--cline-head-background);
    border-radius: 0.1rem;
  }
}
.cline-bookmark {
  padding-top: 0;
  border-top: none !important;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.cline-tag {
  --p-button-text-secondary-color: color-mix(
    in srgb,
    var(--p-form-field-placeholder-color),
    transparent 70%
  );
  --p-button-text-secondary-hover-background: color-mix(
    in srgb,
    var(--l-border-color),
    transparent 40%
  );
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

.cline-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.cline-secondary {
  display: flex;
  padding: 0.8rem 0.5rem 0.5rem;
  gap: 0.5rem;
}
.cline-content {
  flex: 1;
  display: flex;
  padding: 0.5rem;
  flex-wrap: wrap;
  row-gap: 0.5rem;
  align-content: flex-start;
}
.cline-drag-ghost {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
</style>
