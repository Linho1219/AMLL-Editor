export function provideListener<T=void>() {
  const listeners = new Set<Listener>()
  type Listener = (e: T) => void
  const on = (listener: Listener) => (listeners.add(listener), () => listeners.delete(listener))
  const off = (listener: Listener) => {
    if (listeners.has(listener)) listeners.delete(listener)
    else console.warn('Trying to remove a listener that is not registered.')
  }
  const _dispatch = (e: T) => listeners.forEach((l) => l(e))
  return { on, off, _dispatch }
}
