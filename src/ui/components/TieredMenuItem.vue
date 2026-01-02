<template>
  <a
    class="p-tieredmenu-item-link"
    :class="{ context: props.context }"
    tabindex="-1"
    data-pc-section="itemlink"
    v-bind="props.binding.action"
  >
    <span
      v-if="props.item.icon"
      class="p-tieredmenu-item-icon"
      :class="props.item.icon"
      data-pc-section="itemicon"
    ></span>
    <span class="p-tieredmenu-item-label" data-pc-section="itemlabel">
      {{ props.item.label }}
    </span>
    <span style="flex: 1"></span>
    <svg
      v-if="props.item.items && props.item.items.length > 0"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="p-icon p-tieredmenu-submenu-icon"
      aria-hidden="true"
      data-pc-section="submenuicon"
    >
      <path
        d="M5.25 11.1728C5.14929 11.1694 5.05033 11.1455 4.9592 11.1025C4.86806 11.0595 4.78666 10.9984 4.72 10.9228C4.57955 10.7822 4.50066 10.5916 4.50066 10.3928C4.50066 10.1941 4.57955 10.0035 4.72 9.86283L7.72 6.86283L4.72 3.86283C4.66067 3.71882 4.64765 3.55991 4.68275 3.40816C4.71785 3.25642 4.79932 3.11936 4.91585 3.01602C5.03238 2.91268 5.17819 2.84819 5.33305 2.83149C5.4879 2.81479 5.64411 2.84671 5.78 2.92283L9.28 6.42283C9.42045 6.56346 9.49934 6.75408 9.49934 6.95283C9.49934 7.15158 9.42045 7.34221 9.28 7.48283L5.78 10.9228C5.71333 10.9984 5.63193 11.0595 5.5408 11.1025C5.44966 11.1455 5.35071 11.1694 5.25 11.1728Z"
        fill="currentColor"
      ></path>
    </svg>
    <span v-else-if="props.item.tip" class="p-tieredmenu-item-tip" data-pc-section="itemtip">
      {{ props.item.tip }}
    </span>
  </a>
</template>

<script lang="ts" setup>
import type { TieredMenuRouterBindProps } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

const props = defineProps<{
  item: MenuItem
  binding: TieredMenuRouterBindProps
  context?: boolean
}>()
</script>

<style lang="scss">
.p-tieredmenu-item-tip {
  font-size: 0.85em;
  color: var(--p-tieredmenu-item-icon-focus-color);
  line-height: 1;
}
.p-tieredmenu-item-link.context .p-tieredmenu-item-icon {
  transform: translateX(-0.15rem);
}
</style>
