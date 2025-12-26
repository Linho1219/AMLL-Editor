<template>
  <InputText
    v-model="innerModel"
    ref="inputComponent"
    @focus="handleFocus"
    @blur="handleBlur"
    @keydown="handleKeydown"
  />
</template>
<script setup lang="ts">
import { onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { InputText, type InputTextProps } from 'primevue'

defineProps</* @vue-ignore */ InputTextProps>()

// expose input element
const inputComponent = useTemplateRef<typeof InputText>('inputComponent')
const inputEl = shallowRef<HTMLInputElement | null>(null)
onMounted(() => (inputEl.value = (inputComponent.value as any).$el as HTMLInputElement))
defineExpose({ input: inputEl })

// better v-model handling with modifiers
const [model, modifiers] = defineModel<string | null | undefined>()
const innerModel = ref<string | null | undefined>(model.value)
function processor(val: string | null | undefined) {
  if (modifiers.trim) val = val?.trim()
  return val
}
watch(innerModel, (val) => {
  if (modifiers.lazy) return
  model.value = processor(val)
})
const focused = ref(false)
const handleFocus = () => {
  focused.value = true
}
const handleBlur = () => {
  focused.value = false
  if (modifiers.lazy) {
    model.value = processor(innerModel.value)
    innerModel.value = model.value
  }
}
const handleKeydown = (e: KeyboardEvent) => {
  if (!modifiers.escapeEnter && e.key === 'Enter') inputEl.value?.blur()
}
watch(model, (val) => {
  if (!focused.value || !modifiers.lazy) innerModel.value = val
})
</script>
