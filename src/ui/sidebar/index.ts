import type { Component } from 'vue'

import type { ValueOf } from '@utils/types'

import MetadataTab from './tabs/metadata/MetadataTab.vue'
import PreferenceTab from './tabs/preference/PreferenceTab.vue'
import SplitTextTab from './tabs/syllabify/Syllabify.vue'

export const SidebarKey = {
  SplitText: 'SplitText',
  Metadata: 'Metadata',
  Preference: 'Preference',
} as const
export type SidebarKey = ValueOf<typeof SidebarKey>

interface SidebarTab {
  key: SidebarKey
  title: string
  component: Component
}

export const sidebarRegs = {
  [SidebarKey.SplitText]: {
    key: SidebarKey.SplitText,
    title: '批量断字',
    component: SplitTextTab,
  },
  [SidebarKey.Metadata]: {
    key: SidebarKey.Metadata,
    title: '元数据',
    component: MetadataTab,
  },
  [SidebarKey.Preference]: {
    key: SidebarKey.Preference,
    title: '偏好设置',
    component: PreferenceTab,
  },
} as const satisfies Record<SidebarKey, SidebarTab>
