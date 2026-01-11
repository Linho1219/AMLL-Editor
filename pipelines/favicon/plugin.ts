import 'dotenv/config'
import { join } from 'node:path'
import { normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export function faviconPlugin() {
  const faviconDir = join(
    process.cwd(),
    'favicons',
    process.env.VITE_BUILD_CHANNEL === 'BETA' ? 'beta' : 'normal',
  )
  return viteStaticCopy({
    targets: [
      {
        src: [normalizePath(join(faviconDir, '*'))],
        dest: '.',
      },
    ],
  })
}
