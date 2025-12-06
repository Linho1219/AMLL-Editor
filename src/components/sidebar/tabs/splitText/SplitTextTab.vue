<template>
  <div class="splittext-panel">
    <div class="group">
      <IftaLabel>
        <Select
          v-model="selectedEngine"
          inputId="splitEngine"
          :options="displayEngines"
          optionGroupLabel="label"
          optionGroupChildren="items"
          optionLabel="name"
          placeholder="选择断词引擎"
          scrollHeight="20rem"
          checkmark
          fluid
        >
          <template #optiongroup="slotProps">
            <div
              class="splittext-select-group-label"
              :class="{ hidden: slotProps.option.hideLabel }"
            >
              <div>{{ slotProps.option.label }}</div>
            </div>
          </template>
        </Select>
        <label for="splitEngine">断词引擎</label>
      </IftaLabel>
      <div
        class="description"
        v-if="selectedEngine?.description"
        :class="{ collapsed: descriptionCollapsed }"
      >
        <span class="description-text">{{ selectedEngine.description }}</span>
        <span class="description-button" @click="descriptionCollapsed = !descriptionCollapsed">
          {{ descriptionCollapsed ? '展开' : '收起' }}
        </span>
      </div>
    </div>
    <div class="group" style="height: 0; flex: 1">
      <div class="subtitle">
        <div class="subtitle-text">自定义规则</div>
        <div class="kvgrid" style="width: fit-content">
          <Checkbox v-model="caseSensitive" binary inputId="caseSensitive" size="small" />
          <label for="caseSensitive">区分大小写</label>
        </div>
      </div>
      <div
        class="rewrite-field"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <div class="rewrite-field-inner">
          <div v-for="(item, index) in customRewrites" class="rewrite-item">
            <InputText placeholder="原词" type="text" v-model.lazy.trim="item.target" fluid />
            <i class="pi pi-arrow-right"></i>
            <SplitTextRewriteEditor :original="item.target" v-model="item.indices" />
            <Button
              icon="pi pi-times"
              variant="text"
              severity="secondary"
              size="small"
              @click="customRewrites.splice(index, 1)"
            />
          </div>
          <Button
            label="添加规则"
            icon="pi pi-plus"
            @click="customRewrites.push({ target: '', indices: [] })"
            variant="text"
            severity="secondary"
            fluid
          />
        </div>
      </div>
    </div>
    <div class="action">
      <div class="warn">现有词属性将丢失，时长按实义字符线性插值</div>
      <Button
        label="应用到选定行"
        icon="pi pi-angle-right"
        fluid
        severity="secondary"
        :disabled="working || !selectedEngine || runtimeStore.selectedLines.size === 0"
        :loading="lastFired === 'selected' && working"
        @click="applyToSelectedLines"
      />
      <Button
        label="应用到选定行及之后"
        icon="pi pi-angle-double-right"
        fluid
        severity="secondary"
        :disabled="working || !selectedEngine || runtimeStore.selectedLines.size === 0"
        :loading="lastFired === 'selectedAndAfter' && working"
        @click="applyToSelectedLinesAndAfter"
      />
      <Button
        label="应用到所有行"
        icon="pi pi-angle-double-right"
        fluid
        severity="secondary"
        :disabled="working || !selectedEngine"
        :loading="lastFired === 'all' && working"
        @click="applyToAllLines"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCoreStore, type LyricLine, type LyricWord } from '@/stores/core'
import { useRuntimeStore } from '@/stores/runtime'
import { Button, Checkbox, IftaLabel, Select } from 'primevue'
import { reactive, ref } from 'vue'
import SplitTextRewriteEditor from './SplitTextRewriteEditor.vue'
import InputText from '@/components/repack/InputText.vue'
import engines, { type Rewrite, type SplitEngine } from '@/utils/splitText/register'

