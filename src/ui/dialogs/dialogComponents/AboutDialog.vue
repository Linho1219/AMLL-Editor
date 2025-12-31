<template>
  <Dialog v-model:visible="visible" header="关于" class="about-dialog">
    <div class="heading">
      <img .src="'/brand.svg'" class="logo" />
      <div class="logo-text">
        <div class="title">{{ appName }}</div>
        <div class="title-version">
          版本 {{ appVersion
          }}<template v-if="isBeta">-beta-{{ appCommitHash.substring(0, 7) }}</template>
        </div>
      </div>
    </div>
    <Divider />
    <div class="description">
      <p>
        基于 Vue 的开源逐音节歌词编辑器，可与 AMLL 生态软件协作，目标成为 AMLL TTML Tool 的继任者。
      </p>
      <p>开发不易，不妨点个免费的 star 吧！</p>
    </div>
    <div class="actions">
      <Button
        severity="secondary"
        icon="pi pi-github"
        label="GitHub 仓库"
        @click="handleOpenGithub()"
      />
      <Button
        :severity="keyValueFolded ? 'secondary' : 'primary'"
        icon="pi pi-info-circle"
        label="详细版本信息"
        @click="keyValueFolded = !keyValueFolded"
      />
    </div>
    <AnimatedFold :folded="keyValueFolded">
      <Divider />
      <div class="key-value">
        <span class="key">版本号</span>
        <span class="value">{{ appVersion }}</span>
        <span class="key">构建通道</span>
        <span class="value">{{ appChannel ?? '未指定' }}</span>
        <span class="key">Commit Hash</span>
        <span class="value">{{ appCommitHash }}</span>
        <span class="key">构建日期</span>
        <span class="value">{{ readableBuildDate }}</span>
        <span class="key">AMLL 核心库版本</span>
        <span class="value">{{ amllCoreVersion }}</span>
        <span class="key">AMLL Vue 绑定版本</span>
        <span class="value">{{ amllVueVersion }}</span>
      </div>
    </AnimatedFold>
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import AnimatedFold from '@ui/components/AnimatedFold.vue'
import { Button, Dialog, Divider } from 'primevue'

const [visible] = defineModel<boolean>({ required: true })

const keyValueFolded = ref(true)

const appName = __APP_DISPLAY_NAME__
const appVersion = __APP_VERSION__
const appCommitHash = __APP_COMMIT_HASH__
const appChannel = import.meta.env.VITE_BUILD_CHANNEL
const isBeta = import.meta.env.VITE_BUILD_CHANNEL === 'BETA'
const buildTimestamp = __APP_BUILD_TIMESTAMP__
const readableBuildDate = new Date(buildTimestamp).toLocaleString()
const amllCoreVersion = __AMLL_CORE_VERSION__
const amllVueVersion = __AMLL_VUE_VERSION__

function handleOpenGithub() {
  window.open(__REPO_URL__, '_blank')
}
</script>

<style lang="scss">
.about-dialog {
  width: 30rem;

  .heading {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1rem;
  }
  .logo {
    width: 4rem;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    line-height: 1;
  }
  .title-version {
    font-size: 1.1rem;
    opacity: 0.7;
  }
  .title {
    font-size: 2rem;
    font-weight: 300;
  }
  .description {
    margin: 1.2rem 0;
    line-height: 1.5;
    opacity: 0.9;
    p {
      margin: 0.5rem 0;
    }
  }
  .actions {
    display: flex;
    gap: 1rem;
  }
  .key-value {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin-top: 1rem;
    user-select: text;
  }
  .key {
    font-weight: bold;
    opacity: 0.6;
  }
  .value {
    word-break: break-all;
    font-family: var(--font-monospace);
  }
}
</style>
