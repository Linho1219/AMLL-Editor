import type { LyricLine, MetadataMap, Persist } from '@core/types'

import { coreCreate } from '@states/stores/core'

import { alignLineTime } from '@utils/alignLineSylTime'
import { str2ms as nullableStr2ms } from '@utils/formatTime'
import type { Maybe } from '@utils/types'

// Frontend TTML parser, following AMLL TTML Lyric Format
// Derived from: https://github.com/amll-dev/amll-ttml-tool , Licensed under GPLv3
// See also https://www.w3.org/TR/2018/REC-ttml1-20181108/

interface RomanWord {
  startTime: number
  endTime: number
  text: string
}
interface LineMetadata {
  main: string
  bg: string
}
interface WordRomanMetadata {
  main: RomanWord[]
  bg: RomanWord[]
}

const { newLine, newSyllable } = coreCreate

function str2ms(str: Maybe<string>): number {
  if (!str) return 0
  const ms = nullableStr2ms(str)
  if (ms === null) throw new TypeError(`Invalid time string: ${str}`)
  return ms
}

const trimBraces = (s: string) =>
  s
    .trim()
    .replace(/^[（(]/, '')
    .replace(/[)）]$/, '')
    .trim()

class StringAccum {
  private parts: string[] = []
  append(s: Maybe<string>) {
    if (typeof s !== 'string' || s.length === 0) return
    this.parts.push(s)
  }
  toString() {
    return this.parts.join('')
  }
}

const hasTimestamps = (el: Element) => el.hasAttribute('begin') && el.hasAttribute('end')

function parseItunesTranslations(ttmlDoc: XMLDocument) {
  const itunesTranslations = new Map<string, LineMetadata>()
  const translationTextElements = ttmlDoc.querySelectorAll(
    'iTunesMetadata > translations > translation > text[for]',
  )

  translationTextElements.forEach((textEl) => {
    const key = textEl.getAttribute('for')
    if (!key) return

    const mainStrs = new StringAccum()
    const bgStrs = new StringAccum()

    textEl.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) mainStrs.append(node.textContent)
      else if (node.nodeType === Node.ELEMENT_NODE)
        if ((node as Element).getAttribute('ttm:role') === 'x-bg')
          if (node.textContent) bgStrs.append(node.textContent)
    })

    const main = mainStrs.toString().trim()
    const bg = trimBraces(bgStrs.toString())

    if (main || bg) itunesTranslations.set(key, { main, bg })
  })

  return itunesTranslations
}

function parseItunesRomanizations(ttmlDoc: XMLDocument) {
  const itunesLineRomanizations = new Map<string, LineMetadata>()
  const itunesWordRomanizations = new Map<string, WordRomanMetadata>()

  const romanizationTextElements = ttmlDoc.querySelectorAll(
    'iTunesMetadata > transliterations > transliteration > text[for]',
  )

  const spanToRomanWord = (span: Element, trimTextBraces = false): RomanWord => ({
    startTime: str2ms(span.getAttribute('begin')),
    endTime: str2ms(span.getAttribute('end')),
    text: trimTextBraces ? trimBraces(span.textContent) : span.textContent.trim(),
  })

  romanizationTextElements.forEach((textEl) => {
    const key = textEl.getAttribute('for')
    if (!key) return

    const mainWords: RomanWord[] = []
    const bgWords: RomanWord[] = []
    const lineRomanMainStrs = new StringAccum()
    const lineRomanBgStrs = new StringAccum()
    let isWordByWord = false

    textEl.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        lineRomanMainStrs.append(node.textContent)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as Element
      if (el.getAttribute('ttm:role') === 'x-bg') {
        const nestedSpans = el.querySelectorAll('span[begin][end]')
        if (nestedSpans.length === 0) lineRomanBgStrs.append(el.textContent)
        else {
          isWordByWord = true
          nestedSpans.forEach((span) => bgWords.push(spanToRomanWord(span, true)))
        }
      } else if (hasTimestamps(el)) {
        isWordByWord = true
        mainWords.push(spanToRomanWord(el))
      }
    })

    if (isWordByWord) {
      itunesWordRomanizations.set(key, { main: mainWords, bg: bgWords })
    }

    const lineRomanMain = lineRomanMainStrs.toString().trim()
    const lineRomanBg = trimBraces(lineRomanBgStrs.toString())

    if (lineRomanMain || lineRomanBg) {
      itunesLineRomanizations.set(key, {
        main: lineRomanMain,
        bg: lineRomanBg,
      })
    }
  })

  return { itunesLineRomanizations, itunesWordRomanizations }
}

