import 'dotenv/config'
import { join } from 'node:path'
import { normalizePath } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export function iconSetPlugin() {
  const iconSetDir = join(
    process.cwd(),
    'icons',
    process.env.VITE_BUILD_CHANNEL === 'BETA' ? 'beta' : 'normal',
  )
  console.log('Using icon set from:', iconSetDir)
  return viteStaticCopy({
    targets: [
      {
        src: [normalizePath(join(iconSetDir, '*'))],
        dest: '.',
      },
    ],
  })
}
