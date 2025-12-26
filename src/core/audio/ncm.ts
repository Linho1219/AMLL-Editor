import { ref, shallowRef, watch } from 'vue'

import NcmResolveWorker from '@vendors/ncm/ncm.worker.js?worker'

export function useNcmResolver() {
  const worker = shallowRef<Worker | null>(null)
  const ready = ref(false)
  const errorMessage = ref<string | null>(null)
  let requestId = 0
  const pending = new Map<number, (result: ArrayBuffer) => void>()

  function ensureWorker() {
    if (worker.value) return
    const w = new NcmResolveWorker()
    worker.value = w

    w.onmessage = (e) => {
      const { type, payload, error } = e.data
      if (type === 'wasm-ready') {
        ready.value = true
      } else if (type === 'error') {
        errorMessage.value = error || payload?.error || 'Unknown error'
      } else if (type === 'extracted') {
        const resolve = pending.get(payload.index)
        if (resolve) {
          resolve(payload.result)
          pending.delete(payload.index)
        }
      }
    }

    w.onerror = (err) => {
      errorMessage.value = err.message || 'Worker error'
    }
  }

  function waitForReady(): Promise<void> {
    if (ready.value) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WASM initialization timed out'))
      }, 10000)
      const stop = watch(
        ready,
        (v) => {
          if (v) {
            clearTimeout(timeout)
            stop()
            resolve()
          }
        },
        { immediate: true },
      )
    })
  }

  async function transform(file: Blob | File): Promise<Blob> {
    ensureWorker()
    if (!ready.value) await waitForReady()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const fileData = reader.result as ArrayBuffer
        const id = requestId++
        const baseNameWithoutExtension =
          file instanceof File ? file.name.replace(/\.ncm$/i, '') : 'output'

        pending.set(id, (resultBuffer) => {
          const blob = new Blob([resultBuffer], { type: 'audio/mpeg' })
          resolve(blob)
        })

        worker.value?.postMessage({
          type: 'extract',
          payload: { index: id, fileData, baseNameWithoutExtension },
        })
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  function destroy() {
    if (worker.value) {
      worker.value.postMessage({ type: 'destroy' })
      worker.value.terminate()
      worker.value = null
      ready.value = false
      errorMessage.value = null
      pending.clear()
    }
  }

  return {
    ready,
    errorMessage,
    transform,
    destroy,
  }
}
