<script setup lang="ts">
import { type PreferenceSchema, getDefaultPref } from '@core/pref'

import { usePrefStore, useStaticStore } from '@states/stores'

import PrefItem from './PrefItem.vue'
import PrefNumberItem from './PrefNumberItem.vue'
import PrefSwitchItem from './PrefSwitchItem.vue'
import { Button } from 'primevue'

const prefStore = usePrefStore()
const staticStore = useStaticStore()
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
</script>

<template>
  <div class="pref-panel">
    <div class="pref-group">
      <div class="pref-group-title">数据</div>
      <PrefSwitchItem pref-key="autoSaveEnabled" label="自动保存" desc="仅在授予写入权限后生效" />
      <PrefNumberItem
        pref-key="autoSaveIntervalMinutes"
        label="自动保存间隔"
        desc="单位为分钟"
        :disabled="!prefStore.autoSaveEnabled"
      />
      <PrefNumberItem
        pref-key="maxUndoSteps"
        label="历史记录快照数"
        desc="允许撤销的最大步数"
        :min="1"
        :max="1000"
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">按键</div>
      <PrefSwitchItem
        pref-key="macStyleShortcuts"
        label="Mac OS 风格组合键"
        desc="使用 ⌘、⌥ 等符号展示组合键"
      />
      <PrefItem label="按键绑定" desc="打开快捷键设置窗口">
        <Button severity="secondary" label="设置" icon="pi pi-arrow-up-right" iconPos="right" />
      </PrefItem>
    </div>
    <div class="pref-group">
      <div class="pref-group-title">时轴</div>
      <PrefNumberItem
        pref-key="globalLatency"
        label="全局延时补偿"
        desc="设备音频播放延时，单位为毫秒"
        :disabled="!prefStore.autoSaveEnabled"
      />
      <PrefSwitchItem
        pref-key="alwaysIgnoreBackground"
        label="始终忽略背景行"
        desc="在时轴页上始终跳过背景行"
      />
      <PrefSwitchItem
        pref-key="hideLineTiming"
        label="隐藏行时间戳"
        desc="自动从音节生成行时间戳"
        experimental
      />
      <PrefSwitchItem
        pref-key="autoConnectLineTimes"
        label="自动连接行时间"
        desc="自动将间隔较近的相邻行时间戳连接起来"
        :disabled="!prefStore.hideLineTiming"
        experimental
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">音译</div>
      <PrefSwitchItem
        pref-key="swapTranslateRoman"
        label="交换翻译与音译框位置"
        desc="在内容也将音译框置于左侧，并影响查找顺序"
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
          icon="pi pi-arrow-right"
          iconPos="right"
          @click="handleReset"
        />
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
