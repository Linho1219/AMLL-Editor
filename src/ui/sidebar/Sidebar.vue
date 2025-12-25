<template>
  <aside class="sidebar" :style="{ width: prefStore.sidebarWidth + 'px' }">
    <div
      v-if="currentSidebarTab && runtimeStore.openedSidebars.length === 1"
      class="sidebar-title single"
    >
      <div
        class="sidebar-title-single-text"
        @mousedown="(e) => e.button === 1 && runtimeStore.closeCurrentSidebar()"
      >
        {{ currentSidebarTab.title }}
      </div>
      <Button
        icon="pi pi-times"
        variant="text"
        severity="secondary"
        @click="runtimeStore.closeCurrentSidebar"
      />
    </div>
    <div v-else class="sidebar-title multiple">
      <Tabs v-model:value="runtimeStore.currentSidebarIndex">
        <TabList>
          <Tab v-for="(tab, index) in openedSidebarTabs" :key="tab.key" :value="index">
            <div
              class="p-tab-inner"
              @mousedown="(e) => e.button === 1 && runtimeStore.closeSidebar(tab.key)"
            >
              {{ tab.title }}
              <Button
                icon="pi pi-times"
                size="small"
                variant="text"
                severity="secondary"
                rounded
                @click.stop="runtimeStore.closeSidebar(tab.key)"
              />
            </div>
          </Tab>
        </TabList>
      </Tabs>
    </div>
    <KeepAlive>
      <component class="sidebar-inner" :is="currentSidebarTab?.component" />
    </KeepAlive>
    <div class="sidebar-resizer" @mousedown="handleResizeStart"></div>
  </aside>
</template>

<script setup lang="ts">
import { useRuntimeStore, usePrefStore } from '@states/stores'
import { computed } from 'vue'
import { sidebarRegs } from '.'
import { Button, Tab, TabList, Tabs } from 'primevue'

const runtimeStore = useRuntimeStore()
const prefStore = usePrefStore()

const openedSidebarTabs = computed(() => runtimeStore.openedSidebars.map((key) => sidebarRegs[key]))
const currentSidebarTab = computed(() => openedSidebarTabs.value[runtimeStore.currentSidebarIndex])

const MIN_SIDEBAR_WIDTH = 200
function handleResizeStart(e: MouseEvent) {
  const startX = e.clientX
  const startWidth = prefStore.sidebarWidth
  function handleMouseMove(e: MouseEvent) {
    const deltaX = e.clientX - startX
    prefStore.sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, startWidth + deltaX)
  }
  function handleMouseUp() {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}
</script>

<style lang="scss">
@keyframes sidebar-enter {
  from {
    transform: translateX(-5rem);
  }
}
.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--p-content-border-color);
  position: relative;
  animation:
    sidebar-enter 0.4s cubic-bezier(0, 1, 0, 1),
    fade 0.3s;
  margin: 0.5rem 0;
}
.sidebar-title {
  height: 3.5rem;
  &.single {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0.5rem 0 1rem;
  }
  &.multiple {
    --p-tabs-tab-padding: 0.9rem 0.6rem 0.9rem 1rem;
    --p-tabs-active-bar-height: 2px;
    --p-tabs-tablist-border-width: 0;
    --p-tabs-tablist-border-color: transparent;
    --p-tabs-tab-active-background: var(--global-background);
    --p-button-sm-icon-only-width: 1.3rem;
    --p-button-sm-font-size: 0.8rem;
    .p-tablist-active-bar {
      display: none;
    }
    .p-tab {
      padding: 0;
      animation: sidebar-tab-in 0.25s cubic-bezier(0, 1, 0.5, 1);
      border: none;
      border-top: solid var(--p-tabs-active-bar-height) transparent;
      &-active {
        border-top-color: var(--p-primary-color);
      }
      &:nth-child(1) {
        animation: none;
      }
    }
    @keyframes sidebar-tab-in {
      from {
        opacity: 0;
        transform: translateY(1rem);
      }
    }

    .p-tab-inner {
      padding: var(--p-tabs-tab-padding);
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
  }
}
.sidebar-title-single-text {
  font-size: 1.4rem;
}
.sidebar-inner {
  height: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0.8rem 0 1rem;
  margin: 0.5rem 0 0.3rem;
}
.sidebar-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -0.15rem;
  width: 0.3rem;
  background-color: var(--p-primary-color);
  z-index: 3;
  opacity: 0;
  transition: opacity 0.1s;
  &:hover {
    opacity: 0.7;
    transition-delay: 0.3s;
  }
  &:active {
    opacity: 0.7;
    transition: opacity 0.1s;
  }
  &,
  :root:has(&:active) {
    cursor: ew-resize;
  }
}
</style>