const displayEngines: { label: string; hideLabel?: boolean; items: SplitEngine[] }[] = [
  {
    label: '推荐',
    hideLabel: true,
    items: engines.filter((e) => !e.notRecommend),
  },
  {
    label: '不推荐',
    items: engines.filter((e) => e.notRecommend),
  },
]

const selectedEngine = ref<SplitEngine | null>(engines[0] || null)
const customRewrites = reactive<Rewrite[]>([])
const caseSensitive = ref(false)
const working = ref(false)
const descriptionCollapsed = ref(true)
const runtimeStore = useRuntimeStore()
const coreStore = useCoreStore()

const lastFired = ref<'selected' | 'selectedAndAfter' | 'all' | undefined>(undefined)
function applyToSelectedLines() {
  lastFired.value = 'selected'
  return applyToLines([...runtimeStore.selectedLines])
}
function applyToSelectedLinesAndAfter() {
  lastFired.value = 'selectedAndAfter'
  let startApplying = false
  const lines: LyricLine[] = []
  for (const line of coreStore.lyricLines) {
    if (startApplying) lines.push(line)
    else if (runtimeStore.selectedLines.has(line)) {
      startApplying = true
      lines.push(line)
    }
  }
  return applyToLines(lines)
}
function applyToAllLines() {
  lastFired.value = 'all'
  return applyToLines(coreStore.lyricLines)
}
async function applyToLines(lines: LyricLine[]) {
  if (!selectedEngine.value) return
  runtimeStore.clearWordSelection()
  const processor = selectedEngine.value.processor
  working.value = true
  const results = await processor(
    lines.map((line) => line.words.map((w) => w.text).join('')),
    customRewrites.filter(({ target }) => target.trim()),
    caseSensitive.value,
  )

  /**
   * Filter out spaces and punctuations, calculate time per character
   *  T h i s i s a n e x  a  m  p  l  e
   * 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
   * |           |           |           |
   */
  const filterRegex = /[\s\p{P}]+/gu
  lines.forEach((line, lineIndex) => {
    const result = results[lineIndex]!
    if (result.length === line.words.length) {
      const getText = (w: (typeof result)[number]) => (typeof w === 'string' ? w : w.text)
      const allTheSame = line.words.every(({ text }, i) => text === getText(result[i]!))
      if (allTheSame) return // No change
    }
    const newPartialWords = result.map((word) => (typeof word === 'string' ? { text: word } : word))
    let currOldPos = 0
    type XY = [number, number]
    const oldPosTime: XY[] = line.words.flatMap((w) => {
      const text = w.text.replace(filterRegex, '')
      if (text.length === 0) {
        // Skip filtered-out words
        return []
      }
      return [
        [currOldPos, w.startTime],
        [(currOldPos += text.length), w.endTime],
      ] as XY[]
    })
    /**
     * oldPosTime like:
     * [start1, time11]
     * [end1, time12]   <-
     * [start2, time21] <- end1 & start2 are the same, handle in averaging
     * [end2, time22]
     * ...
     * [endN, timeN2]
     */
    const maxOldPos = currOldPos
    const newMaxPos = newPartialWords
      .map((w) => w.text.replace(filterRegex, '').length)
      .reduce((a, b) => a + b, 0)
    if (!maxOldPos || !newMaxPos) {
      // All filtered out, just reset timings
      line.words = newPartialWords.map((word) => coreStore.newWord(word))
      return
    }
    const averagedPosTime: XY[] = []
    let accumulatedItemCount = 0
    for (const [currX, currY] of oldPosTime) {
      const lastPoint = averagedPosTime.at(-1)
      const [lastX, lastY] = lastPoint ?? [-1, -1]
      if (!lastPoint || lastX !== currX) {
        averagedPosTime.push([currX, currY])
        accumulatedItemCount = 1
      } else {
        lastPoint[1] = (lastY * accumulatedItemCount + currY) / ++accumulatedItemCount
        // handle multiple same positions: last end == curr begin
        // 0-length words will cause more than 2 points at same position
      }
    }
    averagedPosTime.forEach((point) => (point[0] = point[0] / maxOldPos)) // Normalize X to [0,1]

    let currNewPos = 0
    let apIndex = 0
    function getTimeAtRatio(ratio: number) {
      if (ratio < 0 || ratio > 1 || ratio < averagedPosTime[apIndex]![0])
        throw new Error('Ratio out of bounds')
      while (apIndex < averagedPosTime.length - 1 && averagedPosTime[apIndex + 1]![0] < ratio) {
        apIndex++
      }
      const [x1, y1] = averagedPosTime[apIndex]!
      const [x2, y2] = averagedPosTime[apIndex + 1]!
      if (x1 === x2) return Math.round((y1 + y2) / 2)
      const t = (ratio - x1) / (x2 - x1)
      return Math.round(y1 + (y2 - y1) * t)
    }
    line.words = newPartialWords.map((word) => {
      const charCount = word.text.replace(filterRegex, '').length
      const startRatio = currNewPos / newMaxPos
      const startTime = getTimeAtRatio(startRatio)
      const endRatio = (currNewPos += charCount) / newMaxPos
      const endTime = getTimeAtRatio(endRatio)
      return coreStore.newWord({ ...word, startTime, endTime })
    })
  })
  working.value = false
}

