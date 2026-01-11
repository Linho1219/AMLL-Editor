import { getIconData, iconToSVG, replaceIDs } from '@iconify/utils'
import fs from 'node:fs'
import path from 'node:path'

const iconSets: IconManifest = {}
interface IconManifest {
  [key: string]: any
}

const wrapSvg = (viewBox: string, body: string) =>
  /* html */ `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`

const wrapStyleBlock = (selector: string, svg: string) =>
  /* css */ `${selector} { --svg: url("data:image/svg+xml,${encodeURIComponent(svg)}") }`

const makeBlock = (iconKey: string) => {
  const [set, iconName] = iconKey.split(':')
  if (!iconSets[set]) {
    const string = fs.readFileSync(
      path.resolve(process.cwd(), `node_modules/@iconify/json/json/${set}.json`),
      'utf-8',
    )
    iconSets[set] = JSON.parse(string)
  }
  const iconData = getIconData(iconSets[set], iconName)
  if (!iconData) throw new Error(`Icon "${iconKey}" not found in icon set ${set}.`)
  const svg = iconToSVG(iconData, { width: '1em', height: '1em' })
  const body = replaceIDs(svg.body)
  const svgString = wrapSvg(svg.attributes.viewBox, body)
  const selector = `.${iconKey.replace(/:/g, '-')}`
  return wrapStyleBlock(selector, svgString)
}

export function buildStylesheet(manifestJSON: string) {
  const manifest: IconManifest = JSON.parse(manifestJSON)
  return [...new Set(Object.values(manifest))].map(makeBlock).join('\n')
}