function parseMetadata(ttmlDoc: XMLDocument): MetadataMap {
  const metadataMap = new Map<string, string[]>()
  ttmlDoc.querySelectorAll('meta').forEach((meta) => {
    if (meta.tagName !== 'amll:meta') return
    const key = meta.getAttribute('key')
    const value = meta.getAttribute('value')
    if (!key || !value) return
    if (metadataMap.has(key)) metadataMap.get(key)!.push(value)
    else metadataMap.set(key, [value])
  })
  return Object.fromEntries([...metadataMap.entries()])
}

function findMainAgentId(ttmlDoc: XMLDocument): string {
  for (const agent of ttmlDoc.querySelectorAll('ttm\\:agent')) {
    if (agent.getAttribute('type') !== 'person') continue
    const id = agent.getAttribute('xml:id')
    if (id) return id
  }
  return 'v1'
}

export function parseTTML(ttmlText: string): Persist {
  const domParser = new DOMParser()
  const ttmlDoc: XMLDocument = domParser.parseFromString(ttmlText, 'application/xml')

  const itunesTranslations = parseItunesTranslations(ttmlDoc)
  const { itunesLineRomanizations, itunesWordRomanizations } = parseItunesRomanizations(ttmlDoc)

  const metadata = parseMetadata(ttmlDoc)

  const mainAgentId = findMainAgentId(ttmlDoc)

  const lineArr: LyricLine[] = []

  ttmlDoc.querySelectorAll('body p[begin][end]').forEach((lineEl) => {
    parseLineElement(lineEl, false, false, null)
  })

  function parseLineElement(
    lineEl: Element,
    background = false,
    duet = false,
    parentItunesKey: string | null = null,
  ) {
    if (!background) {
      const agentAttr = lineEl.getAttribute('ttm:agent')
      duet = agentAttr !== null && agentAttr !== mainAgentId
      console.log(agentAttr, mainAgentId, duet)
    }

    const startTime = str2ms(lineEl.getAttribute('begin'))
    const endTime = str2ms(lineEl.getAttribute('end'))

    const line: LyricLine = newLine({ background, duet, startTime, endTime })
    lineArr.push(line)

    const itunesKey = background ? parentItunesKey : lineEl.getAttribute('itunes:key')

    const romanWordData = itunesKey ? itunesWordRomanizations.get(itunesKey) : undefined
    const romanWords = background ? romanWordData?.bg : romanWordData?.main

    if (itunesKey) {
      const metadataAttr = background ? 'bg' : 'main'
      line.translation = itunesTranslations.get(itunesKey)?.[metadataAttr] ?? ''
      line.romanization = itunesLineRomanizations.get(itunesKey)?.[metadataAttr] ?? ''
    }

    lineEl.childNodes.forEach((wordNode) => {
      if (wordNode.nodeType === Node.TEXT_NODE) {
        const text = wordNode.textContent ?? ''
        line.syllables.push(
          newSyllable({
            text,
            startTime: text.trim() ? startTime : 0,
            endTime: text.trim() ? endTime : 0,
          }),
        )
      } else if (wordNode.nodeType === Node.ELEMENT_NODE) {
        const wordEl = wordNode as Element
        const role = wordEl.getAttribute('ttm:role')

        if (wordEl.nodeName === 'span' && role) {
          if (role === 'x-bg') {
            parseLineElement(wordEl, true, line.duet, itunesKey)
          } else if (role === 'x-translation') {
            // Use inline translation only if there is no Apple Music style translation
            line.translation ||= wordEl.textContent.trim()
          } else if (role === 'x-roman') {
            line.romanization ||= wordEl.textContent.trim()
          }
        } else if (hasTimestamps(wordEl)) {
          const wordStartTime = str2ms(wordEl.getAttribute('begin'))
          const wordEndTime = str2ms(wordEl.getAttribute('end'))

          const word = newSyllable({
            text: wordEl.textContent,
            startTime: wordStartTime,
            endTime: wordEndTime,
          })
          const placeholdingBeat = wordEl.getAttribute('amll:empty-beat')
          if (placeholdingBeat) word.placeholdingBeat = Number(placeholdingBeat)

          if (romanWords) {
            const matchingRoman = romanWords.find(
              (r) => r.startTime === wordStartTime && r.endTime === wordEndTime,
            )
            if (matchingRoman) word.romanization = matchingRoman.text
          }

          line.syllables.push(word)
        }
      }
    })

    if (!startTime && !endTime) alignLineTime(line)

    if (background) {
      const firstWord = line.syllables[0]
      if (firstWord) {
        firstWord.text = firstWord.text.replace(/^\s*[（(]/, '')
        if (!firstWord.text.trim()) line.syllables.shift()
      }

      const lastWord = line.syllables.at(-1)
      if (lastWord) {
        lastWord.text = lastWord.text.replace(/[)）]\s*$/, '')
        if (!lastWord.text.trim()) line.syllables.pop()
      }
    }
  }

  return {
    metadata,
    lines: lineArr,
  }
}
