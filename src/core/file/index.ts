import { detectFormat, portFormatRegister } from '@core/convert'
import { parseTTML, stringifyTTML, ttmlReg } from '@core/convert/formats/ttml'
import { readonly, ref } from 'vue'
import { collectProjectData, makeProjectFile, mountProjectData, parseProjectFile } from './project'
import { collectPersist, applyPersist } from '@states/services/port'
import { breakExtension } from '@utils/breakExtension'
import type { ValueOf } from '@utils/types'
import { editHistory } from '@states/services/history'
import type { Persist } from '@core/types'
import { checkDataDropConfirm } from './shared'
import { useCoreStore, useStaticStore } from '@states/stores'
import { fileSystemBackend } from './backends/filesystem'
import { getFileBackendAdapter, type FileHandle, type FileReadResult } from './types'
import { compatibilityMap } from '@core/compat'
import { h5NativeBackend } from './backends/h5native'

export { simpleChooseTextFile, simpleSaveTextFile } from './simple'

export const fileBackend = compatibilityMap.fileSystem ? fileSystemBackend : h5NativeBackend

// Native format (*.alp) and TTML format (*.ttml) are the first-class supported formats
// When save, they are written directly by default

// Other formats are supported via import/export services
// Won't be saved directly

const BackingFmt = {
  TTML: 'TTML',
  ALP: 'ALP',
} as const
type BackingFmt = ValueOf<typeof BackingFmt>

const allSupportedExt = new Set([
  '.alp',
  '.ttml',
  ...portFormatRegister.map((f) => f.accept).flat(),
]) as Set<`.${string}`>
const allSupportedExtArr = [...allSupportedExt]
const alpPickerType: FilePickerAcceptType[] = [
  {
    description: 'AMLL Editor 工程',
    accept: { 'application/alp': ['.alp'] },
  },
]
const ttmlPickerType: FilePickerAcceptType[] = [
  {
    description: ttmlReg.name,
    accept: { 'application/ttml+xml': ['.ttml'] },
  },
]
const allPickerTypes: FilePickerAcceptType[] = [
  {
    description: '所有支持的格式',
    accept: { 'application/alp': allSupportedExtArr },
  },
  ...alpPickerType,
  ...ttmlPickerType,
  ...portFormatRegister.map((format) => ({
    description: format.name,
    accept: { [`text/${format.accept[0]}`]: format.accept },
  })),
]

let currHandle: FileHandle | null = null
let currBackingFmt: BackingFmt = BackingFmt.ALP
const createdAtRef = ref<Date | null>(null)
const readonlyRef = ref<boolean>(true)
const displayFilenameRef = ref<string>('未命名.alp')
const savedAtRef = ref<Date | null>(null)

interface FileState {
  handle: FileHandle | null
  currBackingFmt: BackingFmt
  createdAt: Date | null
  displayFilename: string
  isReadonly: boolean
  savedAt: Date | null
}
function setFileState(state: Partial<FileState> | null) {
  if (!state) state = {}
  currHandle = state.handle ?? null
  currBackingFmt = state.currBackingFmt ?? BackingFmt.ALP
  createdAtRef.value = state.createdAt ?? null
  displayFilenameRef.value = state.displayFilename ?? '未命名.alp'
  readonlyRef.value = state.isReadonly ?? true
  savedAtRef.value = state.savedAt ?? null
}

/**
 * Handle opening of any known file format.
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openFile() {
  if (!(await checkDataDropConfirm())) throw new Error('The user aborted a request.')
  const result = await fileBackend.read('amll-ttml-tool-file-open', allPickerTypes)
  await handleFile(result)
  return result.filename
}
/**
 * Handle opening of project file (*.alp).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openProjFile() {
  if (!(await checkDataDropConfirm())) throw new Error('The user aborted a request.')
  const result = await fileBackend.read('amll-ttml-tool-file-open', alpPickerType)
  await handleProjFile(result)
  return result.filename
}
/**
 * Handle opening of TTML file (*.ttml).
 * @throws User cancel; unsupported format; parsing errors.
 * @returns Filename
 */
async function openTTMLFile() {
  if (!(await checkDataDropConfirm())) throw new Error('The user aborted a request.')
  const result = await fileBackend.read('amll-ttml-tool-file-open', ttmlPickerType)
  await handleTTMLFile(result)
  return result.filename
}

const askForWrite = async (handle: FileHandle) => {
  const hasPermission = await fileBackend.askForWritePermission(handle)
  readonlyRef.value = !hasPermission
}
async function handleFile(result: FileReadResult) {
  const [, ext] = breakExtension(result.filename)
  if (!allSupportedExt.has(`.${ext}`)) throw new Error('不支持的文件类型')
  if (ext === 'alp') await handleProjFile(result)
  else if (ext === 'ttml') await handleTTMLFile(result)
  else await handleMiscFile(result)
}
async function handleProjFile(result: FileReadResult) {
  const { handle, blob, filename } = result
  const payload = await parseProjectFile(blob)
  mountProjectData(payload)
  setFileState({
    handle,
    currBackingFmt: BackingFmt.ALP,
    createdAt: payload.createdAt,
    displayFilename: filename,
  })
  editHistory.markSaved()
  askForWrite(handle)
}
async function handleTTMLFile(result: FileReadResult) {
  const { handle, blob, filename } = result
  const text = await blob.text()
  const data = parseTTML(text)
  applyPersist(data)
  setFileState({
    handle,
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(),
    displayFilename: filename,
  })
  editHistory.markSaved()
  askForWrite(handle)
}
async function handleMiscFile(result: FileReadResult) {
  const { blob, filename } = result
  const [name, ext] = breakExtension(filename)
  const text = await blob.text()
  const format = detectFormat(ext, text)
  const data = format.parser(text)
  applyPersist(data)
  setFileState({
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(),
    displayFilename: `${name}.alp`,
  })
}
async function importPersist(data: Persist, name: string = '未命名') {
  if (!(await checkDataDropConfirm())) throw new Error('The user aborted a request.')
  applyPersist(data)
  setFileState({
    currBackingFmt: BackingFmt.ALP,
    createdAt: new Date(),
    displayFilename: `${name}.alp`,
  })
}
async function createBlankProject() {
  await importPersist({ lines: [], metadata: {} })
  editHistory.markSaved()
}

