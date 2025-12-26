<template>
  <Transition name="fold-trans">
    <div class="fold-shell" :class="props.class" v-if="!props.folded">
      <div class="fold-shell-inner">
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
const props = defineProps<{
  class?: string
  folded?: boolean
}>()
</script>

<style lang="scss" scoped>
.fold-shell {
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transition: grid-template-rows var(--s-motion-duration-short4, 0.15s)
    var(--s-motion-easing-emphasized, cubic-bezier(0.2, 0, 0, 1));
}
.fold-shell-inner {
  min-height: 0;
}
.fold-trans {
  &-enter-from,
  &-leave-to {
    grid-template-rows: 0fr;
  }
}
</style>
