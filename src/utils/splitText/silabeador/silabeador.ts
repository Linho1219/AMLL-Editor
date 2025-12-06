import type { Rewrite } from '../register'
import { basicSplit } from '../basic'
import { loadPyodide } from 'pyodide'
import silabeadorPy from './silabeador.py?raw'
import exceptionsLst from './exceptions.lst?raw'

let globalSilabeador: ReturnType<typeof useSilabeador> | null = null

export async function silabeadorSplit(
  strs: string[],
  rewrites: Readonly<Rewrite>[],
  caseSensitive: boolean,
) {
  if (!globalSilabeador) globalSilabeador = useSilabeador()
  const { split } = globalSilabeador
  const pendingWordsSet = new Set<string>()
  basicSplit(strs, rewrites, caseSensitive, (token) => {
    pendingWordsSet.add(token)
    return []
  })
  const pendingWords = [...pendingWordsSet]
  const results = await split(pendingWords)
  const resultsMap = new Map<string, string[]>()
  pendingWords.forEach((word, index) => {
    resultsMap.set(word, results[index]!)
  })
  return basicSplit(strs, rewrites, caseSensitive, (token) => {
    return resultsMap.get(token) || [token]
  })
}

function useSilabeador() {
  async function initPyodide() {
    const pyodide = await loadPyodide({
      indexURL: '/assets',
    })
    return pyodide
  }
  async function loadSilabeador() {
    const pyodide = await initPyodide()
    pyodide.FS.writeFile('exceptions.lst', exceptionsLst)
    await pyodide.runPythonAsync(silabeadorPy)
    return pyodide
  }

  const silabeadorReadyPromise = loadSilabeador()

  async function split(tokens: string[]): Promise<string[][]> {
    const pyodide = await silabeadorReadyPromise
    const result = pyodide.runPython(`split_words(${JSON.stringify(tokens)})`)
    const syllables: string[][] = result.toJs({ deep: true })
    result.destroy()
    return syllables
  }
  return { split }
}
