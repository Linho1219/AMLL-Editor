<template>
  <div class="timestamp" ref="timestampEl" :class="{ begin: props.begin, end: props.end }">
    <div class="timestamp-caption" v-if="!showInput" @dblclick="showInput = true">
      {{ ms2str(upstream) }}
    </div>
    <InputText
      v-else
      class="timestamp-input"
      v-model.lazy="inputModel"
      @blur="showInput = false"
      ref="input"
      size="small"
      v-keyfilter="/[0-9:.]/"
    />
  </div>
</template>

<script setup lang="ts">
import { ms2str, str2ms } from '@/utils/timeModel'
import InputText from '@/components/repack/InputText.vue'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  begin?: boolean
  end?: boolean
}>()

const upstream = defineModel<number>({ required: true })
const inputModel = computed({
  get: () => ms2str(upstream.value),
  set: (val: string) => {
    const ms = str2ms(val)
    if (ms !== null) upstream.value = ms
  },
})
const input = useTemplateRef('input')
const showInput = ref(false)
watch(showInput, (v) => {
  if (v) nextTick(() => input.value?.input?.select())
})

const timestampEl = useTemplateRef('timestampEl')
watch(upstream, () => {
  if (!timestampEl.value) return
  // Can't use Vue's reactivity to control here: Vue will batch DOM updates
  timestampEl.value.classList.remove('flashing')
  void timestampEl.value.offsetWidth
  timestampEl.value.classList.add('flashing')
})
</script>

<style lang="scss">
.timestamp {
  &.begin {
    --timestamp-color: var(--p-button-text-success-color);
  }
  &.end {
    --timestamp-color: var(--p-button-text-danger-color);
  }
  --timestamp-bg-color: color-mix(in srgb, var(--timestamp-color), transparent 80%);
  --timestamp-hlt-color: color-mix(in srgb, var(--timestamp-color), transparent 40%);
  --timestamp-selection-bg-color: color-mix(in srgb, var(--timestamp-color), transparent 40%);

  font-family: var(--font-monospace);
  --p-inputtext-sm-padding-y: 0.3rem;
  --p-inputtext-sm-padding-x: 0.4rem;
  --p-inputtext-background: var(--timestamp-bg-color);
  --p-inputtext-focus-border-color: var(--timestamp-color);
  ::selection {
    background-color: var(--timestamp-selection-bg-color);
  }

  @keyframes timestamp-flash {
    from {
      background-color: var(--timestamp-hlt-color);
    }
  }
  &.flashing {
    animation: timestamp-flash 0.5s ease-in-out;
  }
}
.timestamp-caption {
  padding-block: var(--p-inputtext-sm-padding-y);
  padding-inline: var(--p-inputtext-sm-padding-x);
  border-radius: var(--p-inputtext-border-radius);
  background: var(--p-inputtext-background);
  font-size: var(--p-inputtext-sm-font-size);
  border: 1px solid transparent;
}
.timestamp-caption,
.timestamp-input {
  line-height: 1.2;
  box-sizing: content-box;
  width: 9ch;
  color: inherit;
}
</style>
