import vue from '@vitejs/plugin-vue'
import { URL, fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'
import { simpleGit } from 'simple-git'
import { defineConfig } from 'vite'

import packageJSON from './package.json'
import { iconSetPlugin } from './pipelines/iconSet/plugin'
import { viteStaticCopyPyodide } from './pipelines/pyodide/plugin'
import { manifestPlugin } from './pipelines/webManifest/plugin'

const aliasRelMap: Record<string, string> = {
  '@core': './src/core',
  '@assets': './src/assets',
  '@ui': './src/ui',
  '@utils': './src/utils',
  '@states': './src/states',
  '@vendors': './src/vendors',
}
const aliasMap: Record<string, string> = {}
for (const [key, relPath] of Object.entries(aliasRelMap)) {
  aliasMap[key] = fileURLToPath(new URL(relPath, import.meta.url))
}

const git = simpleGit()

console.log(`Current channel: ${process.env.VITE_BUILD_CHANNEL || 'UNSPECIFIED'}\n`)

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => ({
  plugins: [
    manifestPlugin(),
    iconSetPlugin(),
    viteStaticCopyPyodide(mode === 'development'),
    vue(),
    visualizer({
      gzipSize: true,
      brotliSize: true,
      emitFile: false,
      filename: 'chunk-analysis.html',
    }),
  ],
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
  resolve: { alias: aliasMap },
  define: {
    __APP_VERSION__: JSON.stringify(packageJSON.version),
    __APP_COMMIT_HASH__: JSON.stringify(await git.revparse(['HEAD'])),
    __REPO_URL__: JSON.stringify(packageJSON.repository),
    __BETA_DEPLOY_LOG_URL__: JSON.stringify(
      'https://github.com/Linho1219/AMLL-Editor-BetaDeploy/actions',
    ),
    __APP_DISPLAY_NAME__: JSON.stringify(
      packageJSON.displayName + (process.env.VITE_BUILD_CHANNEL === 'BETA' ? ` BETA` : ''),
    ),
    __APP_BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
    __AMLL_CORE_VERSION__: JSON.stringify(packageJSON.dependencies['@applemusic-like-lyrics/core']),
    __AMLL_VUE_VERSION__: JSON.stringify(packageJSON.dependencies['@applemusic-like-lyrics/vue']),
  },
  optimizeDeps: { exclude: ['pyodide'] },
}))
