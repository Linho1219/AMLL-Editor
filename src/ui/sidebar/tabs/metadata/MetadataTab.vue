<template>
  <div class="metadata-panel" ref="panelEl">
    <IftaLabel>
      <Select
        v-model="currentTemplate"
        :options="metadataTemplates"
        :placeholder="tt.templatePlaceholder()"
        optionLabel="name"
        fluid
        checkmark
        showClear
        id="metadataTemplate"
      />
      <label for="metadataTemplate">{{ tt.templateLabel() }}</label>
    </IftaLabel>
    <div class="top-buttons" v-if="currentTemplate">
      <Button
        v-if="currentTemplate.docUrl"
        :label="tt.documentBtn()"
        icon="pi pi-external-link"
        fluid
        severity="secondary"
        @click="handleOpenDocUrl"
        style="flex: 1"
      />
      <Button
        :label="tt.addAllPresets()"
        icon="pi pi-plus"
        fluid
        severity="secondary"
        @click="handleAddAllFields"
        style="flex: 2"
      />
    </div>
    <Divider v-if="currentTemplate" />
    <div class="metadata-field-list">
      <div class="metadata-field" v-for="(field, index) in internalMetadataList">
        <div class="keylabel"><i class="pi pi-info-circle"></i></div>
        <div class="keycontent">
          <AutoComplete
            v-if="currentTemplate"
            class="meta-key-autocomplete"
            :placeholder="tt.keyPlaceholder()"
            v-model="field.key"
            :suggestions="currentSuggestions"
            fluid
            :invalid="isKeyInvalid(field.key)"
            @complete="search"
            @blur="flushToStore"
            dropdown
          >
            <template #option="{ option }">
              <div class="meta-key-autocomplete-item">
                <span class="meta-key-autocomplete-key">{{ option }}</span>
                <span class="meta-key-autocomplete-description">{{
                  currentLabelMap.get(option)
                }}</span>
              </div>
            </template>
          </AutoComplete>
          <InputText
            v-else
            class="meta-key-autocomplete"
            :placeholder="tt.keyPlaceholder()"
            v-model="field.key"
            fluid
            :invalid="isKeyInvalid(field.key)"
            @blur="flushToStore"
          />
          <div class="key-hint" v-if="currentTemplate && currentLabelMap.has(field.key)">
            {{ currentLabelMap.get(field.key) }}
          </div>
        </div>
        <div class="valuelabel">
          <Button
            icon="pi pi-trash"
            variant="text"
            size="small"
            severity="danger"
            @click="internalMetadataList.splice(index, 1)"
          />
        </div>
        <div class="valuecontent">
          <MultiInputText v-model="field.values" @update:modelValue="flushToStore" />
        </div>
      </div>
    </div>
    <div class="add-field">
      <Button
        :label="tt.clear()"
        icon="pi pi-ban"
        fluid
        severity="secondary"
        @click="handleClearAllFields"
        style="flex: 1"
        v-if="coreStore.metadata.length"
      />
      <Button
        class="add-field-btn"
        :label="tt.addField()"
        icon="pi pi-plus"
        severity="secondary"
        fluid
        @click="handleAddField"
        style="flex: 2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import stableStringify from 'json-stable-stringify'
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { useCoreStore } from '@states/stores'

import MultiInputText from '@ui/components/MultiInputText.vue'
import { AutoComplete, Button, Divider, IftaLabel, InputText, Select } from 'primevue'

import { type MetadataTemplate, amllMetaTemplate, lrcMetaTemplate } from './templates'

const tt = t.sidebar.metadata

const metadataTemplates: Readonly<MetadataTemplate>[] = [amllMetaTemplate, lrcMetaTemplate]
const currentTemplate = shallowRef<Readonly<MetadataTemplate> | undefined>(metadataTemplates[0])
const currentLabelMap = computed(() => {
  const labelMap: Map<string, string> = new Map()
  currentTemplate.value?.fields.forEach((field) => {
    labelMap.set(field.key, field.label)
  })
  return labelMap
})
const currentTemplateKeys = computed(() => {
  return currentTemplate.value?.fields.map((field) => field.key) || []
})
const coreStore = useCoreStore()

type MetadataList = { key: string; values: string[] }[]

const getMetadataList = () => [
  ...Object.entries(coreStore.metadata).map(([key, values]) => ({ key, values })),
]
const generateMetadataMap = (list: MetadataList) =>
  Object.fromEntries(list.map(({ key, values }) => [key, values]))
const isInnerOuterEqual = () =>
  stableStringify(generateMetadataMap(internalMetadataList.value)) ===
  stableStringify(coreStore.metadata)

const internalMetadataList = ref<MetadataList>(getMetadataList())
watch(
  () => coreStore.metadata,
  () => {
    if (isInnerOuterEqual()) return
    internalMetadataList.value = getMetadataList()
  },
  { deep: true },
)
function flushToStore() {
  if (isInnerOuterEqual()) return
  console.log('Flushing metadata changes to store')
  const newMetadataMap = generateMetadataMap(internalMetadataList.value)
  coreStore.metadata = newMetadataMap
}

