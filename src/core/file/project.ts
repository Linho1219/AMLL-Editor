import type { Persist } from '@core/types'
import { collectPersist, applyPersist } from '@states/services/port'
import { usePrefStore, useStaticStore } from '@states/stores'
import JSZip from 'jszip'
import { toRaw } from 'vue'

interface ProjPayload {
  data: Persist
  createdAt?: Date
  audioFile?: File
}

interface ProjManifest {
  createdBy: string
  editorVersion: string
  fileVersion: string
  createdAt: string
  modifiedAt: string

  dataVersion: string
  dataFilename: string

  mediaFilename?: string
}
interface ProjData extends Persist {
  dataVersion: string
}

const DATA_FILENAME = 'data.json'
const FILE_VERSION = 'ALPv0.0'
const DATA_VERSION = 'ALDv0.0'

export function collectProjectData(createdAt?: Date): ProjPayload {
  const staticStore = useStaticStore()
  const prefStore = usePrefStore()
  const data = collectPersist()
  const audioFile: File | null = toRaw(staticStore.audio.rawFileComputed.value)
  const payload: ProjPayload = { data, createdAt }
  if (audioFile && prefStore.packAudioToProject) {
    payload.audioFile = audioFile
  }
  return payload
}

export function makeProjectFile({ data, createdAt, audioFile }: ProjPayload) {
  const zip = new JSZip()

  const manifest: ProjManifest = {
    createdBy: 'AMLL Editor',
    editorVersion: __VERSION__,
    fileVersion: FILE_VERSION,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    dataVersion: DATA_VERSION,
    dataFilename: DATA_FILENAME,
  }
  if (createdAt) manifest.createdAt = createdAt.toISOString()

  const projData: ProjData = {
    ...data,
    dataVersion: DATA_VERSION,
  }
  zip.file(DATA_FILENAME, JSON.stringify(projData))

  if (audioFile) {
    zip.file(audioFile.name, audioFile)
    manifest.mediaFilename = audioFile.name
  }

  zip.file('manifest.json', JSON.stringify(manifest))
  return zip.generateAsync({ type: 'blob' })
}

export async function parseProjectFile(file: File): Promise<ProjPayload> {
  const zip = await JSZip.loadAsync(file)

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('Invalid project file: manifest.json not found')
  const manifestText = await manifestFile.async('text')
  const manifest: ProjManifest = JSON.parse(manifestText)

  if (manifest.fileVersion !== FILE_VERSION)
    throw new Error(`Unsupported file version: ${manifest.fileVersion}`)
  if (manifest.dataVersion !== DATA_VERSION)
    throw new Error(`Unsupported data version: ${manifest.dataVersion}`)

  const createdAt = new Date(manifest.createdAt)

  const dataFile = zip.file(manifest.dataFilename)
  if (!dataFile) throw new Error(`Invalid project file: ${manifest.dataFilename} not found`)
  const dataText = await dataFile.async('text')
  const data: ProjData = JSON.parse(dataText)

  let audioFile: File | undefined = undefined
  if (manifest.mediaFilename) {
    const mediaFile = zip.file(manifest.mediaFilename)
    if (mediaFile) {
      const mediaBlob = await mediaFile.async('blob')
      audioFile = new File([mediaBlob], manifest.mediaFilename)
    }
  }

  return { data, createdAt, audioFile }
}

export function mountProjectData(payload: ProjPayload) {
  applyPersist(payload.data)
  if (payload.audioFile) useStaticStore().audio.mount(payload.audioFile)
}
