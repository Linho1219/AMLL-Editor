import JSZip from 'jszip'

import type { LyricLine, Persist } from '@core/types'

import type { ProjPayload } from '.'
import {
  type SupportedProjData,
  migrateToLatestProjData,
  supportedProjDataVersions,
} from './dataVer'
import { type SupportedProjManifest, supportedProjManifestVersions } from './fileVer'

export async function parseProjectFile(file: Blob): Promise<ProjPayload> {
  const zip = await JSZip.loadAsync(file)

  const manifestFile = zip.file('manifest.json')
  if (!manifestFile) throw new Error('Invalid project file: manifest.json not found')
  const manifestText = await manifestFile.async('text')
  const manifest: SupportedProjManifest = JSON.parse(manifestText)

  if (!supportedProjManifestVersions.includes(manifest.fileVersion))
    throw new Error(`Unsupported file version: ${manifest.fileVersion}`)
  if (!supportedProjDataVersions.includes(manifest.dataVersion))
    throw new Error(`Unsupported data version: ${manifest.dataVersion}`)

  const createdAt = new Date(manifest.createdAt)

  const dataFile = zip.file(manifest.dataFilename)
  if (!dataFile) throw new Error(`Invalid project file: ${manifest.dataFilename} not found`)
  const dataText = await dataFile.async('text')
  const data: SupportedProjData = JSON.parse(dataText)

  if (
    data.dataVersion !== manifest.dataVersion ||
    !supportedProjDataVersions.includes(manifest.dataVersion)
  )
    throw new Error(`Data version mismatch or unsupported: ${data.dataVersion}`)

  let audioFile: File | undefined = undefined
  if (manifest.mediaFilename) {
    const mediaFile = zip.file(manifest.mediaFilename)
    if (mediaFile) {
      const mediaBlob = await mediaFile.async('blob')
      audioFile = new File([mediaBlob], manifest.mediaFilename)
    }
  }

  const persist: Persist = parseProjectData(data)

  return { persist, createdAt, audioFile }
}

function parseProjectData(data: SupportedProjData): Persist {
  const latestData = migrateToLatestProjData(data)
  const { metadata } = latestData
  const persistLines: LyricLine[] = latestData.lines.map((line) => ({
    ...line,
    connectNext: line.connectNext ?? false,
    syllables: line.syllables.map((syllable) => ({
      ...syllable,
      currentplaceholdingBeat: 0,
    })),
  }))
  return { metadata, lines: persistLines }
}
