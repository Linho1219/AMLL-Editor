<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="从其他歌词格式导入"
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
        <span class="accept">{{ format.accept }}</span>
      </template>
    </Listbox>
    <div class="format-details">
      <template v-if="selectedFormat">
        <div class="description">{{ selectedFormat.description || '未提供说明' }}</div>
        <div class="references" v-if="selectedFormat.reference || selectedFormat.example">
          <Button
            label="显示示例"
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
        <div class="example monospace" v-if="selectedFormat.example && showExample">
          {{ selectedFormat.example }}
        </div>
        <hr />
        <CodeMirror class="input-cm" showLineNumbers v-model:content="inputText" />
        <div class="action-buttons">
          <Button
            label="从文件打开"
            icon="pi pi-paperclip"
            severity="secondary"
            @click="handleOpenFromFile"
          />
          <div style="flex: 1"></div>
          <Button label="取消" icon="pi pi-times" severity="secondary" @click="visible = false" />
          <Button
            label="导入"
            icon="pi pi-arrow-right"
            :disabled="!inputText"
            @click="handleImport"
          />
        </div>
      </template>
      <div v-else class="require-select-tip">请在左侧选择格式</div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { simpleChooseTextFile } from '@core/file'
import { Button, Dialog, Listbox } from 'primevue'
import { ref } from 'vue'
import CodeMirror from '@ui/components/CodeMirror.vue'
import { portFormatRegister, type Convert as CV } from '@core/convert'
import { importPersist } from '@states/services/port'

const [visible] = defineModel<boolean>({ required: true })

const selectedFormat = ref<CV.Format | undefined>(portFormatRegister[0])
const showExample = ref(false)
const inputText = ref('')

async function handleOpenFromFile() {
  if (!selectedFormat.value) return
  const file = await simpleChooseTextFile(selectedFormat.value.accept)
  if (!file) return
  inputText.value = file.content || ''
}
function handleImport() {
  if (!selectedFormat.value) return
  try {
    const persist = selectedFormat.value.parser(inputText.value)
    importPersist(persist)
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
      &::before {
        font-family: var(--font-main);
        content: '示例格式';
        display: block;
        opacity: 0.7;
        margin-bottom: 0.2rem;
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
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    margin: auto;
    width: max-content;
    height: max-content;
    font-size: 1.5rem;
    opacity: 0.5;
  }
}
</style>
