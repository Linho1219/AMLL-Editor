import SplitTextTab from './tabs/syllabify/Syllabify.vue'
import MetadataTab from './tabs/metadata/MetadataTab.vue'

export enum SidebarKey {
  SplitText = 'SplitText',
  Metadata = 'Metadata',
}

interface SidebarTab {
  key: SidebarKey
  title: string
  component: any
}

export const sidebarRegs = {
  [SidebarKey.SplitText]: {
    key: SidebarKey.SplitText,
    title: '批量断词',
    component: SplitTextTab,
  },
  [SidebarKey.Metadata]: {
    key: SidebarKey.Metadata,
    title: '元数据',
    component: MetadataTab,
  },
} as const satisfies Record<SidebarKey, SidebarTab>
