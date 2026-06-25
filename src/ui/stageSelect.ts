// 选关页:某地点下的子关卡列表。世界地图节点 → 本页 → 拼图对局。
// 数据来自 LocationConfig(config/levels.ts);进度/解锁来自 storage/progress.ts。
// 资产:返回键、花框标题、完成/进行中徽标、橙色开始按钮(序号牌用 CSS 圆牌,左下角)。
// 暂缺资产用近似:顶部货币栏用 emoji;锁定用内联 SVG 灰锁;卡面/整页背景用 CSS。

import backUrl from '../../assets/btn_back.png'
import floralUrl from '../../assets/label_floral_bg.png'
import orangeBtnUrl from '../../assets/label_pill_orange_bg.png'
import checkUrl from '../../assets/icon_check_green.png'
import moreUrl from '../../assets/icon_more.png'
import { type LocationConfig } from '../config/levels'
import { isCompleted, isUnlocked, currentIndex } from '../storage/progress'
import { type ImageRegistry, type GameImage } from '../assets/images'

// 顶部货币(暂无图标资产,用 emoji 近似参考图)
const CURRENCIES = [
  { ic: '⭐', val: '2350' },
  { ic: '💎', val: '250' },
  { ic: '❤️', val: '1986' },
]

// 灰色挂锁(无锁定图标资产,用内联 SVG 近似参考图的灰锁)
const LOCK_SVG = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
  <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#9c8a6e" stroke-width="2.3" stroke-linecap="round"/>
  <rect x="5.2" y="10.4" width="13.6" height="9.8" rx="2.4" fill="#c4b495"/>
  <circle cx="12" cy="14.6" r="1.6" fill="#7d6c50"/>
  <rect x="11.2" y="14.6" width="1.6" height="3.4" rx=".8" fill="#7d6c50"/>
</svg>`

export interface StageSelectHooks {
  onBack(): void
  onPlay(location: LocationConfig, subLevel: number): void
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement('div')
  d.className = cls
  return d
}

export class StageSelect {
  private registry: ImageRegistry
  private hooks: StageSelectHooks
  private titleText = document.createElement('span')
  private grid = div('stage-grid')
  private location: LocationConfig | null = null
  private selected = 0
  private thumbCache = new Map<string, string>() // image ref → 缩略图 dataURL

  constructor(root: HTMLElement, registry: ImageRegistry, hooks: StageSelectHooks) {
    this.registry = registry
    this.hooks = hooks

    // 顶栏:返回 + 货币
    const back = document.createElement('button')
    back.className = 'stage-back'
    const backImg = document.createElement('img')
    backImg.src = backUrl
    backImg.alt = '返回'
    back.appendChild(backImg)
    back.onclick = () => hooks.onBack()

    const cluster = div('cur-cluster')
    for (const c of CURRENCIES) {
      const pill = div('cur')
      const ic = document.createElement('span')
      ic.className = 'ic'
      ic.textContent = c.ic
      const val = document.createElement('span')
      val.className = 'val'
      val.textContent = c.val
      const plus = div('plus')
      plus.textContent = '+'
      pill.append(ic, val, plus)
      cluster.append(pill)
    }
    const topbar = div('stage-topbar')
    topbar.append(back, cluster)

    // 花框标题
    const titleWrap = div('stage-title')
    titleWrap.style.backgroundImage = `url(${floralUrl})`
    this.titleText.className = 'stage-title-text'
    titleWrap.appendChild(this.titleText)

    // 开始拼图
    const startBtn = document.createElement('button')
    startBtn.className = 'stage-start'
    startBtn.style.backgroundImage = `url(${orangeBtnUrl})`
    startBtn.textContent = '开始拼图'
    startBtn.onclick = () => {
      if (this.location) this.hooks.onPlay(this.location, this.selected)
    }
    const bottom = div('stage-bottom')
    bottom.append(startBtn)

    const page = div('stage')
    page.append(topbar, titleWrap, this.grid, bottom)
    root.appendChild(page)
  }

  show(location: LocationConfig): void {
    this.location = location
    this.titleText.textContent = location.name
    this.selected = currentIndex(location) // 默认选中"当前"关
    this.buildGrid()
  }

  private buildGrid(): void {
    const loc = this.location
    if (!loc) return
    const cur = currentIndex(loc)
    this.grid.replaceChildren()

    loc.levels.forEach((level, i) => {
      const completed = isCompleted(level.id)
      const unlocked = isUnlocked(loc, i)
      const locked = !unlocked
      const current = i === cur && !completed

      const card = document.createElement('button')
      card.className = 'stage-card' + (locked ? ' locked' : '')

      const wrap = div('card-thumb-wrap')
      if (locked) {
        wrap.innerHTML = LOCK_SVG
      } else {
        const thumb = document.createElement('img')
        thumb.className = 'card-thumb'
        thumb.alt = ''
        void this.setThumb(thumb, level.image)
        wrap.appendChild(thumb)
        card.onclick = () => {
          this.selected = i
          this.refreshSelection()
        }
      }
      card.appendChild(wrap)

      if (!locked && (completed || current)) {
        const badge = document.createElement('img')
        badge.className = 'card-badge'
        badge.src = completed ? checkUrl : moreUrl
        badge.alt = ''
        card.appendChild(badge)
      }

      const num = div('card-num')
      num.textContent = String(i + 1)
      card.appendChild(num)

      this.grid.appendChild(card)
    })
    this.refreshSelection()
  }

  /** 异步解析该关图片 → 缩略图,按 image ref 缓存(同地点多关共用图只算一次)。 */
  private async setThumb(imgEl: HTMLImageElement, ref: string): Promise<void> {
    const cached = this.thumbCache.get(ref)
    if (cached) {
      imgEl.src = cached
      return
    }
    const gi = await this.registry.resolve(ref)
    if (!gi) return
    const url = this.makeThumb(gi)
    this.thumbCache.set(ref, url)
    imgEl.src = url
  }

  private makeThumb(img: GameImage): string {
    const w = 150
    const h = Math.max(1, Math.round((w * img.height) / img.width))
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    cv.getContext('2d')!.drawImage(img.source, 0, 0, w, h)
    return cv.toDataURL()
  }

  private refreshSelection(): void {
    const cards = [...this.grid.children] as HTMLElement[]
    cards.forEach((c, i) => c.classList.toggle('sel', i === this.selected))
  }
}
