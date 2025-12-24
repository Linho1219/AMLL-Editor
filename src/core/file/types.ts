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
  read(
    types: FilePickerAcceptType[],
    tryWrite?: boolean,
  ): Promise<__FileReadResult<BackendFileHandle>>
  write(handle: BackendFileHandle, blob: Blob): Promise<void>
  writeAs(
    types: FilePickerAcceptType[],
    suggestedBaseName: string,
    blob: Blob,
  ): Promise<__FileReadResult<BackendFileHandle>>
}

/** Result of reading a file from backend */
export type FileReadResult = __FileReadResult<FileHandle>
interface __FileReadResult<BackendFileHandle> {
  handle: BackendFileHandle
  filename: string
  writable: boolean
}

/**
 * Helper to define file backend with proper typing.
 * Never use outside of file backend implementations
 */
export const defineFileBackend = <ImplementHandle>(backend: __FileBackend<ImplementHandle>) =>
  backend as FileBackend
