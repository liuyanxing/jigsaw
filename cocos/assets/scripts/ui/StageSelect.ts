import { Node, Color, Graphics, Label } from 'cc'
import { type LocationConfig } from '../config/levels'
import { isCompleted, isUnlocked, currentIndex } from '../storage/progress'
import { loadSpriteFrame } from '../util/Res'
import { node, setPos, label, spriteNode, setSprite, onTap, fillRect } from '../util/Ui'

// 选关页:某地点的子关列表(5 列网格)+ 返回 + 标题 + 开始。样式从简(纯色卡 + 数字 + 缩略图)。
// 进度/解锁来自 storage/progress;缩略图按 level.image 经 Res 缓存加载。

const CREAM = new Color(255, 248, 232)
const SEL = new Color(245, 168, 58)
const LOCKBG = new Color(225, 215, 190)

export class StageSelect {
  readonly root: Node
  private W: number
  private H: number
  private gridRoot: Node
  private titleLabel: Label
  private location: LocationConfig | null = null
  private selected = 0
  private cards: { node: Node; bg: Graphics; size: number; locked: boolean; index: number }[] = []
  private onPlay: (loc: LocationConfig, idx: number) => void

  constructor(
    parent: Node,
    W: number,
    H: number,
    hooks: { onBack: () => void; onPlay: (loc: LocationConfig, idx: number) => void },
  ) {
    this.W = W
    this.H = H
    this.onPlay = hooks.onPlay
    this.root = node('StageSelect', W, H, parent)

    // 背景底色
    const bg = node('bg', W, H, this.root)
    fillRect(bg, W, H, new Color(198, 234, 241))

    // 返回
    const back = setPos(node('back', 64, 44, this.root), -W / 2 + 40, H / 2 - 32)
    fillRect(back, 64, 44, CREAM, 10)
    label('← 返回', 16, new Color(94, 68, 19), back)
    onTap(back, hooks.onBack)

    // 标题
    const titleNode = setPos(node('title', W, 40, this.root), 0, H / 2 - 30)
    this.titleLabel = label('', 24, new Color(94, 68, 19), titleNode).getComponent(Label)!

    // 网格容器
    this.gridRoot = node('grid', W, H, this.root)

    // 开始
    const start = setPos(node('start', 240, 56, this.root), 0, -H / 2 + 42)
    fillRect(start, 240, 56, SEL, 16)
    label('开始拼图', 22, new Color(107, 61, 0), start)
    onTap(start, () => {
      if (this.location) this.onPlay(this.location, this.selected)
    })
  }

  show(location: LocationConfig): void {
    this.location = location
    this.titleLabel.string = location.name
    this.selected = currentIndex(location)
    this.buildGrid()
  }

  private buildGrid(): void {
    const loc = this.location
    if (!loc) return
    this.gridRoot.removeAllChildren()
    this.cards = []
    const cur = currentIndex(loc)

    const n = loc.levels.length
    const cols = 5
    const rows = Math.ceil(n / cols)
    const gap = 8
    const availW = this.W * 0.94
    const availH = this.H - 170
    const card = Math.min((availW - gap * (cols - 1)) / cols, (availH - gap * (rows - 1)) / rows)
    const gridW = card * cols + gap * (cols - 1)
    const startX = -gridW / 2 + card / 2
    const startY = this.H / 2 - 78 - card / 2

    loc.levels.forEach((level, i) => {
      const r = Math.floor(i / cols)
      const c = i % cols
      const cx = startX + c * (card + gap)
      const cy = startY - r * (card + gap)
      const completed = isCompleted(level.id)
      const unlocked = isUnlocked(loc, i)
      const locked = !unlocked
      const current = i === cur && !completed

      const cardNode = setPos(node('card-' + i, card, card, this.gridRoot), cx, cy)
      const bg = fillRect(cardNode, card, card, locked ? LOCKBG : CREAM, 10)

      if (!locked) {
        const thumbSize = card - 10
        const thumb = spriteNode('thumb', thumbSize, thumbSize, null, cardNode)
        void loadSpriteFrame(level.image).then((sf) => {
          if (sf) setSprite(thumb, sf, thumbSize, thumbSize)
        })
      } else {
        label('🔒', card * 0.4, new Color(125, 108, 80), cardNode)
      }

      // 角标:完成 ✓ / 当前 ●
      if (!locked && (completed || current)) {
        const badge = setPos(node('badge', 1, 1, cardNode), card / 2 - 8, card / 2 - 8)
        label(completed ? '✓' : '●', 16, completed ? new Color(60, 160, 70) : SEL, badge)
      }

      // 序号(左下)
      const num = setPos(node('num', 1, 1, cardNode), -card / 2 + 12, -card / 2 + 12)
      label(String(i + 1), 13, new Color(122, 83, 32), num)

      if (!locked) onTap(cardNode, () => {
        this.selected = i
        this.refreshSelection()
      })

      this.cards.push({ node: cardNode, bg, size: card, locked, index: i })
    })

    this.refreshSelection()
  }

  private refreshSelection(): void {
    for (const ci of this.cards) {
      const base = ci.locked ? LOCKBG : CREAM
      fillRect(ci.node, ci.size, ci.size, ci.index === this.selected ? SEL : base, 10)
    }
  }
}
