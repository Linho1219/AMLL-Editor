<template>
  <div
    class="editor content"
    @mousedown="handleMouseDown"
    @dragover="handleDragOver"
    @contextmenu="handleBlankContext"
    data-escape-auto-blur
    spellcheck="false"
    :class="{ 'syl-roman-enabled': prefStore.sylRomanEnabled }"
  >
    <VList
      :data="coreStore.lyricLines"
      class="editor-scroller"
      #default="{ item: line, index: lineIndex }"
      ref="vscroll"
    >
      <div :key="line.id" class="line-item-shell">
        <LineInsertIndicator
          v-if="lineIndex === 0"
          :index="0"
          @contextmenu="handleLineInsertContext"
        />
        <Line :line="line" :index="lineIndex" @contextmenu="handleLineContext">
          <WordInsertIndicator :index="0" :parent="line" />
          <template v-for="(syllable, sylIndex) in (<LyricLine>line).syllables" :key="syllable.id">
            <Syllable
              :syllable="syllable"
              :index="sylIndex"
              :parent="line"
              :line-index="lineIndex"
              @contextmenu="handleWordContext"
            />
            <WordInsertIndicator :index="sylIndex + 1" :parent="line" />
          </template>
          <Button
            class="add-syl-button"
            icon="pi pi-plus"
            severity="secondary"
            @click="appendWord(line)"
            v-tooltip="'插入音节'"
          />
        </Line>
        <LineInsertIndicator :index="lineIndex + 1" @contextmenu="handleLineInsertContext" />
      </div>
    </VList>
    <ContextMenu ref="menu" :model="menuItems">
      <template #item="{ item, props }">
        <TieredMenuItem :item="item" :binding="props" context />
      </template>
    </ContextMenu>
    <EmptyTip
      v-if="coreStore.lyricLines.length === 0"
      title="没有歌词行"
      tip="使用「打开」菜单加载内容，或右键空白处插入新行"
    />
    <Teleport to="body">
      <DragGhost v-if="runtimeStore.isDragging" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ScrollToIndexOpts } from 'virtua/unstable_core'
import { VList } from 'virtua/vue'
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  useTemplateRef,
} from 'vue'

import { useGlobalKeyboard } from '@core/hotkey'
import { type LyricLine, View } from '@core/types'

