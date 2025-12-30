/// <reference types="vite/client" />

declare const __VERSION__: string

interface NavigatorUAData {
  platform: string
  brands?: { brand: string; version: string }[]
  mobile?: boolean
  getHighEntropyValues?: (hints: string[]) => Promise<any>
}
interface Navigator {
  userAgentData?: NavigatorUAData
}

declare module 'syllabify' {
  function split(word: string): string[]
  export default split
}

declare module 'save-file' {
  function saveFile(blob: Blob, filename: string): Promise<void>
  export default saveFile
}

/**
 * LaunchQueue provides access to functionality that allows custom launch navigation handling to be implemented in the PWA.
 *
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue)
 */
declare var launchQueue: {
  /**
   * A callback function that handles custom navigation for the PWA.
   * @param callback A LaunchParams object instance
   *
   * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/LaunchQueue/setConsumer)
   */
  setConsumer: (callback: (launchParams: LaunchParams) => void) => void
}

/**
 * The LaunchParams interface of the Launch Handler API is used
 * when implementing custom launch navigation handling in a PWA.
 *
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/LaunchParams)
 */
interface LaunchParams {
  readonly files: FileSystemHandle[]
  readonly targetURL: string | null
}

interface ImportMetaEnv {
  readonly MODE: 'production' | 'development'
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean

  readonly VITE_BUILD_CHANNEL: 'STABLE' | 'BETA' | undefined
}
