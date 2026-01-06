<template>
  <Dialog
    v-model:visible="visible"
    :header="t.hotkey.dialogHeader()"
    class="key-binding-dialog"
    disable-global-hotkeys
  >
    <div class="list-shell" v-for="(group, index) in groupedCmdList">
      <Divider v-if="index !== 0" />
      <div class="title">{{ t.hotkey.groupTitles[group.title] }}</div>
      <div class="list">
        <template v-for="command in group.commands" :key="command">
          <label :for="command">{{ t.hotkey.commands[command]() }}</label>
          <HotKeyGroupInput
            v-model="prefStore.hotkeyMap[command]"
            :id="command"
            @click="(e: MouseEvent) => handleFieldClick(e, command)"
            :placeholder="t.hotkey.notBinded()"
          />
        </template>
      </div>
    </div>
    <Popover ref="op">
      <HotKeyPopup v-if="currentBindingCommand" :command="currentBindingCommand" />
    </Popover>
  </Dialog>
</template>

<script setup lang="ts">
import { t } from '@i18n'
import { nextTick, ref, useTemplateRef } from 'vue'

import type { HotKey } from '@core/hotkey/types'

import { usePrefStore } from '@states/stores'

import type { Equal, Expect } from '@utils/types'

import HotKeyGroupInput from '@ui/components/HotKeyGroupInput.vue'
import HotKeyPopup from '@ui/components/HotKeyPopup.vue'
import { Dialog, Divider, Popover } from 'primevue'

const prefStore = usePrefStore()
const op = useTemplateRef('op')

const [visible] = defineModel<boolean>({ required: true })

const currentBindingCommand = ref<HotKey.Command | null>(null)
function handleFieldClick(e: MouseEvent, command: HotKey.Command) {
  if (currentBindingCommand.value !== command) {
    console.log(command, currentBindingCommand.value)
    currentBindingCommand.value = command
    op.value?.hide()
  }
  nextTick(() => op.value?.show(e))
  console.log(command)
}

const groupedCmdList = [
  {
    title: 'file',
    commands: ['open', 'save', 'saveAs', 'new', 'exportToClipboard', 'importFromClipboard'],
  },
  {
    title: 'view',
    commands: ['switchToContent', 'switchToTiming', 'switchToPreview', 'preferences'],
  },
  {
    title: 'editing',
    commands: [
      'batchSplitText',
      'batchTimeShift',
      'metadata',
      'undo',
      'redo',
      'bookmark',
      'find',
      'replace',
      'delete',
      'selectAllLines',
      'selectAllSyls',
      'breakLine',
      'duet',
      'background',
    ],
  },
  {
    title: 'timing',
    commands: [
      'markBegin',
      'markEndBegin',
      'markEnd',
      'goPrevLine',
      'goPrevSyl',
      'goPrevSylnPlay',
      'goNextLine',
      'goNextSyl',
      'goNextSylnPlay',
      'playCurrSyl',
    ],
  },
  {
    title: 'audio',
    commands: [
      'chooseMedia',
      'seekBackward',
      'volumeUp',
      'playPauseAudio',
      'seekForward',
      'volumeDown',
    ],
  },
] as const satisfies {
  title: keyof (typeof t)['hotkey']['groupTitles']
  commands: HotKey.Command[]
}[]
type _Check = Expect<Equal<(typeof groupedCmdList)[number]['commands'][number], HotKey.Command>>
</script>

<style lang="scss">
.key-binding-dialog {
  .list-shell + .list-shell {
    margin-top: 1.2rem;
  }
  .p-divider {
    margin: 0 0 0.8rem;
  }
  .title {
    font-weight: bold;
    opacity: 0.6;
    margin-bottom: 0.8rem;
    margin-left: 0.5rem;
  }
  .list {
    display: grid;
    grid-template-columns: 8rem 8rem 8rem 8rem 8rem 8rem;
    @media screen and (max-width: 800px) {
      grid-template-columns: 8rem 8rem 8rem 8rem;
    }
    gap: 0.6rem 0.8rem;
    align-items: center;

    label {
      justify-self: end;
      margin-left: 1rem;
    }
  }
}
</style>
