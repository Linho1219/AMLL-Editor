// Node compatible TTML parser and stringifier
// Following AMLL TTML Lyric Format
// See https://www.w3.org/TR/2018/REC-ttml1-20181108/

// import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

import { ms2str, str2ms } from '../../../utils/timeModel'
import { importPersist, type Persist } from '..'
import type { LyricLine, MetadataKey } from '@core/types'
import { coreCreate } from '@states/stores/core'

export function parseTTML(ttmlString: string): Persist {
  const raw = new DOMParser().parseFromString(ttmlString, 'application/xml').documentElement

  const isElement = (node: Node | null): node is Element => node?.nodeType === 1
  const isText = (node: Node | null): node is Text => node?.nodeType === 3
  const matchTag = (node: Element, tag: string): boolean =>
    node.tagName.toLowerCase() === tag.toLowerCase()
  const getAttrMap = (node: Element): Map<string, string> =>
    new Map(Array.from(node.attributes).map((attr) => [attr.name, attr.value]))
  const safeStr2ms = (str: string | null | undefined): number => str2ms(str || '0') || 0

  // xmldom does not implement querySelector
  // so make a simple tag selector here
  const tagSelect = (...tags: string[]): Element | null => tagSelectOnNode(raw, tags)
  function tagSelectOnNode(node: Element, tags: string[]): Element | null {
    const targetTag = tags.shift()
    if (!targetTag) return node
    if (!node.childNodes) return null
    for (const child of Array.from(node.childNodes)) {
      if (!isElement(child)) continue
      if (child.tagName === targetTag) return tagSelectOnNode(child, tags)
    }
    return null
  }

  // Metadata
  const agentToDuet = new Map<string, boolean>()
  const metadataNode = tagSelect('head', 'metadata')
  const metadata: Record<MetadataKey, string[]> = {}
  for (const child of Array.from(metadataNode?.childNodes ?? [])) {
    if (child.nodeType !== 1) continue
    const node = child as Element
    const tagname = node.nodeName.toLowerCase()
    const attrs = getAttrMap(node)
    if (tagname === 'ttm:agent') {
      const id = attrs.get('xml:id')
      if (!id) continue
      agentToDuet.set(id, agentToDuet.size !== 0)
    } else if (tagname === 'amll:meta') {
      const key = attrs.get('key')
      const value = attrs.get('value')
      if (!key || !value) continue
      if (!Array.isArray(metadata[key])) metadata[key] = []
      metadata[key].push(value)
    }
  }

  // Contents
  const bodyNode = tagSelect('body')
  if (!bodyNode) throw new Error('No <body> found in TTML')
  const rawLines = Array.from(bodyNode.childNodes)
    .filter((node) => isElement(node))
    .filter((node) => matchTag(node, 'div'))
    .flatMap((div) =>
      Array.from(div.childNodes)
        .filter((node) => isElement(node))
        .filter((el) => matchTag(el, 'p')),
    )
  const lyricLines: LyricLine[] = []
  function processLine(rawLine: Element, removeBrace?: boolean) {
    // Attrs
    const attrs = getAttrMap(rawLine)
    const line = coreCreate.newLine({
      startTime: safeStr2ms(attrs.get('begin')),
      endTime: safeStr2ms(attrs.get('end')),
    })
    lyricLines.push(line)
    const agentId = attrs.get('ttm:agent')
    if (agentId) line.duet = agentToDuet.get(agentId) ?? false
    const role = attrs.get('ttm:role')
    if (role === 'x-bg') line.background = true
    // Contents
    const children = Array.from(rawLine.childNodes)
    for (const child of children) {
      let textContent = child.textContent || ''
      if (isText(child)) {
        const word = coreCreate.newWord({
          text: textContent,
        })
        line.words.push(word)
      } else if (isElement(child) && matchTag(child, 'span')) {
        const spanAttrs = getAttrMap(child)
        const role = spanAttrs.get('ttm:role')
        if (role === 'x-bg') {
          // Current line pushed already
          // so nested background line will be after current line
          processLine(child, true)
        } else if (role === 'x-translation') {
          line.translation = textContent
        } else if (role === 'x-roman') {
          line.romanization = textContent
        } else {
          const word = coreCreate.newWord({
            text: textContent,
            startTime: safeStr2ms(spanAttrs.get('begin')),
            endTime: safeStr2ms(spanAttrs.get('end')),
            placeholdingBeat: Number(spanAttrs.get('amll:empty-beat') || '0') || 0,
          })
          line.words.push(word)
        }
      } else console.warn('Unknown node type in TTML line:', child)
    }
    // Post process
    if (line.words.length === 1) {
      const onlyWord = line.words[0]!
      if (!onlyWord.startTime && line.startTime) onlyWord.startTime = line.startTime
      if (!onlyWord.endTime && line.endTime) onlyWord.endTime = line.endTime
    }
    if (!line.startTime || !line.endTime) {
      const firstWord = line.words[0]
      const lastWord = line.words.at(-1)
      if (firstWord?.startTime && !line.startTime) line.startTime = firstWord.startTime
      if (lastWord?.endTime && !line.endTime) line.endTime = lastWord.endTime
    }
    if (removeBrace && line.words.length) {
      const firstWord = line.words[0]!
      const lastWord = line.words.at(-1)!
      firstWord.text = firstWord.text.replace(/^\(/, '')
      lastWord.text = lastWord.text.replace(/\)$/, '')
    }
  }
  for (const rawLine of rawLines) processLine(rawLine)
  return { metadata, lyricLines }
}

