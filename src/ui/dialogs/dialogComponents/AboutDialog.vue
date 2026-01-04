<template>
  <Dialog v-model:visible="visible" header="关于" class="about-dialog">
    <div class="heading">
      <img .src="'/brand.svg'" class="logo" draggable="false" />
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
    <div class="actions" :class="{ beta: isBeta }">
      <Button
        severity="secondary"
        icon="pi pi-github"
        label="GitHub 仓库"
        @click="handleOpenGithub()"
      />
      <Button
        v-if="isBeta"
        severity="secondary"
        icon="pi pi-history"
        label="Beta 部署日志"
        @click="handleOpenBetaDeployLog()"
      />
      <Button
        :severity="keyValueFolded ? 'secondary' : 'primary'"
        icon="pi pi-info-circle"
        label="展开详细信息"
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
        <span class="key">构建时间</span>
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
const appChannel = __APP_BUILD_CHANNEL__
const isBeta = __APP_IS_BETA__
const buildTimestamp = __APP_BUILD_TIMESTAMP__
const readableBuildDate = new Date(buildTimestamp).toLocaleString()
const amllCoreVersion = __AMLL_CORE_VERSION__
const amllVueVersion = __AMLL_VUE_VERSION__

function handleOpenGithub() {
  window.open(__REPO_URL__, '_blank')
}
function handleOpenBetaDeployLog() {
  window.open(__BETA_DEPLOY_LOG_URL__, '_blank')
}
</script>

<style lang="scss">
.about-dialog {
  width: 32rem;

  .heading {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .logo {
    width: 4rem;
    height: 4rem;
  }
  .logo-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    line-height: 1;
  }
  .title-version {
    opacity: 0.7;
  }
  .title {
    font-size: 2rem;
  }
  .description {
    margin: 0.75rem 0;
    line-height: 1.5;
    opacity: 0.9;
    p {
      margin: 0.5rem 0;
    }
  }
  .actions {
    display: flex;
    gap: 1rem;
    &.beta {
      justify-content: space-between;
    }
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
