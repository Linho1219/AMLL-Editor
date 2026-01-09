<template>
  <Dialog v-model:visible="visible" modal :header="tt.header()" class="from-text-modal" maximizable>
    <div class="options">
      <div class="select-field">
        <Select
          class="mode-selection"
          :options="modeSelectItems"
          v-model="currentMode"
          optionLabel="name"
          checkmark
        />
        <div class="description">{{ currentMode.description }}</div>
      </div>
      <div class="checkboxes">
        <div class="check-item">
          <Checkbox
            v-model="originalChecked"
            input-id="original"
            name="original"
            binary
            :disabled="currentMode === interleaved"
          />
          <label class="check-item-label" for="original">{{ tt.fields.original() }}</label>
        </div>
        <div class="check-item">
          <Checkbox v-model="translationChecked" input-id="translation" name="translation" binary />
          <label class="check-item-label" for="translation">{{ tt.fields.trans() }}</label>
        </div>
        <div class="check-item">
          <Checkbox v-model="romanChecked" input-id="roman" name="roman" binary />
          <label class="check-item-label" for="roman">{{ tt.fields.roman() }}</label>
        </div>
        <div class="no-item-checked-warning" v-if="noItemChecked">
          {{ tt.fields.atLeastProvideOne() }}
        </div>
      </div>
    </div>
    <div class="textfields">
      <KeepAlive>
        <LineOrderInput
          v-if="currentMode === interleaved"
          :trans-enabled="translationChecked"
          :roman-enabled="romanChecked"
          ref="lineOrderInput"
        />
      </KeepAlive>
      <div class="textfield-shell">
        <div class="textfield-label" v-if="currentMode === separate">
          {{ tt.fields.original()
          }}<span class="useoriginaltip" v-if="!originalChecked">{{
            tt.fields.keepCurrentLinesTip()
          }}</span>
        </div>
        <CodeMirror
          :key="1"
          class="textfield"
          v-model:content="originalInput"
          v-model:scroll-top="cmScrollTop"
          v-model:current-line="cmCurrentLine"
          :highlightPattern="highlightPattern"
          showLineNumbers
          :readonly="!originalChecked"
        />
      </div>
      <div class="textfield-shell" v-if="currentMode === separate && translationChecked">
        <div class="textfield-label">{{ tt.fields.trans() }}</div>
        <CodeMirror
          :key="2"
          class="textfield"
          v-model:content="translationInput"
          v-model:scroll-top="cmScrollTop"
          v-model:current-line="cmCurrentLine"
        />
      </div>
      <div class="textfield-shell" v-if="currentMode === separate && romanChecked">
        <div class="textfield-label">{{ tt.fields.roman() }}</div>
        <CodeMirror
          :key="3"
          class="textfield"
          v-model:content="romanInput"
          v-model:scroll-top="cmScrollTop"
          v-model:current-line="cmCurrentLine"
        />
      </div>
    </div>
    <div class="actions">
      <div class="quick-tools">
        <Button
          :label="tt.toolBtns.removeTimestamps()"
          icon="pi pi-minus-circle"
          severity="secondary"
          @click="handleRemoveTimestamps"
        />
        <Button
          :label="tt.toolBtns.normalizeSpaces()"
          icon="pi pi-hammer"
          severity="secondary"
          @click="handleNormalizeSpaces"
        />
        <Button
          :label="tt.toolBtns.capitalizeFirstLetter()"
          icon="pi pi-arrow-up"
          severity="secondary"
          @click="handleCapitalizeFirstLetter"
        />
        <Button
          :label="tt.toolBtns.removeTrailingPunc()"
          icon="pi pi-delete-left"
          severity="secondary"
          @click="handleRemoveTrailingPunctuation"
        />
      </div>
      <Button
        :label="tt.cancel()"
        icon="pi pi-times"
        severity="secondary"
        @click="visible = false"
      />
      <Button
        :label="tt.action()"
        icon="pi pi-arrow-right"
        @click="handleImportAction"
        :disabled="noItemChecked"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { type ShallowRef, computed, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { parseInterleavedPlainText, parseSeparatePlainText } from '@core/convert/paintext'
import { fileState as FS } from '@core/file'

import { useCoreStore } from '@states/stores'

import CodeMirror from '@ui/components/CodeMirror.vue'
import LineOrderInput from '@ui/components/LineOrderInput.vue'
import { Button, Checkbox, Dialog, Select } from 'primevue'

const tt = t.importFromText

const [visible] = defineModel<boolean>({ required: true })
const originalInput = ref<string>('')
const translationInput = ref<string>('')
const romanInput = ref<string>('')

const cmCurrentLine = ref<number>(1)
const cmScrollTop = ref<number>(0)

// Force type convert: TS just cannot infer the type here correctly, don't know why
const lineOrderInput = useTemplateRef('lineOrderInput') as unknown as Readonly<
  ShallowRef<typeof LineOrderInput | undefined>
>

const highlightPattern = computed(() => {
  if (currentMode.value !== interleaved) return undefined
  const cycleLength = lineOrderInput.value?.cycleLength ?? 1
  const map: Record<number, string> = {}
  const originalOrder = lineOrderInput.value?.originalOrder
  const translationOrder = lineOrderInput.value?.translationOrder
  const romanizationOrder = lineOrderInput.value?.romanizationOrder
  if (originalOrder !== undefined) map[originalOrder] = 'cm-original-line'
  if (translationOrder !== undefined) map[translationOrder] = 'cm-translation-line'
  if (romanizationOrder !== undefined) map[romanizationOrder] = 'cm-romanization-line'
  return { cycleLength, map }
})

interface ModeSelectItem {
  name: string
  description: string
}
const separate: ModeSelectItem = {
  name: tt.modes.separate(),
  description: tt.modes.separateDesc(),
} as const
const interleaved: ModeSelectItem = {
  name: tt.modes.interleaved(),
  description: tt.modes.interleavedDesc(),
} as const

const modeSelectItems = [separate, interleaved]
const currentMode = shallowRef<ModeSelectItem>(separate)
watch(
  currentMode,
  () => {
    if (currentMode.value === interleaved) {
      // in interleaved mode, original must be enabled
      originalChecked.value = true
    }
  },
  { immediate: true },
)

const originalChecked = ref(true)
const translationChecked = ref(false)
const romanChecked = ref(false)

const coreStore = useCoreStore()
watch([originalChecked, visible], () => {
  if (!originalChecked.value && visible.value)
    originalInput.value = coreStore.lyricLines
      .map((l) => l.syllables.map((s) => s.text).join(''))
      .join('\n')
})
const noItemChecked = computed(
  () => !originalChecked.value && !translationChecked.value && !romanChecked.value,
)

async function handleImportAction() {
  if (currentMode.value === separate) {
    const toTextArr = (str: string) => {
      return str.split(/\r?\n/).map((t) => t.trim())
    }
    if (!originalChecked.value) {
      const translations = translationChecked.value ? toTextArr(translationInput.value) : []
      const romans = romanChecked.value ? toTextArr(romanInput.value) : []
      coreStore.lyricLines.forEach((line, index) => {
        const translation = translations[index]
        const roman = romans[index]
        if (translation !== undefined) line.translation = translation
        if (roman !== undefined) line.romanization = roman
      })
    } else
      await FS.importPersist(
        parseSeparatePlainText(
          originalInput.value,
          translationChecked.value ? translationInput.value : undefined,
          romanChecked.value ? romanInput.value : undefined,
        ),
      )
  } else if (currentMode.value === interleaved) {
    const loi = lineOrderInput.value
    if (!loi) return
    await FS.importPersist(
      parseInterleavedPlainText(
        {
          originalIndex: loi.originalOrder,
          translationIndex: translationChecked.value ? loi.translationOrder : undefined,
          romanIndex: romanChecked.value ? loi.romanizationOrder : undefined,
          groupSize: loi.cycleLength,
        },
        originalInput.value,
      ),
    )
  }
  visible.value = false
}

function applyProcessToInputs(process: (text: string) => string) {
  if (originalChecked.value) originalInput.value = process(originalInput.value)
  if (currentMode.value === separate) {
    if (translationChecked.value) translationInput.value = process(translationInput.value)
    if (romanChecked.value) romanInput.value = process(romanInput.value)
  }
}
function handleRemoveTimestamps() {
  const timestampRegex = /^\[\d{1,2}:\d{1,2}(?:(?:\.|\:)\d{1,3})?\] */
  const metadataLineRegex = /^[\[{].*[\]}]$/
  applyProcessToInputs((text: string) =>
    text
      .split(/\r?\n/)
      .filter((line) => !metadataLineRegex.test(line.trim()))
      .map((line) => line.replace(timestampRegex, ''))
      .join('\n'),
  )
}
function handleNormalizeSpaces() {
  applyProcessToInputs((text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .map((line) => line.replace(/([,.:])(?=\S)/g, '$1 '))
      .join('\n')
      .trim(),
  )
}
function handleCapitalizeFirstLetter() {
  applyProcessToInputs((text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/(^\s*\w)|(\.\s*\w)/g, (match) => match.toUpperCase()))
      .join('\n'),
  )
}
function handleRemoveTrailingPunctuation() {
  applyProcessToInputs((text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.replace(/[\p{P}\p{S}]+$/u, '').trimEnd())
      .join('\n'),
  )
}
</script>

<style lang="scss">
.from-text-modal {
  &:not(.p-dialog-maximized) {
    width: 80vw;
    height: 80vh;
    max-width: 90rem;
    max-height: 60rem;
  }
  .p-dialog-content {
    height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .options {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .description {
    font-size: 0.9rem;
    opacity: 0.8;
  }
  .select-field {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .mode-selection {
    min-width: 12rem;
  }
  .checkboxes {
    display: flex;
    gap: 1.5rem;
  }
  .check-item {
    display: flex;
    align-items: center;
  }
  .check-item-label {
    padding-left: 0.5rem;
  }
  .no-item-checked-warning {
    color: var(--p-button-text-danger-color);
  }
  .textfields {
    height: 0;
    flex: 1;
    display: flex;
    gap: 1rem;
  }
  .textfield-shell {
    display: flex;
    flex: 1;
    width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .textfield-label {
    opacity: 0.9;
    padding-left: 0.5rem;
    .useoriginaltip {
      color: var(--p-button-text-warn-color);
    }
  }
  .textfield {
    height: 0;
    flex: 1;
  }
  .actions {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
  }
  .quick-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    width: 0;
    flex: 1;
    justify-content: flex-start;
  }
  .cm-translation-line {
    color: var(--p-button-text-help-color);
  }
  .cm-romanization-line {
    color: var(--p-button-text-info-color);
  }
  .cm-cycle-highlight-else {
    color: var(--p-button-text-danger-color);
  }
}
</style>
