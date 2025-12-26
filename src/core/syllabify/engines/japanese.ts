import { escapeRegExp } from 'lodash-es'

import type { Syllabify as SL } from '..'

function isCJK(char: string | undefined): char is string {
  if (!char) return false
  const code = char.charCodeAt(0)
  const cjkRanges: [number, number][] = [
    [0x4e00, 0x9fff],
    [0x3040, 0x309f],
    [0x30a0, 0x30ff],
  ]
  return char === '々' || cjkRanges.some(([s, e]) => code >= s && code <= e)
}

function isPunctuation(char: string | undefined): char is string {
  if (!char) return false
  const code = char.charCodeAt(0)
  return (
    (code >= 0x2000 && code <= 0x206f) ||
    (code >= 0x3000 && code <= 0x303f) ||
    /[.,!?，。！？、「」『』]/.test(char)
  )
}

function isJapaneseYoonOrSokuon(char: string | undefined): char is string {
  if (!char) return false
  const yoon = 'ャュョゃゅょン'
  const sokuon = 'ッっ'
  return yoon.includes(char) || sokuon.includes(char)
}

function splitLine(line: string): string[] {
  if (!line.trim()) return [line]
  const chars = [...line]
  const tokens: string[] = []
  while (chars.length) {
    const currToken: string[] = []
    if (chars.length === line.length && isPunctuation(chars[0])) {
      currToken.push(chars.shift()!)
      if (isCJK(chars[0])) {
        currToken.push(chars.shift()!)
        if (isJapaneseYoonOrSokuon(chars[0])) currToken.push(chars.shift()!)
        while (isPunctuation(chars[0])) currToken.push(chars.shift()!)
      } else {
        while (chars.length && !isPunctuation(chars[0]) && !/\s/.test(chars[0]!))
          currToken.push(chars.shift()!)
      }
      tokens.push(currToken.join(''))
      continue
    }
    if (isCJK(chars[0])) {
      currToken.push(chars.shift()!)
      if (isJapaneseYoonOrSokuon(chars[0])) currToken.push(chars.shift()!)
      while (isPunctuation(chars[0])) currToken.push(chars.shift()!)
      tokens.push(currToken.join(''))
      continue
    }
    while (chars.length && !/\s/.test(chars[0]!) && !isPunctuation(chars[0]) && !isCJK(chars[0]))
      currToken.push(chars.shift()!)
    while (chars.length && isPunctuation(chars[0])) currToken.push(chars.shift()!)
    if (currToken.length) tokens.push(currToken.join(''))
    if (chars.length && /\s/.test(chars[0]!)) tokens.push(chars.shift()!)
  }
  return tokens
}

export const japaneseSplit = (strs: string[], rewrites: Readonly<SL.Rewrite>[]) =>
  strs.map((l) => {
    const line = l.trim()
    if (rewrites.length === 0) return splitLine(line)
    const rewriteReg = new RegExp(rewrites.map((rw) => escapeRegExp(rw.target)).join('|'), 'g')
    const matches = line.matchAll(rewriteReg)
    const dividedLineParts: { text: string; isRewrite: boolean }[] = []
    let lastIndex = 0
    for (const match of matches) {
      const matchIndex = match.index!
      if (matchIndex > lastIndex)
        dividedLineParts.push({
          text: line.slice(lastIndex, matchIndex),
          isRewrite: false,
        })
      dividedLineParts.push({ text: match[0], isRewrite: true })
      lastIndex = matchIndex + match[0]!.length
    }
    if (lastIndex < line.length)
      dividedLineParts.push({ text: line.slice(lastIndex), isRewrite: false })
    const splittedParts = dividedLineParts.flatMap((part) =>
      part.isRewrite ? [part.text] : splitLine(part.text),
    )
    return splittedParts
  })
