// Frontend TTML parser and stringifier, following AMLL TTML Lyric Format
// Source: https://github.com/Steve-xmh/amll-ttml-tool , Licensed under GPLv3
// Minor changes were made to fit into this project structure.
// See https://www.w3.org/TR/2018/REC-ttml1-20181108/

import { ms2str, str2ms as nullableStr2ms } from '@utils/formatTime'
import type { LyricLine, LyricSyllable, Metadata, Persist } from '@core/types'
import { coreCreate } from '@states/stores/core'
import type { Convert as CV } from '../types'
import MANIFEST from '../manifest.json'

export const ttmlReg: CV.Format = {
  ...MANIFEST.ttml,
  parser: parseTTML,
  stringifier: stringifyTTML,
}

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

function str2ms(str: string): number {
  const ms = nullableStr2ms(str)
  if (ms === null) throw new TypeError(`Invalid time string: ${str}`)
  return ms
}

export function parseTTML(ttmlText: string): Persist {
  const domParser = new DOMParser()
  const ttmlDoc: XMLDocument = domParser.parseFromString(ttmlText, 'application/xml')

  const itunesTranslations = new Map<string, LineMetadata>()
  const translationTextElements = ttmlDoc.querySelectorAll(
    'iTunesMetadata > translations > translation > text[for]',
  )

  translationTextElements.forEach((textEl) => {
    const key = textEl.getAttribute('for')
    if (!key) return

    let main = ''
    let bg = ''

    for (const node of Array.from(textEl.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        main += node.textContent ?? ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if ((node as Element).getAttribute('ttm:role') === 'x-bg') {
          bg += node.textContent ?? ''
        }
      }
    }

    main = main.trim()
    bg = bg
      .trim()
      .replace(/^[（(]/, '')
      .replace(/[)）]$/, '')
      .trim()

    if (main.length > 0 || bg.length > 0) {
      itunesTranslations.set(key, { main, bg })
    }
  })

  const itunesLineRomanizations = new Map<string, LineMetadata>()
  const itunesWordRomanizations = new Map<string, WordRomanMetadata>()

  const romanizationTextElements = ttmlDoc.querySelectorAll(
    'iTunesMetadata > transliterations > transliteration > text[for]',
  )

  romanizationTextElements.forEach((textEl) => {
    const key = textEl.getAttribute('for')
    if (!key) return

    const mainWords: RomanWord[] = []
    const bgWords: RomanWord[] = []
    let lineRomanMain = ''
    let lineRomanBg = ''
    let isWordByWord = false

    for (const node of Array.from(textEl.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        lineRomanMain += node.textContent ?? ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element
        if (el.getAttribute('ttm:role') === 'x-bg') {
          const nestedSpans = el.querySelectorAll('span[begin][end]')
          if (nestedSpans.length > 0) {
            isWordByWord = true
            nestedSpans.forEach((span) => {
              let bgWordText = span.textContent ?? ''
              bgWordText = bgWordText
                .trim()
                .replace(/^[（(]/, '')
                .replace(/[)）]$/, '')
                .trim()

              bgWords.push({
                startTime: str2ms(span.getAttribute('begin') ?? ''),
                endTime: str2ms(span.getAttribute('end') ?? ''),
                text: bgWordText,
              })
            })
          } else {
            lineRomanBg += el.textContent ?? ''
          }
        } else if (el.hasAttribute('begin') && el.hasAttribute('end')) {
          isWordByWord = true
          mainWords.push({
            startTime: str2ms(el.getAttribute('begin') ?? ''),
            endTime: str2ms(el.getAttribute('end') ?? ''),
            text: el.textContent ?? '',
          })
        }
      }
    }

    if (isWordByWord) {
      itunesWordRomanizations.set(key, { main: mainWords, bg: bgWords })
    }

    lineRomanMain = lineRomanMain.trim()
    lineRomanBg = lineRomanBg
      .trim()
      .replace(/^[（(]/, '')
      .replace(/[)）]$/, '')
      .trim()

    if (lineRomanMain.length > 0 || lineRomanBg.length > 0) {
      itunesLineRomanizations.set(key, {
        main: lineRomanMain,
        bg: lineRomanBg,
      })
    }
  })

  const itunesTimedTranslations = new Map<string, LineMetadata>()
  const timedTranslationTextElements = ttmlDoc.querySelectorAll(
    'iTunesMetadata > translations > translation > text[for]',
  )

  timedTranslationTextElements.forEach((textEl) => {
    const key = textEl.getAttribute('for')
    if (!key) return

    let main = ''
    let bg = ''

    for (const node of Array.from(textEl.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        main += node.textContent ?? ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if ((node as Element).getAttribute('ttm:role') === 'x-bg') {
          bg += node.textContent ?? ''
        }
      }
    }

    main = main.trim()
    bg = bg
      .trim()
      .replace(/^[（(]/, '')
      .replace(/[)）]$/, '')
      .trim()

    if ((main.length > 0 || bg.length > 0) && textEl.querySelector('span')) {
      itunesTimedTranslations.set(key, { main, bg })
      itunesTranslations.delete(key)
    }
  })

  let mainAgentId = 'v1'

  const metadata: Metadata = []
  for (const meta of Array.from(ttmlDoc.querySelectorAll('meta'))) {
    if (meta.tagName === 'amll:meta') {
      const key = meta.getAttribute('key')
      if (key) {
        const value = meta.getAttribute('value')
        if (value) {
          const existing = metadata.find((m) => m.key === key)
          if (existing) {
            existing.values.push(value)
          } else {
            metadata.push({
              key,
              values: [value],
            })
          }
        }
      }
    }
  }

  for (const agent of Array.from(ttmlDoc.querySelectorAll('ttm\\:agent'))) {
    if (agent.getAttribute('type') === 'person') {
      const id = agent.getAttribute('xml:id')
      if (id) {
        mainAgentId = id
        break
      }
    }
  }

  const lyricLines: LyricLine[] = []

  function parseLineElement(
    lineEl: Element,
    background = false,
    duet = false,
    parentItunesKey: string | null = null,
  ) {
    const line: LyricLine = newLine({
      background,
      duet: background
        ? duet
        : !!lineEl.getAttribute('ttm:agent') && lineEl.getAttribute('ttm:agent') !== mainAgentId,
    })
    let haveBg = false

    const startTime = lineEl.getAttribute('begin')
    const endTime = lineEl.getAttribute('end')

    const itunesKey = background ? parentItunesKey : lineEl.getAttribute('itunes:key')

    const romanWordData = itunesKey ? itunesWordRomanizations.get(itunesKey) : undefined
    const romanWords = background ? romanWordData?.bg : romanWordData?.main

    if (itunesKey) {
      const timedTrans = itunesTimedTranslations.get(itunesKey)
      const lineTrans = itunesTranslations.get(itunesKey)

      if (background) {
        line.translation = timedTrans?.bg ?? lineTrans?.bg ?? ''
      } else {
        line.translation = timedTrans?.main ?? lineTrans?.main ?? ''
      }

      const lineRoman = itunesLineRomanizations.get(itunesKey)
      if (background) {
        line.romanization = lineRoman?.bg ?? ''
      } else {
        line.romanization = lineRoman?.main ?? ''
      }
    }

    for (const wordNode of Array.from(lineEl.childNodes)) {
      if (wordNode.nodeType === Node.TEXT_NODE) {
        const text = wordNode.textContent ?? ''
        line.syllables.push(
          newSyllable({
            text,
            startTime: text.trim() ? line.startTime : 0,
            endTime: text.trim() ? line.endTime : 0,
          }),
        )
      } else if (wordNode.nodeType === Node.ELEMENT_NODE) {
        const wordEl = wordNode as Element
        const role = wordEl.getAttribute('ttm:role')

        if (wordEl.nodeName === 'span' && role) {
          if (role === 'x-bg') {
            parseLineElement(wordEl, true, line.duet, itunesKey)
            haveBg = true
          } else if (role === 'x-translation') {
            // Use inline translation only if there is no Apple Music style translation
            if (!line.translation) {
              line.translation = wordEl.innerHTML
            }
          } else if (role === 'x-roman') {
            if (!line.romanization) {
              line.romanization = wordEl.innerHTML
            }
          }
        } else if (wordEl.hasAttribute('begin') && wordEl.hasAttribute('end')) {
          const wordStartTime = str2ms(wordEl.getAttribute('begin') ?? '')
          const wordEndTime = str2ms(wordEl.getAttribute('end') ?? '')

          const word = newSyllable({
            text: wordEl.textContent ?? '',
            startTime: wordStartTime,
            endTime: wordEndTime,
          })
          const placeholdingBeat = wordEl.getAttribute('amll:empty-beat')
          if (placeholdingBeat) word.placeholdingBeat = Number(placeholdingBeat)

          if (romanWords) {
            const matchingRoman = romanWords.find(
              (r) => r.startTime === wordStartTime && r.endTime === wordEndTime,
            )
            if (matchingRoman) {
              word.romanization = matchingRoman.text
            }
          }

          line.syllables.push(word)
        }
      }
    }

    if (startTime && endTime) {
      line.startTime = str2ms(startTime)
      line.endTime = str2ms(endTime)
    } else {
      line.startTime = line.syllables
        .filter((w) => w.text.trim().length > 0)
        .reduce((pv, cv) => Math.min(pv, cv.startTime), Number.POSITIVE_INFINITY)
      line.endTime = line.syllables
        .filter((w) => w.text.trim().length > 0)
        .reduce((pv, cv) => Math.max(pv, cv.endTime), 0)
    }

    if (line.background) {
      const firstWord = line.syllables[0]
      if (firstWord && /^[（(]/.test(firstWord.text)) {
        firstWord.text = firstWord.text.substring(1)
        if (firstWord.text.length === 0) {
          line.syllables.shift()
        }
      }

      const lastWord = line.syllables[line.syllables.length - 1]
      if (lastWord && /[)）]$/.test(lastWord.text)) {
        lastWord.text = lastWord.text.substring(0, lastWord.text.length - 1)
        if (lastWord.text.length === 0) {
          line.syllables.pop()
        }
      }
    }

    if (haveBg) {
      const bgLine = lyricLines.pop()
      lyricLines.push(line)
      if (bgLine) lyricLines.push(bgLine)
    } else {
      lyricLines.push(line)
    }
  }

  for (const lineEl of Array.from(ttmlDoc.querySelectorAll('body p[begin][end]'))) {
    parseLineElement(lineEl, false, false, null)
  }

  const persistMetadata: Persist['metadata'] = {}
  for (const metaItem of metadata) {
    persistMetadata[metaItem.key] = metaItem.values
  }
  return {
    metadata: persistMetadata,
    lines: lyricLines,
  }
}

