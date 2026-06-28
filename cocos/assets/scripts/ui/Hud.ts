import { Node, Color, Label, Graphics } from 'cc'
import { node, setPos, label, fillRect, onTap } from '../util/Ui'
import { type BoardStats } from '../game/BoardView'

// 对局 HUD:顶栏计时 + 步数 + 进度条;完成弹窗(用时/步数 + 再玩/返回)。样式暖色。

const TEXT = new Color(94, 68, 19)
const CREAM = new Color(255, 248, 232)
const ACCENT = new Color(245, 168, 58)

function fmtTime(ms: number): string {
  const t = Math.floor(ms / 1000)
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export class Hud {
  private W: number
  private timeLabel: Label
  private movesLabel: Label
  private prog: Graphics
  private progW: number
  private modal: Node | null = null
  private parent: Node
  private hooks: { onReplay: () => void; onExit: () => void }

  constructor(parent: Node, W: number, H: number, hooks: { onReplay: () => void; onExit: () => void }) {
    this.W = W
    this.parent = parent
    this.hooks = hooks

    // 顶栏文本(返回键由 Boot 放在左上,这里居中放计时/步数)
    const topY = H / 2 - 30
    this.timeLabel = label('0:00', 18, TEXT, setPos(node('time', 120, 28, parent), -60, topY)).getComponent(Label)!
    this.movesLabel = label('步数 0', 18, TEXT, setPos(node('moves', 120, 28, parent), 80, topY)).getComponent(Label)!

    // 进度条
    this.progW = W * 0.7
    const bar = setPos(node('prog', this.progW, 10, parent), 0, H / 2 - 56)
    this.prog = bar.addComponent(Graphics)
    this.drawProgress(0)
  }

  setStats(s: BoardStats): void {
    this.timeLabel.string = fmtTime(s.elapsedMs)
    this.movesLabel.string = `步数 ${s.moves}`
    this.drawProgress(s.total ? s.placed / s.total : 0)
  }

  private drawProgress(ratio: number): void {
    const g = this.prog
    const w = this.progW
    const h = 10
    g.clear()
    g.fillColor = new Color(120, 80, 30, 60)
    g.roundRect(-w / 2, -h / 2, w, h, 5)
    g.fill()
    const fw = Math.max(0, Math.min(1, ratio)) * w
    if (fw > 1) {
      g.fillColor = ACCENT
      g.roundRect(-w / 2, -h / 2, fw, h, 5)
      g.fill()
    }
  }

  showComplete(s: BoardStats): void {
    this.hideComplete()
    const W = this.W
    const overlay = node('complete', W, 2000, this.parent)
    fillRect(overlay, W, 2000, new Color(40, 28, 10, 150))
    overlay.setSiblingIndex(this.parent.children.length - 1)

    const panel = node('panel', Math.min(W * 0.8, 420), 280, overlay)
    fillRect(panel, Math.min(W * 0.8, 420), 280, CREAM, 20)
    label('完成!', 30, ACCENT, setPos(node('t', 1, 1, panel), 0, 96))
    label(`用时 ${fmtTime(s.elapsedMs)}`, 20, TEXT, setPos(node('t1', 1, 1, panel), 0, 40))
    label(`步数 ${s.moves}`, 20, TEXT, setPos(node('t2', 1, 1, panel), 0, 6))

    const replay = setPos(node('replay', 150, 56, panel), -82, -76)
    fillRect(replay, 150, 56, CREAM, 16)
    label('再玩一次', 18, TEXT, replay)
    onTap(replay, () => {
      this.hideComplete()
      this.hooks.onReplay()
    })

    const exit = setPos(node('exit', 150, 56, panel), 82, -76)
    fillRect(exit, 150, 56, ACCENT, 16)
    label('返回', 18, new Color(107, 61, 0), exit)
    onTap(exit, () => {
      this.hideComplete()
      this.hooks.onExit()
    })

    this.modal = overlay
  }

  hideComplete(): void {
    if (this.modal) {
      this.modal.destroy()
      this.modal = null
    }
  }
}