function handleOpenDocUrl() {
  if (!currentTemplate.value?.docUrl) return
  window.open(currentTemplate.value.docUrl, '_blank')
}
function handleAddAllFields() {
  if (!currentTemplate.value) return
  currentTemplate.value.fields.forEach((field) => {
    if (!internalMetadataList.value.find(({ key }) => key === field.key))
      internalMetadataList.value.push({ key: field.key, values: [] })
  })
  flushToStore()
}
function handleClearAllFields() {
  internalMetadataList.value = []
  flushToStore()
}
const panelEl = useTemplateRef('panelEl')
function handleAddField() {
  const defaultName = 'unnamed_field'
  let suffix = 1
  while (internalMetadataList.value.find(({ key }) => key === `${defaultName}_${suffix}`)) suffix++
  internalMetadataList.value.push({ key: `${defaultName}_${suffix}`, values: [] })
  flushToStore()
  requestAnimationFrame(() => {
    if (panelEl.value) panelEl.value.scrollTop = panelEl.value.scrollHeight
  })
}
function isKeyInvalid(key: string) {
  if (!key || key.trim().length === 0) return true
  const occurrences = internalMetadataList.value.filter((field) => field.key === key).length
  return occurrences > 1
}

onMounted(() => {
  if (internalMetadataList.value.length === 0) return
  let maxHitTemplate: Readonly<MetadataTemplate> | undefined = undefined
  let maxHitCount = -1
  for (const template of metadataTemplates) {
    const hitCount = internalMetadataList.value
      .map(({ key }): number => (template.fields.find((field) => field.key === key) ? 1 : 0))
      .reduce((a, b) => a + b, 0)
    if (hitCount > maxHitCount) {
      maxHitCount = hitCount
      maxHitTemplate = template
    }
  }
  if (maxHitTemplate) currentTemplate.value = maxHitTemplate
})

const currentSuggestions = shallowRef<string[]>([])
function search({ query }: { query: string }) {
  query = query.trim().toLowerCase()
  if (!query) {
    currentSuggestions.value = [...currentTemplateKeys.value]
    return
  }
  const suggestions = currentTemplateKeys.value.filter((key) => key.toLowerCase().startsWith(query))
  if (suggestions.length) currentSuggestions.value = suggestions
  else currentSuggestions.value = [...currentTemplateKeys.value]
}
</script>

<style lang="scss">
.metadata-panel {
  padding-bottom: 0 !important;
  .top-buttons {
    display: flex;
    gap: 0.5rem;
    position: sticky;
    top: -0.8rem;
    padding-top: 0.5rem;
    z-index: 1;
    background-color: var(--global-background);
    padding-bottom: 0.5rem;
  }
  --p-divider-horizontal-margin: 0;
  .add-field {
    position: sticky;
    bottom: 0;
    z-index: 1;
    background-color: var(--global-background);
    padding-top: 0.5rem;
    padding-bottom: 0.3rem;
    display: flex;
    gap: 0.5rem;
  }
}
.metadata-field-list {
  display: flex;
  flex-direction: column;
}
.metadata-field-list:empty + .add-field {
  padding-top: 0;
}
.metadata-field {
  display: grid;
  justify-items: stretch;
  align-items: stretch;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 0.25rem 0.3rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--p-divider-border-color);
  .keylabel,
  .valuelabel {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .valuelabel {
    align-items: flex-start;
    margin-top: 0.3rem;
  }
  --p-inputtext-padding-y: 0.4rem;
  --p-inputtext-padding-x: 0.5rem;
  .keycontent {
    position: relative;
  }
  .key-hint {
    position: absolute;
    top: 0;
    left: var(--p-inputtext-padding-x);
    right: calc(var(--p-inputtext-padding-x) + var(--p-autocomplete-dropdown-width));
    bottom: 0;
    margin: auto 0;
    height: fit-content;
    pointer-events: none;
    background-color: var(--p-form-field-background);
    color: var(--p-button-secondary-color);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .meta-key-autocomplete.p-focus + .key-hint,
  .meta-key-autocomplete.p-autocomplete-open + .key-hint,
  .meta-key-autocomplete:focus-within + .key-hint {
    display: none !important;
  }
  .meta-key-autocomplete {
    font-family: var(--font-monospace);
  }
  .p-autocomplete-input-chip {
    flex: 1;
  }
}
.meta-key-autocomplete {
  &-item {
    display: flex;
    flex-direction: column;
  }
  &-key {
    font-family: var(--font-monospace);
  }
  &-description {
    font-size: 0.8rem;
    opacity: 0.7;
  }
}
.p-autocomplete-option:has(.meta-key-autocomplete-description) {
  --p-autocomplete-option-padding: 0.3rem 0.5rem;
}
</style>
