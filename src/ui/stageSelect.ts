// 选关页:某地点(如"巴黎")下的子关卡列表。世界地图节点 → 本页 → 拼图对局。
// 资产:返回键、花框标题、完成/进行中徽标、橙色开始按钮(序号牌用 CSS,置于左下角)。
// 暂缺资产用近似:顶部货币栏用 emoji;锁定用内联 SVG 灰锁;卡面与整页背景用 CSS;
// 缩略图暂用该关实际会玩的内置图(矩形铺满,贴近参考;后续换地标实拍图)。

import backUrl from '../../assets/btn_back.png'
import floralUrl from '../../assets/label_floral_bg.png'
import orangeBtnUrl from '../../assets/label_pill_orange_bg.png'
import checkUrl from '../../assets/icon_check_green.png'
import moreUrl from '../../assets/icon_more.png'
import { type LevelDef } from './levelMap'
import { type ImageRegistry, type GameImage } from '../assets/images'

const TOTAL = 25 // 每个地点的子关卡数(5×5)
const DEMO_COMPLETED = 1 // 占位进度:已完成关数
const DEMO_UNLOCKED = 3 // 占位进度:已解锁关数

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
  onPlay(location: LevelDef, subLevel: number): void
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
  private location: LevelDef | null = null
  private selected = 0
  private thumbUrl = ''

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

  show(location: LevelDef): void {
    this.location = location
    this.titleText.textContent = location.name.replace(/^\d+\.\s*/, '') // "1. 巴黎" → "巴黎"
    const img = this.registry.get(location.imageId)
    this.thumbUrl = img ? this.makeThumb(img) : ''
    this.selected = Math.min(DEMO_COMPLETED, DEMO_UNLOCKED - 1) // 默认选中"当前"关
    this.buildGrid()
  }

  /** 用该关实际会玩的图渲染一张缩略图(矩形铺满卡面)。 */
  private makeThumb(img: GameImage): string {
    const w = 150
    const h = Math.max(1, Math.round((w * img.height) / img.width))
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    cv.getContext('2d')!.drawImage(img.source, 0, 0, w, h)
    return cv.toDataURL()
  }

  private buildGrid(): void {
    this.grid.replaceChildren()
    for (let i = 0; i < TOTAL; i++) {
      const locked = i >= DEMO_UNLOCKED
      const completed = i < DEMO_COMPLETED
      const current = i === DEMO_COMPLETED

      const card = document.createElement('button')
      card.className = 'stage-card' + (locked ? ' locked' : '')

      const wrap = div('card-thumb-wrap')
      if (locked) {
        wrap.innerHTML = LOCK_SVG
      } else {
        const thumb = document.createElement('img')
        thumb.className = 'card-thumb'
        thumb.src = this.thumbUrl
        thumb.alt = ''
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
    }
    this.refreshSelection()
  }

  private refreshSelection(): void {
    const cards = [...this.grid.children] as HTMLElement[]
    cards.forEach((c, i) => c.classList.toggle('sel', i === this.selected))
  }
}