/**
 * Save to backing format file
 * @throws user cancel; write errors.
 * @returns Filename
 */

const blobGenerators: Record<BackingFmt, () => Promise<Blob>> = {
  ALP: async () => makeProjectFile(collectProjectData()),
  TTML: async () => new Blob([stringifyTTML(collectPersist())], { type: 'application/xml' }),
}

async function saveFile() {
  if (!currHandle) {
    console.log('No file handle, invoking Save As...')
    return await saveAsFile()
  }
  const blob = await blobGenerators[currBackingFmt]()
  const filename = await fileBackend.write(currHandle, blob)
  editHistory.markSaved()
  savedAtRef.value = new Date()
  readonlyRef.value = false
  return filename
}

function suggestName() {
  const [displayName] = breakExtension(displayFilenameRef.value)
  if (!displayName.startsWith('未命名')) return displayName
  const coreStore = useCoreStore()
  const title = coreStore.metadata.find((m) => m.key === 'musicName' || m.key === 'ti')?.values[0]
  if (title) return title
  const mediaFilename = useStaticStore().audio.filenameComputed.value
  if (mediaFilename) {
    const [name] = breakExtension(mediaFilename)
    return name
  }
  return displayName
}

/**
 * Save as a new file
 * Only for backing formats (*.alp, *.ttml)
 * For other formats, use export service instead.
 * @throws User cancel; write errors.
 * @returns Filename
 */
async function __saveAsFile(types: FilePickerAcceptType[]) {
  const { handle, filename } = await fileBackend.writeAs(
    'amll-ttml-tool-file-save-as',
    types,
    suggestName(),
    (filename: string) => {
      const [, ext] = breakExtension(filename)
      if (ext !== 'alp' && ext !== 'ttml') throw new Error('Cannot save as non-backing format.')
      currBackingFmt = ext === 'ttml' ? BackingFmt.TTML : BackingFmt.ALP
      return blobGenerators[currBackingFmt]()
    },
  )
  setFileState({
    handle,
    currBackingFmt,
    displayFilename: filename,
    isReadonly: false,
    savedAt: new Date(),
  })
  editHistory.markSaved()
  return filename
}
async function saveAsFile() {
  return await __saveAsFile([...alpPickerType, ...ttmlPickerType])
}
async function saveAsTTMLFile() {
  return await __saveAsFile(ttmlPickerType)
}
async function saveAsProjectFile() {
  return await __saveAsFile(alpPickerType)
}

let dragListenerInitialized = false
type Notifier = (
  summary: string,
  detail: string,
  severity?: 'info' | 'warn' | 'error' | 'success',
) => void
function initDragListener(notifier: Notifier) {
  if (dragListenerInitialized) return
  dragListenerInitialized = true
  const hasFiles = (e: DragEvent): boolean => e.dataTransfer?.types.includes('Files') ?? false

  document.addEventListener('dragover', (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
  })
  document.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return
    const file = e.dataTransfer?.files[0]
    if (!file) return
    e.preventDefault()
    const [, ext] = breakExtension(file.name)
    if (!allSupportedExt.has(`.${ext}`))
      return notifier('文件打开失败', `不支持的文件类型: .${ext}`, 'error')

    getFileBackendAdapter(fileBackend)
      .dragDrop(e)
      .then(async (result) => {
        if (!result) throw new Error('无法获取拖放的文件')
        await handleFile(result)
        notifier('成功加载文件', file.name, 'success')
      })
      .catch((err) => {
        notifier('文件打开失败', String(err), 'error')
      })
  })
}

function initPwaLaunch(notifier: Notifier) {
  if (!('launchQueue' in window)) return
  window.launchQueue.setConsumer(async (launchParams) => {
    const [file] = launchParams.files.filter((f) => f instanceof FileSystemFileHandle)
    if (!file) return notifier('文件打开失败', '未提供文件句柄', 'error')
    const result = await getFileBackendAdapter(fileBackend).fsHandle(file)
    if (!result) return notifier('文件打开失败', '无法获取提供的文件', 'error')
    if (editHistory.isDirty && !(await checkDataDropConfirm())) return
    try {
      await handleFile(result)
      notifier('成功加载文件', result.filename, 'success')
    } catch (err) {
      notifier('文件打开失败', String(err), 'error')
    }
  })
}

export const fileState = {
  openFile,
  openProjFile,
  openTTMLFile,
  saveFile,
  saveAsFile,
  saveAsTTMLFile,
  saveAsProjectFile,
  importPersist,
  createBlankProject,
  suggestName,
  initDragListener,
  initPwaLaunch,
  createdAtComputed: readonly(createdAtRef),
  displayFilenameComputed: readonly(displayFilenameRef),
  readonlyComputed: readonly(readonlyRef),
  savedAtComputed: readonly(savedAtRef),
}
