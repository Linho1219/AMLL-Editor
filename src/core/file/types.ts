import type { Falsy } from '@utils/types'

declare const __fileHandleBrand: unique symbol

/**
 * BackendFileHandle must be opaque and only produced by this backend.
 * Since there should be only one backend per runtime,
 * no need to worry about cross-backend compatibility and verification.
 */
export type FileHandle = {
  readonly [__fileHandleBrand]: true
}

/**
 * Abstract file backend interface.
 * Will be implemented with private FileHandle type, not exposed outside
 */
export type FileBackend = __FileBackend<FileHandle>
interface __FileBackend<BackendFileHandle> {
  /**
   * Read a file from backend
   * @param id For same ID, the picker tries to open in the same directory
   */
  read(
    id: string,
    types: FilePickerAcceptType[],
    startIn?: WellKnownDirectory,
  ): Promise<__FileReadResult<BackendFileHandle>>
  /**
   * Ask for write permission without actually writing
   * @returns Whether permission is granted
   */
  askForWritePermission(handle: BackendFileHandle): Promise<boolean>
  /**
   * Write a file to backend. Should automatically ask for permission if needed.
   * @returns The filename after write operation
   */
  write(handle: BackendFileHandle, blob: Blob): Promise<string>
  /**
   * Write a new file to backend. Should automatically ask for permission if needed.
   * @param id For same ID, the picker tries to open in the same directory
   * @param types Accepted file types. If cannot be honored, the picker should use the first extension of the first type.
   * @param suggestedBaseName Suggested name **without extension**
   */
  writeAs(
    id: string,
    types: FilePickerAcceptType[],
    suggestedBaseName: string,
    blobGenerator: (filename: string) => Promise<Blob>,
    startIn?: WellKnownDirectory,
  ): Promise<__FileReadResult<BackendFileHandle>>
}

/** Result of reading a file from backend */
export type FileReadResult = __FileReadResult<FileHandle>
interface __FileReadResult<BackendFileHandle> {
  handle: BackendFileHandle
  filename: string
  blob: Blob
}

/**
 * Helper to define file backend with proper typing.
 * Never use outside of file backend implementations
 * ImplementHandle should be truthy
 */
export const defineFileBackend = <ImplementHandle>(
  backend: ImplementHandle extends Falsy ? never : __FileBackend<ImplementHandle>,
) => backend as FileBackend

/** Adapter entry parameters for various sources */
interface AdapterEntryParams {
  dragDrop: [e: DragEvent]
  fsHandle: [handle: FileSystemHandle]
}

type __AdapterEntry<ImplementHandle> = {
  [K in keyof AdapterEntryParams]: (
    ...args: AdapterEntryParams[K]
  ) => Promise<__FileReadResult<ImplementHandle> | null>
}
type AdapterEntry = __AdapterEntry<FileHandle>

const adapterMap: Map<FileBackend, AdapterEntry> = new Map()

/**
 * Register adapter for a file backend,
 * to extract file handles from various sources (e.g. drag-and-drop).
 * ImplementHandle should be truthy
 */
export function registerFileBackendAdapter<ImplementHandle>(
  backend: ImplementHandle extends Falsy ? never : FileBackend,
  entry: __AdapterEntry<ImplementHandle>,
): void {
  adapterMap.set(backend, entry as AdapterEntry)
}
/**
 * Get adapter for a file backend,
 * to extract file handles from various sources (e.g. drag-and-drop).
 */
export function getFileBackendAdapter(backend: FileBackend): AdapterEntry {
  const entry = adapterMap.get(backend)
  if (!entry) throw new Error('Adapter not registered for the given backend')
  return entry
}
