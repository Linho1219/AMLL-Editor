/**
 * Attempts to execute a callback function using requestAnimationFrame up to a specified number of attempts.
 * When callback returns a truthy value or throws an error, the attempts stop.
 *
 * @param callback - The function to be executed. Should return a truthy value to stop further attempts.
 * @param maxAttempts - The maximum number of attempts to execute the callback.
 * @param enableLog - If true, logs each attempt to the console.
 */
export function tryRaf(callback: () => any, maxAttempts: number = 20, enableLog = false): void {
  let attempts = 0
  function attempt() {
    if (attempts >= maxAttempts) {
      console.warn(`tryRaf: Maximum attempts (${maxAttempts}) reached without success.`)
      return
    }
    attempts++
    if (enableLog) console.log(`tryRaf: Attempt ${attempts}`)
    try {
      const result = callback()
      if (!result) requestAnimationFrame(attempt)
      else if (enableLog) console.log('tryRaf: Callback succeeded.')
    } catch (error) {
      console.error('tryRaf: Error in callback:', error)
      // End attempts on error
    }
  }
  requestAnimationFrame(attempt)
}