export function stringifyTTML(ttmlLyric: Persist): string {
  const params: LyricLine[][] = []
  const lyric = ttmlLyric.lines

  let tmp: LyricLine[] = []
  for (const line of lyric) {
    if (line.syllables.length === 0 && tmp.length > 0) {
      params.push(tmp)
      tmp = []
    } else {
      tmp.push(line)
    }
  }

  if (tmp.length > 0) {
    params.push(tmp)
  }

  const doc = new Document()

  function createWordElement(word: LyricSyllable): Element {
    const span = doc.createElement('span')
    span.setAttribute('begin', ms2str(word.startTime))
    span.setAttribute('end', ms2str(word.endTime))
    if (word.placeholdingBeat) span.setAttribute('amll:empty-beat', `${word.placeholdingBeat}`)
    span.appendChild(doc.createTextNode(word.text))
    return span
  }

  function createRomanizationSpan(word: LyricSyllable): Element {
    const span = doc.createElement('span')
    span.setAttribute('begin', ms2str(word.startTime))
    span.setAttribute('end', ms2str(word.endTime))
    span.appendChild(doc.createTextNode(word.romanization))
    return span
  }

  const ttRoot = doc.createElement('tt')

  ttRoot.setAttribute('xmlns', 'http://www.w3.org/ns/ttml')
  ttRoot.setAttribute('xmlns:ttm', 'http://www.w3.org/ns/ttml#metadata')
  ttRoot.setAttribute('xmlns:amll', 'http://www.example.com/ns/amll')
  ttRoot.setAttribute('xmlns:itunes', 'http://music.apple.com/lyric-ttml-internal')

  doc.appendChild(ttRoot)

  const head = doc.createElement('head')

  ttRoot.appendChild(head)

  const body = doc.createElement('body')
  const hasOtherPerson = !!lyric.find((v) => v.duet)

  const metadataEl = doc.createElement('metadata')
  const mainPersonAgent = doc.createElement('ttm:agent')
  mainPersonAgent.setAttribute('type', 'person')
  mainPersonAgent.setAttribute('xml:id', 'v1')

  metadataEl.appendChild(mainPersonAgent)

  if (hasOtherPerson) {
    const otherPersonAgent = doc.createElement('ttm:agent')
    otherPersonAgent.setAttribute('type', 'other')
    otherPersonAgent.setAttribute('xml:id', 'v2')

    metadataEl.appendChild(otherPersonAgent)
  }

  for (const [key, values] of Object.entries(ttmlLyric.metadata)) {
    for (const value of values) {
      const metaEl = doc.createElement('amll:meta')
      metaEl.setAttribute('key', key)
      metaEl.setAttribute('value', value)
      metadataEl.appendChild(metaEl)
    }
  }

  head.appendChild(metadataEl)

  let i = 0

  const romanizationMap = new Map<string, { main: LyricSyllable[]; bg: LyricSyllable[] }>()

  const guessDuration = lyric[lyric.length - 1]?.endTime ?? 0
  body.setAttribute('dur', ms2str(guessDuration))
  const isDynamicLyric = lyric.some(
    (line) => line.syllables.filter((v) => v.text.trim().length > 0).length > 1,
  )

  for (const param of params) {
    const paramDiv = doc.createElement('div')
    const beginTime = param[0]?.startTime ?? 0
    const endTime = param[param.length - 1]?.endTime ?? 0

    paramDiv.setAttribute('begin', ms2str(beginTime))
    paramDiv.setAttribute('end', ms2str(endTime))

    let skip = false
    for (const [lineIndex, line] of param.entries()) {
      if (skip) {
        skip = false
        continue
      }
      const lineP = doc.createElement('p')
      const beginTime = line.startTime ?? 0
      const endTime = line.endTime

      lineP.setAttribute('begin', ms2str(beginTime))
      lineP.setAttribute('end', ms2str(endTime))

      lineP.setAttribute('ttm:agent', line.duet ? 'v2' : 'v1')

      const itunesKey = `L${++i}`
      lineP.setAttribute('itunes:key', itunesKey)

      const mainWords = line.syllables
      let bgWords: LyricSyllable[] = []

      if (isDynamicLyric) {
        let beginTime = Number.POSITIVE_INFINITY
        let endTime = 0
        for (const word of line.syllables) {
          if (word.text.trim().length === 0) {
            lineP.appendChild(doc.createTextNode(word.text))
          } else {
            const span = createWordElement(word)
            lineP.appendChild(span)
            beginTime = Math.min(beginTime, word.startTime)
            endTime = Math.max(endTime, word.endTime)
          }
        }
        lineP.setAttribute('begin', ms2str(line.startTime))
        lineP.setAttribute('end', ms2str(line.endTime))
      } else {
        const word = line.syllables[0]!
        lineP.appendChild(doc.createTextNode(word.text))
        lineP.setAttribute('begin', ms2str(word.startTime))
        lineP.setAttribute('end', ms2str(word.endTime))
      }

      const nextLine = param[lineIndex + 1]
      if (nextLine?.background) {
        skip = true
        const bgLine = nextLine
        bgWords = bgLine.syllables

        const bgLineSpan = doc.createElement('span')
        bgLineSpan.setAttribute('ttm:role', 'x-bg')

        if (isDynamicLyric) {
          let beginTime = Number.POSITIVE_INFINITY
          let endTime = 0

          const firstWordIndex = bgLine.syllables.findIndex((w) => w.text.trim().length > 0)
          const lastWordIndex = bgLine.syllables.map((w) => w.text.trim().length > 0).lastIndexOf(true)

          for (const [sylIndex, word] of bgLine.syllables.entries()) {
            if (word.text.trim().length === 0) {
              bgLineSpan.appendChild(doc.createTextNode(word.text))
            } else {
              const span = createWordElement(word)

              if (sylIndex === firstWordIndex && span.firstChild) {
                span.firstChild.nodeValue = `(${span.firstChild.nodeValue}`
              }
              if (sylIndex === lastWordIndex && span.firstChild) {
                span.firstChild.nodeValue = `${span.firstChild.nodeValue})`
              }

              bgLineSpan.appendChild(span)
              beginTime = Math.min(beginTime, word.startTime)
              endTime = Math.max(endTime, word.endTime)
            }
          }
          bgLineSpan.setAttribute('begin', ms2str(beginTime))
          bgLineSpan.setAttribute('end', ms2str(endTime))
        } else {
          const word = bgLine.syllables[0]!
          bgLineSpan.appendChild(doc.createTextNode(`(${word.text})`))
          bgLineSpan.setAttribute('begin', ms2str(word.startTime))
          bgLineSpan.setAttribute('end', ms2str(word.endTime))
        }

        if (bgLine.translation) {
          const span = doc.createElement('span')
          span.setAttribute('ttm:role', 'x-translation')
          span.setAttribute('xml:lang', 'zh-CN')
          span.appendChild(doc.createTextNode(bgLine.translation))
          bgLineSpan.appendChild(span)
        }

        if (bgLine.romanization) {
          const span = doc.createElement('span')
          span.setAttribute('ttm:role', 'x-roman')
          span.appendChild(doc.createTextNode(bgLine.romanization))
          bgLineSpan.appendChild(span)
        }

        lineP.appendChild(bgLineSpan)
      }

      if (line.translation) {
        const span = doc.createElement('span')
        span.setAttribute('ttm:role', 'x-translation')
        span.setAttribute('xml:lang', 'zh-CN')
        span.appendChild(doc.createTextNode(line.translation))
        lineP.appendChild(span)
      }

      if (line.romanization) {
        const span = doc.createElement('span')
        span.setAttribute('ttm:role', 'x-roman')
        span.appendChild(doc.createTextNode(line.romanization))
        lineP.appendChild(span)
      }

      const hasRoman =
        mainWords.some((w) => w.romanization && w.romanization.trim().length > 0) ||
        bgWords.some((w) => w.romanization && w.romanization.trim().length > 0)

      if (hasRoman) {
        romanizationMap.set(itunesKey, { main: mainWords, bg: bgWords })
      }

      paramDiv.appendChild(lineP)
    }

    body.appendChild(paramDiv)
  }

  if (romanizationMap.size > 0) {
    const itunesMeta = doc.createElement('iTunesMetadata')
    itunesMeta.setAttribute('xmlns', 'http://music.apple.com/lyric-ttml-internal')

    const transliterations = doc.createElement('transliterations')
    const transliteration = doc.createElement('transliteration')

    for (const [key, { main, bg }] of romanizationMap.entries()) {
      const textEl = doc.createElement('text')
      textEl.setAttribute('for', key)

      for (const word of main) {
        if (word.romanization && word.romanization.trim().length > 0) {
          textEl.appendChild(createRomanizationSpan(word))
        } else if (word.text.trim().length === 0 && textEl.hasChildNodes()) {
          textEl.appendChild(doc.createTextNode(word.text))
        }
      }

      const hasBgRoman = bg.some((w) => w.romanization && w.romanization.trim().length > 0)
      if (hasBgRoman) {
        const bgSpan = doc.createElement('span')
        bgSpan.setAttribute('ttm:role', 'x-bg')

        const romanBgWords = bg.filter((w) => w.romanization && w.romanization.trim().length > 0)

        for (const [sylIndex, word] of romanBgWords.entries()) {
          const span = createRomanizationSpan(word)

          if (sylIndex === 0 && span.firstChild) {
            span.firstChild.nodeValue = `(${span.firstChild.nodeValue}`
          }
          if (sylIndex === romanBgWords.length - 1 && span.firstChild) {
            span.firstChild.nodeValue = `${span.firstChild.nodeValue})`
          }

          bgSpan.appendChild(span)

          const originalIndex = bg.indexOf(word)
          if (originalIndex > -1 && originalIndex < bg.length - 1) {
            const nextWord = bg[originalIndex + 1]!
            if (nextWord && nextWord.text.trim().length === 0) {
              bgSpan.appendChild(doc.createTextNode(nextWord.text))
            }
          }
        }
        textEl.appendChild(bgSpan)
      }

      transliteration.appendChild(textEl)
    }

    transliterations.appendChild(transliteration)
    itunesMeta.appendChild(transliterations)

    metadataEl.appendChild(itunesMeta)
  }

  ttRoot.appendChild(body)

  return new XMLSerializer().serializeToString(doc)
}
