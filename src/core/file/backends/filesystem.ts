import { defineFileBackend, registerFileBackendAdapter } from '../types'

export const fileSystemBackend = defineFileBackend<FileSystemFileHandle>({
  async read(id, types) {
    const [handle] = await showOpenFilePicker({
      types,
      excludeAcceptAllOption: true,
      id,
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
  async writeAs(id, types, suggestedBaseName, blobGenerator) {
    const handle = await showSaveFilePicker({
      types,
      suggestedName: suggestedBaseName,
      excludeAcceptAllOption: true,
      id,
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
})

registerFileBackendAdapter<FileSystemFileHandle>(fileSystemBackend, {
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
  async fsHandle(handle: FileSystemHandle) {
    if (!(handle instanceof FileSystemFileHandle)) return null
    const file = await handle.getFile()
    return {
      handle,
      filename: handle.name,
      blob: file,
    }
  },
})
