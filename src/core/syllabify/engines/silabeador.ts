import { loadPyodide } from 'pyodide'

import exceptionsLst from '@vendors/silabeador/exceptions.lst?raw'
import silabeadorPy from '@vendors/silabeador/silabeador.py?raw'

import type { Syllabify as SL } from '..'
import { basicSplit } from './basic'

let globalSilabeador: ReturnType<typeof useSilabeador> | null = null

export async function silabeadorSplit(
  strs: string[],
  rewrites: Readonly<SL.Rewrite>[],
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
  pendingWords.forEach((syl, index) => {
    resultsMap.set(syl, results[index]!)
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
