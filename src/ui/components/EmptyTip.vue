<template>
  <div class="empty-tip" :class="{ compact: props.compact }">
    <i class="pi empty-tip-icon" :class="props.icon || 'pi-asterisk'"></i>
    <div class="empty-tip-title">{{ props.title || t.components.emptyTipDefault() }}</div>
    <div class="empty-tip-tip" v-if="props.tip">{{ props.tip }}</div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@i18n'

const props = defineProps<{
  title?: string
  tip?: string
  icon?: string
  compact?: boolean
}>()
</script>

<style lang="scss">
.empty-tip {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
  width: fit-content;
  height: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: light-dark(var(--p-zinc-500), var(--p-zinc-400));
  &.compact {
    gap: 0.3rem;
  }
}
.pi.empty-tip-icon {
  font-size: 1.8rem;
  opacity: 0.8;
  padding: 1rem;
  border-radius: 50%;
  // EASTER EGG
  &.pi-asterisk {
    transition: transform 0.3s;
    &:hover {
      animation: rot60deg 0.6s infinite;
    }
  }
}
@keyframes rot60deg {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(60deg);
  }
}
.empty-tip-title {
  font-size: 1.3rem;
}
</style>