import { useCoreStore, usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'
import type { EditorComponentActions } from '@states/stores/static'

import { forceOutsideBlur } from '@utils/forceOutsideBlur'
import { isInputEl } from '@utils/isInputEl'
import { sortSyllables } from '@utils/sortLineSyls'
import { tryRaf } from '@utils/tryRaf'

import DragGhost from './DragGhost.vue'
import Line from './Line.vue'
import LineInsertIndicator from './LineInsertIndicator.vue'
import Syllable from './Syllable.vue'
import WordInsertIndicator from './SyllableInsertIndicator.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'
import TieredMenuItem from '@ui/components/TieredMenuItem.vue'
import { Button, ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

import { useContentCtxItems } from './context'

const coreStore = useCoreStore()
const runtimeStore = useRuntimeStore()
const staticStore = useStaticStore()
const prefStore = usePrefStore()

const vscroll = useTemplateRef('vscroll')

function appendWord(line: LyricLine) {
  const newSyllable = coreStore.newSyllable()
  line.syllables.push(newSyllable)
  runtimeStore.selectLineSyl(line, newSyllable)
  nextTick(() => staticStore.syllableHooks.get(newSyllable.id)?.focusInput())
}
function handleMouseDown(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey) return
  forceOutsideBlur()
  staticStore.lastTouchedLine = staticStore.lastTouchedSyl = null
  runtimeStore.clearSelection()
}
function handleDragOver(e: DragEvent) {
  if (!runtimeStore.isDragging) return
  if (!e.dataTransfer) return
  if (e.ctrlKey || e.metaKey) {
    e.dataTransfer.dropEffect = 'copy'
    runtimeStore.isDraggingCopy = true
  } else {
    e.dataTransfer.dropEffect = 'move'
    runtimeStore.isDraggingCopy = false
  }
}

const contextLineIndex = ref<number | undefined>(undefined)
const contextSylIndex = ref<number | undefined>(undefined)

const menu = useTemplateRef('menu')

const menuItemsMap = useContentCtxItems({
  lineIndex: contextLineIndex,
  sylIndex: contextSylIndex,
})
const menuItems = shallowRef<MenuItem[]>(menuItemsMap.blank)

const handleContext =
  (src: keyof typeof menuItemsMap) => (e: MouseEvent, lineIndex?: number, sylIndex?: number) => {
    if (isInputEl(e.target as HTMLElement)) return
    contextLineIndex.value = lineIndex
    contextSylIndex.value = sylIndex
    menuItems.value = menuItemsMap[src]
    menu.value?.show(e)
  }
const handleBlankContext = handleContext('blank')
const handleLineContext = handleContext('line')
const handleLineInsertContext = handleContext('lineInsert')
const handleWordContext = handleContext('syl')

useGlobalKeyboard('delete', () => {
  if (runtimeStore.selectedSyllables.size) {
    coreStore.deleteSyllable(...runtimeStore.selectedSyllables)
  } else coreStore.deleteLine(...runtimeStore.selectedLines)
})
useGlobalKeyboard('breakLine', () => {
  if (runtimeStore.selectedSyllables.size === 0) return
  const syls = sortSyllables(...runtimeStore.selectedSyllables)
  let currentLineIndex = 0
  for (const syl of syls) {
    while (!coreStore.lyricLines[currentLineIndex]?.syllables.includes(syl)) currentLineIndex++
    const line = coreStore.lyricLines[currentLineIndex]
    if (!line) return
    const sylIndex = line.syllables.indexOf(syl)
    const remainingSyls = line.syllables.splice(sylIndex)
    const newLine = coreStore.newLine({ ...line, syllables: remainingSyls })
    coreStore.lyricLines.splice(currentLineIndex + 1, 0, newLine)
    currentLineIndex++
  }
  runtimeStore.selectSyllable(...syls)
})

// onBeforeUnmounted instead of onUnmounted: vscroll quits at unmounted phase
onBeforeUnmount(() => {
  if (runtimeStore.currentView !== View.Timing || !vscroll.value) return
  const start = vscroll.value.findStartIndex()
  const end = vscroll.value.findEndIndex()
  const centerIndex = Math.floor((start + end) / 2)
  tryRaf(() => {
    if (staticStore.editorHook?.view !== View.Timing) return
    if (start === 0) staticStore.editorHook.scrollTo(0, { align: 'start' })
    else if (end === coreStore.lyricLines.length - 1)
      staticStore.editorHook.scrollTo(end, { align: 'end' })
    else staticStore.editorHook.scrollTo(centerIndex, { align: 'center' })
    return true
  })
})
onMounted(() => {
  const scrollToHook = (index: number, options?: ScrollToIndexOpts) =>
    vscroll.value?.scrollToIndex(index, options)
  staticStore.scrollToHook = scrollToHook
  onUnmounted(() => {
    if (staticStore.scrollToHook === scrollToHook) staticStore.scrollToHook = null
  })
})

const editorHook: EditorComponentActions = {
  view: View.Content,
  scrollTo: (...args) => {
    vscroll.value?.scrollToIndex(...args)
  },
}
onMounted(() => {
  staticStore.editorHook = editorHook
})
onUnmounted(() => {
  if (staticStore.editorHook === editorHook) staticStore.editorHook = null
})
</script>

<style lang="scss">
.editor.content {
  --csyl-height: calc(var(--csyl-head-height) + var(--csyl-body-height));
  --csyl-head-height: 1.8rem;
  --csyl-body-height: 3rem;
  --csyl-roman-height: 2rem;
  &.syl-roman-enabled {
    --csyl-height: calc(
      var(--csyl-head-height) + var(--csyl-body-height) + var(--csyl-roman-height)
    );
  }
}
.editor-scroller {
  height: 100%;
}
.add-syl-button {
  height: var(--csyl-height);
}
</style>