let dragCounter = 0
function handleDragEnter() {
  dragCounter++
}
function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDraggingWord) return
  e.preventDefault()
  runtimeStore.canDrop = true
  runtimeStore.isDraggingCopy = true
}
function handleDragLeave() {
  dragCounter--
  if (dragCounter > 0) return
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
}
function handleDrop() {
  dragCounter = 0
  runtimeStore.canDrop = false
  runtimeStore.isDraggingCopy = false
  const words: string[] = []
  let continuity = false
  for (const line of runtimeStore.selectedLines) {
    for (const word of line.words) {
      if (!runtimeStore.selectedWords.has(word)) {
        continuity = false
        continue
      }
      if (continuity && words.length) words[words.length - 1] += word.text
      else words.push(word.text)
      continuity = true
    }
    continuity = false
  }

  customRewrites.push(
    ...words
      .map((w) => w.trim())
      .filter((w) => w.length)
      .map((word) => ({
        target: word,
        indices: [],
      })),
  )
}
</script>

<style lang="scss">
.splittext-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  .subtitle {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
  }
  .subtitle-text {
    font-size: 1.1rem;
    font-weight: bold;
  }
  .description {
    font-size: 0.9rem;
    opacity: 0.8;
    &.collapsed {
      display: flex;
      justify-content: space-between;
      .description-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 0;
        flex: 1;
      }
    }
  }
  .description-button {
    display: inline-block;
    cursor: pointer;
    color: var(--p-primary-color);
    &:hover {
      color: color-mix(in srgb, var(--p-primary-color) 80%, white 30%);
    }
    &:active {
      opacity: 0.5;
    }
  }
  .group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .action {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .warn {
    color: var(--p-button-text-warn-color);
    font-size: 0.9rem;
  }
  .rewrite-field {
    height: 0;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.3rem;
    border: 1px solid var(--p-inputtext-border-color);
    background: var(--p-inputtext-background);
    border-radius: 0.5rem;
  }
  .rewrite-field-inner {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .rewrite-item {
    display: grid;
    grid-template-columns: 2fr auto 3fr auto;
    align-items: center;
    gap: 0.6rem;
    padding: 0.3rem 0 0.3rem 0.3rem;
    transition: background-color 0.2s;
    border-radius: var(--p-button-border-radius);
    &:hover,
    &:has(input:focus) {
      background-color: var(--p-button-secondary-background);
    }
  }
}
.splittext-select-group-label {
  margin: -0.3rem -0.2rem;
  font-weight: normal;
  font-size: 0.85rem;
}
.p-select-list-container .p-select-option-group:has(.splittext-select-group-label.hidden) {
  display: none;
}
</style>
