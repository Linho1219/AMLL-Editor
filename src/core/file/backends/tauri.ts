import { basename } from '@tauri-apps/api/path'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'

import { extractDotExts } from '../shared'
import { type FileBackendPickerAccept, defineFileBackend } from '../types'

type TauriFileHandle = {
  path: string
}

const typeToFilter = (type: FileBackendPickerAccept) => ({
  name: type.description,
  extensions: extractDotExts(type).map((ext) => ext.replace(/^\./, '')),
})

export const tauriFileBackend = defineFileBackend<TauriFileHandle>({
  async read(_id, types, _startIn) {
    const selected = await open({
      multiple: false,
      filters: types.map(typeToFilter),
    })
    if (!selected || Array.isArray(selected)) {
      throw new Error('No file selected')
    }
    const path = selected as string
    const data = await readFile(path)
    return {
      handle: { path },
      filename: await basename(path),
      blob: new Blob([data]),
    }
  },

  async askForWritePermission() {
    return true
  },

  async write(handle, blob) {
    const buffer = new Uint8Array(await blob.arrayBuffer())
    await writeFile(handle.path, buffer)
    return await basename(handle.path)
  },

  async writeAs(_id, types, suggestedBaseName, blobGenerator) {
    const target = await save({
      defaultPath: suggestedBaseName,
      filters: types.map(typeToFilter),
    })
    if (!target) throw new Error('Save cancelled')
    const filename = await basename(target)
    const blob = await blobGenerator(filename)
    await writeFile(target, new Uint8Array(await blob.arrayBuffer()))
    return {
      handle: { path: target },
      filename,
      blob,
    }
  },

  adapters: {
    async dragDrop() {
      return null
    },
  },
})
