import { defineFileBackend } from '../types'

export const fileSystemBackend = defineFileBackend<FileSystemFileHandle>({
  async read(id, types, startIn = 'desktop') {
    const [handle] = await showOpenFilePicker({
      types,
      excludeAcceptAllOption: true,
      id,
      startIn,
    })
    const file = await handle.getFile()
    return {
      handle,
      blob: file,
      filename: handle.name,
    }
  },
  async askForWritePermission(handle) {
    return await handle
      .createWritable()
      .then((w) => (w.abort(), true))
      .catch(() => false)
  },
  async write(handle, blob) {
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return handle.name
  },
  async writeAs(id, types, suggestedBaseName, blobGenerator, startIn = 'desktop') {
    const handle = await showSaveFilePicker({
      types,
      suggestedName: suggestedBaseName,
      excludeAcceptAllOption: true,
      id,
      startIn,
    })
    const blob = await blobGenerator(handle.name)
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return {
      handle,
      filename: handle.name,
      blob,
    }
  },
  adapters: {
    async dragDrop(e: DragEvent) {
      const handle = await e.dataTransfer?.items[0]?.getAsFileSystemHandle()
      if (!(handle instanceof FileSystemFileHandle)) return null
      const file = await handle.getFile()
      return {
        handle,
        filename: handle.name,
        blob: file,
      }
    },
  },
  launchFile: new Promise((resolve, reject) => {
    if (!('launchQueue' in window)) return
    window.launchQueue.setConsumer(async (launchParams) => {
      const [handle] = launchParams.files.filter((f) => f instanceof FileSystemFileHandle)
      if (!handle) return reject('No file handle provided.')
      resolve({
        handle,
        filename: handle.name,
        blob: await handle.getFile(),
      })
    })
  }),
})
