// 关卡配置(Cocos 版):从 resources/levels.json 运行时加载并展开。
// 类型与展开逻辑与 Web 版完全一致;仅把 fetch('/levels.json') 换成 resources.load('levels', JsonAsset)。
// 图片引用(如 '/assets/levels/france-1.jpg')经 refToResPath() 转成 resources 路径('levels/france-1')。

import { resources, JsonAsset } from 'cc'

export interface PuzzleConfig {
  id: string
  image: string
  rows: number
  cols: number
  seed?: number
  title?: string
}

export interface LocationConfig {
  id: string
  name: string
  icon: string
  map: { x: number; y: number }
  levels: PuzzleConfig[]
}

export interface MapPage {
  id: string
  background: string
  locations: LocationConfig[]
}

interface RawLocation {
  id: string
  name: string
  icon: string
  map: { x: number; y: number }
  count: number
  images: string[]
  seedBase?: number
  overrides?: Record<string, Partial<PuzzleConfig>>
}
interface RawPage {
  id: string
  background: string
  locations: RawLocation[]
}
interface RawConfig {
  diffRamp: [number, number][]
  pages: RawPage[]
}

const FALLBACK_RAMP: [number, number][] = [
  [3, 3],
  [4, 4],
  [5, 5],
  [6, 6],
  [7, 7],
]

/** Web 图片引用('/assets/levels/france-1.jpg' 或 'levels/france-1') → resources 相对路径(无扩展名)。 */
export function refToResPath(ref: string): string {
  let p = ref.trim()
  p = p.replace(/^\/?assets\//, '') // 去掉前导 /assets/ 或 assets/
  p = p.replace(/^\//, '')
  p = p.replace(/\.[a-zA-Z0-9]+$/, '') // 去扩展名
  return p
}

function expand(loc: RawLocation, ramp: [number, number][]): LocationConfig {
  const levels: PuzzleConfig[] = []
  for (let i = 0; i < loc.count; i++) {
    const [rows, cols] = ramp[Math.min(Math.floor(i / 5), ramp.length - 1)]
    const base: PuzzleConfig = {
      id: `${loc.id}-${String(i + 1).padStart(2, '0')}`,
      image: loc.images[i % loc.images.length],
      rows,
      cols,
      seed: (loc.seedBase ?? 0) + i + 1,
    }
    levels.push({ ...base, ...(loc.overrides?.[String(i)] ?? {}) })
  }
  return { id: loc.id, name: loc.name, icon: loc.icon, map: loc.map, levels }
}

/** 运行时加载 resources/levels.json → 多张地图页。失败/非法项跳过并告警。 */
export function loadPages(path = 'levels'): Promise<MapPage[]> {
  return new Promise((resolve) => {
    resources.load(path, JsonAsset, (err, asset) => {
      if (err || !asset) {
        console.error('[levels] 加载 levels.json 失败,请确认 resources/levels.json 已导入:', err)
        resolve([])
        return
      }
      const data = asset.json as RawConfig
      const ramp = Array.isArray(data.diffRamp) && data.diffRamp.length ? data.diffRamp : FALLBACK_RAMP
      const pages: MapPage[] = []
      for (const page of data.pages ?? []) {
        if (!page?.id || !page?.background || !Array.isArray(page.locations)) {
          console.warn('[levels] 跳过非法地图页配置:', page)
          continue
        }
        const locations: LocationConfig[] = []
        for (const loc of page.locations) {
          if (!loc?.id || !loc?.name || !Array.isArray(loc.images) || !loc.images.length || !loc.count) {
            console.warn('[levels] 跳过非法地点配置:', loc)
            continue
          }
          locations.push(expand(loc, ramp))
        }
        pages.push({ id: page.id, background: page.background, locations })
      }
      resolve(pages)
    })
  })
}
