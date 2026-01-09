import { t } from '@i18n'

const tt = t.sidebar.metadata.templates

export interface MetadataTemplate {
  name: string
  fields: {
    key: string
    label: string
    discription?: string
    validation?: {
      validator: (s: string) => boolean
      message: string
      severity: 'error' | 'warning'
    }
  }[]
  docUrl?: string
}

const lrcNormalFields = ['ti', 'ar', 'al', 'au', 'lr', 'by', 're'] as const
export const lrcMetaTemplate = {
  name: tt.lrc.label(),
  fields: [
    ...lrcNormalFields.map((key) => ({
      key,
      label: tt.lrc[key](),
    })),
    {
      key: 'length',
      label: tt.lrc.len(),
      validation: {
        validator: (s) => /^\d{1,2}:\d{1,2}(\.\d{1,3})?$/.test(s),
        message: tt.lrc.lenValidationMsg(),
        severity: 'error',
      },
    },
  ],
  docUrl: 'https://en.wikipedia.org/wiki/LRC_(file_format)',
} as const satisfies MetadataTemplate

const amllNormalFields = [
  'musicName',
  'artists',
  'album',
  'ncmMusicId',
  'qqMusicId',
  'spotifyId',
  'appleMusicId',
  'isrc',
  'ttmlAuthorGithub',
  'ttmlAuthorGithubLogin',
] as const
export const amllMetaTemplate = {
  name: tt.amll.label(),
  fields: amllNormalFields.map((key) => ({
    key,
    label: tt.amll[key](),
  })),
  docUrl:
    'https://github.com/Steve-xmh/amll-ttml-tool/wiki/%E6%AD%8C%E8%AF%8D%E5%85%83%E6%95%B0%E6%8D%AE',
} as const satisfies MetadataTemplate
