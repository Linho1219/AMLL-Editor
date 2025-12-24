<script setup lang="ts">
import { useStaticStore } from '@states/stores'
import { Button, Dialog } from 'primevue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
const staticStore = useStaticStore()
const currResolver = shallowRef<null | ((value: boolean) => void)>(null)
const visible = computed(() => currResolver.value !== null)

onMounted(() => (staticStore.waitForDataDropConfirmHook = waitForConfirm))
onBeforeUnmount(() => {
  if (staticStore.waitForDataDropConfirmHook === waitForConfirm)
    staticStore.waitForDataDropConfirmHook = null
})

const resolveCurrent = (value: boolean) => {
  if (currResolver.value) {
    currResolver.value(value)
    currResolver.value = null
  } else console.warn('No current resolver to resolve')
}

function waitForConfirm(): Promise<boolean> {
  return new Promise((resolve) => {
    if (visible.value) {
      // Already showing, do not stack
      resolve(false)
      return
    }
    currResolver.value = resolve
  })
}

function handleCancel() {
  resolveCurrent(false)
}
function handleContinue() {
  resolveCurrent(true)
}
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" header="警告" class="drop-data-confirm" modal>
    <template #container>
      <div class="content">
        <div class="icon-field">
          <span class="pi pi-exclamation-triangle icon" />
        </div>
        <div class="text">
          <div class="heading">您有未保存的工作</div>
          <div class="description">如果继续，所有未保存的更改将会丢失。此操作不可撤销。</div>
        </div>
      </div>
      <div class="actions" @keydown="handleKeyDown">
        <Button label="取消" icon="pi pi-times" severity="secondary" @click="handleCancel" />
        <Button
          label="继续"
          icon="pi pi-arrow-right"
          severity="danger"
          @click="handleContinue"
          autofocus
        />
      </div>
    </template>
  </Dialog>
</template>

<style lang="scss">
.drop-data-confirm {
  padding: 1.75rem 1rem 1rem;
  .content {
    display: flex;
    align-items: center;
    gap: 1rem;
    .icon-field {
      display: flex;
      align-items: center;
      justify-content: center;
      .icon {
        font-size: 2rem;
        color: var(--p-button-danger-background);
      }
    }
    .text {
      .heading {
        font-weight: bold;
        font-size: 1.1rem;
        margin-bottom: 0.2rem;
      }
      .description {
        font-size: 0.9rem;
        opacity: 0.8;
      }
    }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1rem;
  }
}
</style>
