import { defineFileBackend } from '../types'

export const fileSystemBackend = defineFileBackend<FileSystemFileHandle>({
  async read(types, tryWrite = false) {
    const [handle] = await showOpenFilePicker({
      types,
      excludeAcceptAllOption: true,
      id: 'amll-ttml-tool-file-open',
    })
    const writable = tryWrite
      ? await handle
          .createWritable()
          .then((w) => (w.abort(), true))
          .catch(() => false)
      : false
    return {
      handle,
      filename: handle.name,
      writable,
    }
  },
  async write(handle, blob) {
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
  },
  async writeAs(types, suggestedBaseName, blob) {
    const handle = await showSaveFilePicker({
      types,
      suggestedName: suggestedBaseName,
      excludeAcceptAllOption: true,
      id: 'amll-ttml-tool-file-save',
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return {
      handle,
      filename: handle.name,
      writable: true,
    }
  },
})
