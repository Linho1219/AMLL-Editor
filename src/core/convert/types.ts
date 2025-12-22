import type { Persist } from '@core/types'

export namespace Convert {
  export interface Format {
    name: string
    description?: string
    accept: string
    example?: string
    reference?: {
      name: string
      url: string
    }[]
    parser: (content: string) => Persist
  }
}
