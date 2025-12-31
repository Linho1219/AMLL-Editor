<script setup lang="ts">
import { compatibilityMap } from '@core/compat'
import { type PreferenceSchema, getDefaultPref } from '@core/pref'

import { usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'

import PrefItem from './PrefItem.vue'
import PrefNumberItem from './PrefNumberItem.vue'
import PrefSwitchItem from './PrefSwitchItem.vue'
import { Button } from 'primevue'

const prefStore = usePrefStore()
const staticStore = useStaticStore()
const runtimeStore = useRuntimeStore()

async function handleReset() {
  const confirmed = await staticStore.waitForConfirmHook?.({
    header: '重置全部选项',
    message: '确定要将所有选项恢复为默认值吗？此操作不可撤销。',
    acceptLabel: '重置',
    acceptIcon: 'pi pi-sync',
  })
  if (!confirmed) return
  const defaultPrefs = getDefaultPref()
  for (const [_key, value] of Object.entries(defaultPrefs)) {
    const key = _key as keyof PreferenceSchema
    ;(prefStore as any)[key] = value
  }
}

function openGithubRepo() {
  window.open(__REPO_URL__, '_blank')
}
const displayName = __APP_DISPLAY_NAME__
</script>

<template>
  <div class="pref-panel">
    <div class="pref-group">
      <div class="pref-group-title">数据</div>
      <PrefSwitchItem
        pref-key="autoSaveEnabled"
        label="自动保存"
        desc="授予写入权限后，定时保存至文件系统"
        :disabled="!compatibilityMap.fileSystem"
      />
      <PrefNumberItem
        pref-key="autoSaveIntervalMinutes"
        label="自动保存间隔"
        desc="自动保存触发的时间间隔 (分钟)"
        :disabled="!compatibilityMap.fileSystem || !prefStore.autoSaveEnabled"
        :min="1"
        :max="60"
      />
      <PrefNumberItem
        pref-key="maxUndoSteps"
        label="历史记录快照数"
        desc="允许撤销的最大步数"
        :min="1"
        :max="5000"
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">按键</div>
      <PrefItem label="按键绑定" desc="打开快捷键设置窗口">
        <Button
          severity="secondary"
          label="设置"
          icon="pi pi-arrow-up-right"
          iconPos="right"
          @click="runtimeStore.dialogShown.keyBinding = !runtimeStore.dialogShown.keyBinding"
        />
      </PrefItem>
      <PrefSwitchItem
        pref-key="macStyleShortcuts"
        label="macOS 风格组合键"
        desc="使用 ⌘、⌥ 等符号展示组合键"
      />
      <PrefNumberItem
        pref-key="audioSeekingStepMs"
        label="音频按键跳转步长"
        desc="按键快进或快退时跳转的时长 (毫秒)"
        :min="100"
        :max="20000"
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">时轴</div>
      <PrefNumberItem
        pref-key="globalLatency"
        label="全局延时补偿"
        desc="正值表示实际音频落后 (毫秒)"
        :min="-5000"
        :max="5000"
      />
      <PrefSwitchItem
        pref-key="alwaysIgnoreBackground"
        label="始终忽略背景行"
        desc="在时轴页上始终跳过背景行"
      />
      <PrefSwitchItem
        pref-key="hideLineTiming"
        label="隐藏行时间戳"
        desc="自动从音节生成行时间戳，暂未实现"
        experimental
        disabled
      />
      <PrefSwitchItem
        pref-key="autoConnectLineTimes"
        label="自动连接行时间"
        desc="自动连接间隔较近的相邻行时间戳"
        :disabled="!prefStore.hideLineTiming"
        experimental
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">音译</div>
      <PrefSwitchItem
        pref-key="swapTranslateRoman"
        label="交换翻译与音译框位置"
        desc="在内容视图将音译框置于左侧，并影响查找顺序"
      />
      <PrefSwitchItem
        pref-key="sylRomanEnabled"
        label="启用逐字音译"
        desc="在音节框下方显示逐字音译"
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">重置</div>
      <PrefItem label="重置全部选项" desc="将所有选项恢复为默认值">
        <Button
          severity="danger"
          variant="outlined"
          label="重置"
          icon="pi pi-sync"
          @click="handleReset"
        />
      </PrefItem>
    </div>
    <div class="pref-group">
      <div class="pref-group-title">关于</div>
      <PrefItem :label="`关于 ${displayName}`" desc="打开软件版本信息窗口">
        <Button
          severity="secondary"
          label="关于"
          icon="pi pi-arrow-up-right"
          iconPos="right"
          @click="runtimeStore.dialogShown.about = !runtimeStore.dialogShown.about"
        />
      </PrefItem>
      <PrefItem label="GitHub 仓库" desc="访问源代码仓库页面">
        <Button severity="secondary" label="打开" icon="pi pi-github" @click="openGithubRepo()" />
      </PrefItem>
    </div>
  </div>
</template>

<style lang="scss">
.pref-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}
.pref-group-title {
  color: var(--p-primary-color);
  font-weight: bold;
}
</style>
