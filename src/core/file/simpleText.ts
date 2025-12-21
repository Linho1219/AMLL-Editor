interface TextFileResult {
  fileName: string
  extension: string
  content: string
}

export function simpleChooseTextFile(accept: string): Promise<TextFileResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        document.body.removeChild(input)
        resolve(null)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        const extension = (file.name.split('.').pop() || '').toLowerCase()
        resolve({ fileName: file.name, extension, content })
        document.body.removeChild(input)
      }
      reader.readAsText(file)
    })
    input.addEventListener('cancel', () => {
      document.body.removeChild(input)
      resolve(null)
    })
    input.click()
  })
}

export function simpleSaveTextFile(
  fileName: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8',
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