export function stringifyTTML(data: Persist) {
  const rootAttrs = {
    xmlns: 'http://www.w3.org/ns/ttml',
    'xmlns:ttm': 'http://www.w3.org/ns/ttml#metadata',
    'xmlns:amll': 'http://www.example.com/ns/amll',
    'xmlns:itunes': 'http://music.apple.com/lyric-ttml-internal',
  } as const
  let globalStart = Infinity
  let globalEnd = -Infinity
  let hasDuet = false
  const doc = new DOMParser().parseFromString('<tt></tt>', 'application/xml')
  const root = doc.documentElement
  for (const [key, value] of Object.entries(rootAttrs)) root.setAttribute(key, value)
  const head = root.appendChild(doc.createElement('head'))
  const body = root.appendChild(doc.createElement('body'))
  const div = body.appendChild(doc.createElement('div'))

  // Content
  let lineIndex = 1
  function applyAttrToEl(el: Element, attrMap: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(attrMap))
      if (value !== undefined) el.setAttribute(key, value)
  }
  function writeLineToEl(line: LyricLine | null, bgLines: LyricLine[] = []) {
    let isPlaceholder = false
    if (line === null) {
      if (bgLines.length === 0) throw new Error('Cannot write null line without background lines')
      line = coreCreate.newLine()
      isPlaceholder = true
    }
    if (line.background && bgLines.length) {
      throw new Error('Background lines cannot have nested background lines')
    }
    // Attrs
    const parentNode = doc.createElement(line.background ? 'span' : 'p')
    applyAttrToEl(parentNode, {
      'ttm:role': line.background ? 'x-bg' : undefined,
      begin: ms2str(
        isPlaceholder ? Math.min(...bgLines.map((l) => l.startTime), 0) : line.startTime,
      ),
      end: ms2str(isPlaceholder ? Math.max(...bgLines.map((l) => l.endTime), 0) : line.endTime),
      'ttm:agent': line.duet ? `v2` : 'v1',
      'itunes:key': line.background ? undefined : `L${lineIndex++}`,
    })
    hasDuet ||= line.duet
    globalStart = Math.min(globalStart, line.startTime)
    globalEnd = Math.max(globalEnd, line.endTime)

    // Contents
    for (const [index, word] of line.words.entries()) {
      let content = word.text
      if (line.background) {
        if (index === 0) content = `(${content}`
        else if (index === line.words.length - 1) content = `${content})`
      }
      if (word.text.trim() === '') {
        parentNode.appendChild(doc.createTextNode(content))
        continue
      }
      const span = doc.createElement('span')
      applyAttrToEl(span, {
        begin: ms2str(word.startTime),
        end: ms2str(word.endTime),
        'amll:empty-beat': word.placeholdingBeat.toString() || undefined,
      })
      span.appendChild(doc.createTextNode(content))
      parentNode.appendChild(span)
    }

    // Additional contents
    for (const bgLine of bgLines) parentNode.appendChild(writeLineToEl(bgLine))
    if (line.translation) {
      const translationSpan = doc.createElement('span')
      applyAttrToEl(translationSpan, { 'ttm:role': 'x-translation' })
      translationSpan.appendChild(doc.createTextNode(line.translation))
      parentNode.appendChild(translationSpan)
    }
    if (line.romanization) {
      const romanSpan = doc.createElement('span')
      applyAttrToEl(romanSpan, { 'ttm:role': 'x-roman' })
      romanSpan.appendChild(doc.createTextNode(line.romanization))
      parentNode.appendChild(romanSpan)
    }

    return parentNode
  }
  for (const [index, line] of data.lyricLines.entries()) {
    if (line.background && index > 0) continue
    const bgLines: LyricLine[] = []
    for (let j = index + 1; j < data.lyricLines.length; j++) {
      const nextLine = data.lyricLines[j]!
      if (nextLine.background) bgLines.push(nextLine)
      else break
    }
    div.appendChild(writeLineToEl(line.background ? null : line, bgLines))
  }

  // Metadata
  const metadataNode = head.appendChild(doc.createElement('metadata'))
  metadataNode.appendChild(doc.createElement('ttm:agent')).setAttribute('xml:id', 'v0')
  if (hasDuet) metadataNode.appendChild(doc.createElement('ttm:agent')).setAttribute('xml:id', 'v2')
  for (const [key, values] of Object.entries(data.metadata))
    for (const value of values) {
      const metaEl = metadataNode.appendChild(doc.createElement('amll:meta'))
      applyAttrToEl(metaEl, { key, value })
    }

  // Output
  return new XMLSerializer().serializeToString(doc)
}

export const importTTML = (s: string) => importPersist(parseTTML(s))
