// 关卡配置:运行时从 public/levels.json 加载并展开。改关卡只改 JSON(放 public/,运行时 fetch,
// 不打进 bundle)→ 刷新即生效,无需重新编译。
// 顶层是多张地图页(pages),每页一张背景图 + 一组地点;加页面 = JSON 加一条 + 丢一张背景图进 public/。

export interface PuzzleConfig {
  id: string // 全局唯一稳定 id(进度 key),如 'paris-01'
  image: string // 图片引用:'builtin:<id>' 或 public 路径/URL
  rows: number
  cols: number
  seed?: number // 固定打乱布局(可复现)
  title?: string
}

export interface LocationConfig {
  id: string
  name: string
  icon: string // 地标圆标(public 路径/URL)
  map: { x: number; y: number }
  levels: PuzzleConfig[]
}

export interface MapPage {
  id: string
  background: string // 地图背景(public 路径/URL),整屏 cover
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

/** 用难度阶梯 + 图片轮转 + overrides 展开一个地点的全部子关。 */
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

/** 运行时加载关卡配置 → 多张地图页。失败/非法项会被跳过并告警,不拖垮整页。 */
export async function loadPages(url = '/levels.json'): Promise<MapPage[]> {
  let data: RawConfig
  try {
    const res = await fetch(url, { cache: 'no-cache' }) // 总是取最新,保证"改 JSON + 刷新即生效"
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data = (await res.json()) as RawConfig
  } catch (e) {
    console.error('[levels] 加载 levels.json 失败:', e)
    return []
  }
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
  return pages
}
