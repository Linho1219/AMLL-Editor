import vue from '@vitejs/plugin-vue'
import chalk, { ChalkInstance } from 'chalk'
import { URL, fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import { simpleGit } from 'simple-git'
import { defineConfig } from 'vite'

import packageJSON from './package.json'
import { coiPlugin } from './pipelines/coi/plugin'
import { faviconPlugin } from './pipelines/favicon/plugin'
import { iconifyPlugin } from './pipelines/iconify/plugin'
import { viteStaticCopyPyodide } from './pipelines/pyodide/plugin'
import { manifestPlugin } from './pipelines/webManifest/plugin'

const aliasRelMap: Record<string, string> = {
  '@core': './src/core',
  '@assets': './src/assets',
  '@ui': './src/ui',
  '@utils': './src/utils',
  '@states': './src/states',
  '@vendors': './src/vendors',
  '@i18n': './src/i18n',
}

const isBeta = process.env.VITE_BUILD_CHANNEL === 'BETA'
const defineObjMap: Record<string, string | number | boolean | undefined> = {
  __APP_VERSION__: packageJSON.version,
  __APP_COMMIT_HASH__: await simpleGit().revparse(['HEAD']),
  __REPO_URL__: packageJSON.repository,
  __APP_DISPLAY_NAME__: packageJSON.displayName + (isBeta ? ` BETA` : ''),
  __APP_BUILD_CHANNEL__: process.env.VITE_BUILD_CHANNEL || undefined,
  __APP_IS_BETA__: isBeta,
  __APP_BUILD_TIMESTAMP__: Date.now(),
  __AMLL_CORE_VERSION__: packageJSON.dependencies['@applemusic-like-lyrics/core'],
  __AMLL_VUE_VERSION__: packageJSON.dependencies['@applemusic-like-lyrics/vue'],
}

const channelColors: Record<string, ChalkInstance> = {
  STABLE: chalk.hex('#10B981'),
  BETA: chalk.hex('#F97316'),
  UNSPECIFIED: chalk.gray,
}
const channel = process.env.VITE_BUILD_CHANNEL || 'UNSPECIFIED'
console.log(`Current channel: ${channelColors[channel]?.(channel) || channel}\n`)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    manifestPlugin(),
    faviconPlugin(),
    coiPlugin(),
    iconifyPlugin(),
    viteStaticCopyPyodide(mode === 'development'),
    vue(),
    visualizer({
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
      filename: 'chunk-analysis.html',
    }),
  ],
  worker: { format: 'es' },
  resolve: {
    alias: Object.fromEntries(
      [...Object.entries(aliasRelMap)].map(([key, rel]) => [
        key,
        fileURLToPath(new URL(rel, import.meta.url)),
      ]),
    ),
  },
  define: Object.fromEntries(
    [...Object.entries(defineObjMap)].map(([key, value]) => [key, JSON.stringify(value)]),
  ),
  optimizeDeps: { exclude: ['pyodide'] },
  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          primeui: ['primevue', '@primeuix/themes'],
          ui: ['wavesurfer.js', 'vue-draggable-plus', 'floating-vue', 'virtua'],
          vue: ['vue', 'pinia'],
          nlp: ['compromise', 'compromise-speech', 'compromise-syllables'],
          utils: ['lodash-es', 'nanoid', 'mitt'],
          codemirror: [
            'codemirror',
            '@codemirror/commands',
            '@codemirror/search',
            '@codemirror/state',
            '@codemirror/view',
          ],
          amll: [
            '@applemusic-like-lyrics/core',
            '@applemusic-like-lyrics/vue',
            '@pixi/app',
            '@pixi/core',
            '@pixi/display',
            '@pixi/filter-blur',
            '@pixi/filter-bulge-pinch',
            '@pixi/filter-color-matrix',
            '@pixi/sprite',
            'jss',
            'jss-preset-default',
          ],
        },
      },
      external: [
        'node:url',
        'node:fs',
        'node:fs/promises',
        'node:vm',
        'node:path',
        'node:crypto',
        'node:child_process',
      ],
    },
  },
}))
