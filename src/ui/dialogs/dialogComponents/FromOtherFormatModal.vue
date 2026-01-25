<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="tt.header()"
    class="from-other-fmt-modal"
    maximizable
  >
    <Listbox
      v-model="selectedFormat"
      :options="portFormatRegister"
      checkmark
      optionLabel="name"
      class="format-listbox"
    >
      <template #option="{ option: format }">
        {{ format.name }}
        <span class="accept">{{ format.accept.join(', ') }}</span>
      </template>
    </Listbox>
    <div class="format-details">
      <template v-if="selectedFormat">
        <div class="description">
          {{ selectedFormat.description || tt.noDescriptionProvided() }}
        </div>
        <div class="references" v-if="selectedFormat.reference || selectedFormat.example">
          <Button
            v-if="selectedFormat.example"
            :label="tt.showExamples()"
            size="small"
            icon="pi pi-align-left"
            :severity="showExample ? undefined : 'secondary'"
            @click="showExample = !showExample"
          />
          <Button
            v-for="item in selectedFormat.reference"
            :key="item.url"
            :label="item.name"
            size="small"
            icon="pi pi-external-link"
            severity="secondary"
            @click="openUrl(item.url)"
          />
        </div>
        <div class="example" v-if="selectedFormat.example && showExample">
          <div class="example-label">{{ tt.exampleLabel() }}</div>
          <pre class="example-pre monospace">{{ selectedFormat.example }}</pre>
        </div>
        <hr />
        <CodeMirror class="input-cm" showLineNumbers v-model:content="inputText" />
        <div class="action-buttons">
          <Button
            :label="tt.fromFile()"
            icon="pi pi-paperclip"
            severity="secondary"
            @click="handleOpenFromFile"
          />
          <div style="flex: 1"></div>
          <Button
            :label="tt.cancel()"
            icon="pi pi-times"
            severity="secondary"
            @click="visible = false"
          />
          <Button
            :label="tt.import()"
            icon="pi pi-arrow-right"
            :disabled="!inputText"
            @click="handleImport"
          />
        </div>
      </template>
      <EmptyTip
        v-else
        class="require-select-tip"
        :title="tt.requireSelectFormat()"
        icon="pi-file"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { ref } from 'vue'

import { type Convert as CV, portFormatRegister } from '@core/convert'
import { fileState as FS, simpleChooseTextFile } from '@core/file'

import CodeMirror from '@ui/components/CodeMirror.vue'
import EmptyTip from '@ui/components/EmptyTip.vue'
import { Button, Dialog, Listbox } from 'primevue'

const tt = t.importFromOtherFormats

const [visible] = defineModel<boolean>({ required: true })

const selectedFormat = ref<CV.Format | undefined>(portFormatRegister[0])
const showExample = ref(false)
const inputText = ref('')

async function handleOpenFromFile() {
  if (!selectedFormat.value) return
  const file = await simpleChooseTextFile(
    selectedFormat.value.accept,
    selectedFormat.value.name,
    'from-other-format',
  )
  if (!file) return
  inputText.value = file || ''
}
async function handleImport() {
  if (!selectedFormat.value) return
  try {
    const persist = selectedFormat.value.parser(inputText.value)
    await FS.importPersist(persist)
    visible.value = false
  } catch (err) {
    console.error(err)
  }
}
function openUrl(url: string) {
  window.open(url, '_blank')
}
</script>

<style lang="scss">
.from-other-fmt-modal {
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
    gap: 1rem;
  }
  .format-listbox {
    min-width: 12rem;
    --p-listbox-option-padding: 0.5rem 1.2rem 0.5rem 1rem;
    .accept {
      margin-inline-start: 0.3rem;
      opacity: 0.5;
    }
    .p-listbox-list-container {
      max-height: unset !important;
    }
  }
  .format-details {
    width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    position: relative;
    .description {
      opacity: 0.8;
    }
    .references {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .example {
      user-select: text;
      cursor: text;
      white-space: pre-wrap;
      padding: 0.5rem;
      font-size: 0.9rem;
      background-color: var(--p-listbox-background);
      border: 1px solid var(--p-listbox-border-color);
      border-radius: var(--p-listbox-border-radius);
      .example-label {
        font-family: var(--font-main);
        display: block;
        opacity: 0.7;
        margin-bottom: 0.2rem;
      }
      .example-pre {
        margin: 0;
      }
    }
  }
  .input-cm {
    height: 0;
    flex: 1;
  }
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }
  .require-select-tip {
    gap: 0.3rem;
  }
}
</style>
