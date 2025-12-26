import type { Persist } from '@core/types'

export namespace Convert {
  export interface FormatManifest {
    name: string
    description?: string
    mime: string
    accept: string[]
    example?: string
    reference?: {
      name: string
      url: string
    }[]
  }
  export interface Format extends FormatManifest {
    parser: (content: string) => Persist
    stringifier: (data: Persist) => string
  }
}
