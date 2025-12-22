interface TextFileResult {
  fileName: string
  extension: string
  content: string
}

export function simpleChooseFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      document.body.removeChild(input)
      const file = input.files?.[0]
      if (!file) resolve(null)
      else resolve(file)
    })
    input.addEventListener('cancel', () => {
      document.body.removeChild(input)
      resolve(null)
    })
    input.click()
  })
}

export async function simpleChooseTextFile(accept: string): Promise<TextFileResult | null> {
  return new Promise(async (resolve) => {
    const file = await simpleChooseFile(accept)
    if (!file) return null
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const extension = (file.name.split('.').pop() || '').toLowerCase()
      resolve({ fileName: file.name, extension, content })
    }
    reader.onerror = () => resolve(null)
    reader.readAsText(file)
  })
}

export function simpleSaveFile(fileName: string, file: Blob | File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function simpleSaveTextFile(
  fileName: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8',
) {
  const blob = new Blob([content], { type: mimeType })
  simpleSaveFile(fileName, blob)
}
