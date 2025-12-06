<template>
  <div class="metadata-panel" ref="panelEl">
    <IftaLabel>
      <Select
        v-model="currentTemplate"
        :options="metadataTemplates"
        placeholder="不使用模板"
        optionLabel="name"
        fluid
        checkmark
        showClear
        id="metadataTemplate"
      />
      <label for="metadataTemplate">元数据字段模板</label>
    </IftaLabel>
    <div class="top-buttons" v-if="currentTemplate">
      <Button
        v-if="currentTemplate.docUrl"
        label="文档"
        icon="pi pi-external-link"
        fluid
        severity="secondary"
        @click="handleOpenDocUrl"
        style="flex: 1"
      />
      <Button
        label="添加全部预设"
        icon="pi pi-plus"
        fluid
        severity="secondary"
        @click="handleAddAllFields"
        style="flex: 2"
      />
    </div>
    <Divider v-if="currentTemplate" />
    <div class="metadata-field-list">
      <div class="metadata-field" v-for="(field, index) in coreStore.metadata" :key="field.key">
        <div class="keylabel"><i class="pi pi-info-circle"></i></div>
        <div class="keycontent">
          <AutoComplete
            v-if="currentTemplate"
            class="meta-key-autocomplete"
            placeholder="键名"
            v-model="field.key"
            :suggestions="currentSuggestions"
            fluid
            :invalid="isKeyInvalid(field.key)"
            @complete="search"
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
            placeholder="键名"
            v-model="field.key"
            fluid
            :invalid="isKeyInvalid(field.key)"
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
            @click="coreStore.metadata.splice(index, 1)"
          />
        </div>
        <div class="valuecontent">
          <MultiInputText v-model="field.values" />
        </div>
      </div>
    </div>
    <div class="add-field">
      <Button
        label="清除"
        icon="pi pi-ban"
        fluid
        severity="secondary"
        @click="handleClearAllFields"
        style="flex: 1"
        v-if="coreStore.metadata.length"
      />
      <Button
        class="add-field-btn"
        label="添加字段"
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
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { amllMetaTemplate, lrcMetaTemplate, type MetadataTemplate } from './templates'
import { AutoComplete, Button, Divider, IftaLabel, InputText, Select } from 'primevue'
import { useCoreStore } from '@/stores/core'
import MultiInputText from '@/components/repack/MultiInputText.vue'

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

function handleOpenDocUrl() {
  if (!currentTemplate.value?.docUrl) return
  window.open(currentTemplate.value.docUrl, '_blank')
}
function handleAddAllFields() {
  if (!currentTemplate.value) return
  currentTemplate.value.fields.forEach((field) => {
    if (!coreStore.metadata.find(({ key }) => key === field.key))
      coreStore.metadata.push({ key: field.key, values: [] })
  })
}
function handleClearAllFields() {
  coreStore.metadata.length = 0
}
const panelEl = useTemplateRef('panelEl')
function handleAddField() {
  const defaultName = 'unnamed_field'
  let suffix = 1
  while (coreStore.metadata.find(({ key }) => key === `${defaultName}_${suffix}`)) suffix++
  coreStore.metadata.push({ key: `${defaultName}_${suffix}`, values: [] })
  requestAnimationFrame(() => {
    if (panelEl.value) panelEl.value.scrollTop = panelEl.value.scrollHeight
  })
}
function isKeyInvalid(key: string) {
  if (!key || key.trim().length === 0) return true
  const occurrences = coreStore.metadata.filter((field) => field.key === key).length
  return occurrences > 1
}

onMounted(() => {
  if (coreStore.metadata.length === 0) return
  let maxHitTemplate: Readonly<MetadataTemplate> | undefined = undefined
  let maxHitCount = 0
  for (const template of metadataTemplates) {
    for (const field of template.fields) {
      const hitCount = coreStore.metadata.filter(({ key }) => key === field.key).length
      if (hitCount > maxHitCount) {
        maxHitCount = hitCount
        maxHitTemplate = template
      }
    }
  }
  if (maxHitTemplate) currentTemplate.value = maxHitTemplate
})

const currentSuggestions = shallowRef<string[]>([])
function search({ query }: { query: string }) {
  query = query.trim().toLowerCase()
  if (!query) currentSuggestions.value = currentTemplateKeys.value
  else {
    currentSuggestions.value = currentTemplateKeys.value.filter((key) =>
      key.toLowerCase().startsWith(query),
    )
  }
}
</script>

<style lang="scss">
.metadata-panel {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  .top-buttons {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    position: sticky;
    top: 0;
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
    display: flex;
    gap: 0.5rem;
  }
}
.metadata-field-list {
  display: flex;
  flex-direction: column;
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
