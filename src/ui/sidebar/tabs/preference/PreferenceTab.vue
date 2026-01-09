<script setup lang="ts">
import { t } from '@i18n'

import { compatibilityMap } from '@core/compat'
import { type PreferenceSchema, getDefaultPref } from '@core/pref'

import { usePrefStore, useRuntimeStore, useStaticStore } from '@states/stores'

import PrefItem from './PrefItem.vue'
import PrefNumberItem from './PrefNumberItem.vue'
import PrefSwitchItem from './PrefSwitchItem.vue'
import { Button } from 'primevue'

const tt = t.sidebar.preference

const prefStore = usePrefStore()
const staticStore = useStaticStore()
const runtimeStore = useRuntimeStore()

async function handleReset() {
  const confirmed = await staticStore.waitForConfirmHook?.({
    header: tt.resetConfirm.header(),
    message: tt.resetConfirm.message(),
    acceptLabel: tt.resetConfirm.action(),
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
      <div class="pref-group-title">{{ tt.groups.data() }}</div>
      <PrefSwitchItem pref-key="autoSaveEnabled" :disabled="!compatibilityMap.fileSystem" />
      <PrefNumberItem
        pref-key="autoSaveIntervalMinutes"
        :disabled="!compatibilityMap.fileSystem || !prefStore.autoSaveEnabled"
        :min="1"
        :max="60"
      />
      <PrefNumberItem pref-key="maxUndoSteps" :min="1" :max="5000" placeholder="100" />
      <PrefSwitchItem pref-key="packAudioToProject" />
      <PrefSwitchItem pref-key="ttmlAsDefault" experimental />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.key() }}</div>
      <PrefItem :label="tt.items.keyBinding()" :desc="tt.items.keyBindingDesc()">
        <Button
          severity="secondary"
          :label="tt.items.keyBindingAction()"
          icon="pi pi-arrow-up-right"
          iconPos="right"
          @click="runtimeStore.dialogShown.keyBinding = !runtimeStore.dialogShown.keyBinding"
        />
      </PrefItem>
      <PrefSwitchItem pref-key="macStyleShortcuts" />
      <PrefNumberItem pref-key="audioSeekingStepMs" :min="100" :max="20000" placeholder="5,000" />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.content() }}</div>
      <PrefSwitchItem pref-key="swapTranslateRoman" />
      <PrefSwitchItem pref-key="sylRomanEnabled" experimental />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.timing() }}</div>
      <PrefNumberItem pref-key="globalLatencyMs" placeholder="0" :min="-5000" :max="5000" />
      <PrefSwitchItem pref-key="alwaysIgnoreBackground" />
      <PrefSwitchItem pref-key="hideLineTiming" experimental />
      <PrefSwitchItem
        pref-key="autoConnectLineTimes"
        :disabled="!prefStore.hideLineTiming"
        experimental
      />
      <PrefNumberItem
        pref-key="autoConnectThresholdMs"
        :min="0"
        :max="5000"
        :disabled="!prefStore.hideLineTiming || !prefStore.autoConnectLineTimes"
      />
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.spectrogram() }}</div>
      Not implemented yet
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.compatibility() }}</div>
      <PrefSwitchItem pref-key="notifyCompatIssuesOnStartup" />
      <PrefItem :label="tt.items.compatibilityReport()" :desc="tt.items.compatibilityReportDesc()">
        <Button
          severity="secondary"
          :label="tt.items.compatibilityReportAction()"
          icon="pi pi-arrow-up-right"
          iconPos="right"
          @click="runtimeStore.dialogShown.compatibility = !runtimeStore.dialogShown.compatibility"
        />
      </PrefItem>
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.reset() }}</div>
      <PrefItem :label="tt.items.resetAll()" :desc="tt.items.resetAllDesc()">
        <Button
          severity="danger"
          variant="outlined"
          :label="tt.items.resetAllAction()"
          icon="pi pi-sync"
          @click="handleReset"
        />
      </PrefItem>
    </div>
    <div class="pref-group">
      <div class="pref-group-title">{{ tt.groups.about() }}</div>
      <PrefItem :label="tt.items.aboutApp(displayName)" :desc="tt.items.aboutAppDesc()">
        <Button
          severity="secondary"
          :label="tt.items.aboutAppAction()"
          icon="pi pi-arrow-up-right"
          iconPos="right"
          @click="runtimeStore.dialogShown.about = !runtimeStore.dialogShown.about"
        />
      </PrefItem>
      <PrefItem :label="tt.items.githubRepo()" :desc="tt.items.githubRepoDesc()">
        <Button
          severity="secondary"
          :label="tt.items.githubRepoAction()"
          icon="pi pi-github"
          @click="openGithubRepo()"
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
