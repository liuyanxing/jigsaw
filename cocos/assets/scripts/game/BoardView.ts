import {
  _decorator,
  Component,
  Node,
  Sprite,
  SpriteFrame,
  Texture2D,
  UITransform,
  Vec3,
  Color,
  Graphics,
  EventTouch,
} from 'cc'
import { sliceTexture } from './Slicer'
import { makeGrid, type Grid } from '../core/grid'
import { generatePuzzle, type PuzzleState } from '../core/puzzle'
import { computeGroups, groupCells, type Groups } from '../core/groups'
import { applyGroupMove } from '../core/move'
import { isComplete, correctCount } from '../core/state'

const { ccclass } = _decorator

// 对局视图(M3):把一张图切成 rows×cols 块,按 order 摆放;拖动整组→交换→重新成组→完成。
// 渲染/输入是 Cocos 平台层;棋盘逻辑全部复用 core(generatePuzzle/computeGroups/applyGroupMove/isComplete)。
// 坐标:Cocos UI 原点在节点中心、y 向上;网格 row 0 在顶部,故 y 用 (H/2 - ...)。
// M3:块满格无缝铺;同组相邻无缝,异组之间画 cream 留缝 + 组外缘描边;计时/步数/进度经 onStats 上报。

const GAP_COLOR = new Color(236, 225, 198) // 异组留缝色(对齐对局页底色)
const LINE_COLOR = new Color(120, 80, 30, 90) // 组外缘描边

export interface BoardStats {
  elapsedMs: number
  moves: number
  placed: number
  total: number
}

@ccclass('BoardView')
export class BoardView extends Component {
  private grid!: Grid
  private state!: PuzzleState
  private groups!: Groups
  private frames: SpriteFrame[] = []
  private pieceNodes: Node[] = [] // 下标 = pieceId
  private cellW = 0
  private cellH = 0
  private boardW = 0
  private boardH = 0
  private seamFill!: Graphics
  private seamLine!: Graphics

  // 拖拽态
  private drag: { cells: number[]; grabCell: number; startX: number; startY: number; curX: number; curY: number } | null =
    null

  // 计时/统计
  private elapsedMs = 0
  private started = false
  private finished = false
  private statsAccum = 0

  onComplete: ((s: BoardStats) => void) | null = null
  onStats: ((s: BoardStats) => void) | null = null

  /** 起一局:tex 关卡图;maxW/maxH 为可用区域(由 Boot 传入 Canvas 尺寸)。 */
  init(tex: Texture2D, rows: number, cols: number, seed: number, maxW: number, maxH: number): void {
    this.grid = makeGrid(tex.width, tex.height, rows, cols)
    this.state = generatePuzzle(this.grid, 'level', seed)
    this.frames = sliceTexture(tex, rows, cols)

    // 按“图像单元长宽比”定屏幕单元尺寸,fit 进 maxW×maxH,避免拉伸
    const aspect = tex.width / cols / (tex.height / rows) // 单元宽:高
    let cw = maxW / cols
    let ch = cw / aspect
    if (ch * rows > maxH) {
      ch = maxH / rows
      cw = ch * aspect
    }
    this.cellW = cw
    this.cellH = ch
    this.boardW = cw * cols
    this.boardH = ch * rows

    const ui = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    ui.setContentSize(this.boardW, this.boardH)
    ui.setAnchorPoint(0.5, 0.5)

    // 接缝层(画在块上方):留缝填充 + 描边各用一块 Graphics,避免 fill/stroke 共用路径互相污染
    this.seamFill = this.makeSeamLayer('SeamFill')
    this.seamLine = this.makeSeamLayer('SeamLine')

    // 诊断:若仍异常,把这行数值发我
    console.log(
      `[BoardView] tex=${tex.width}x${tex.height} max=${maxW.toFixed(0)}x${maxH.toFixed(0)} ` +
        `cell=${this.cellW.toFixed(1)}x${this.cellH.toFixed(1)} board=${this.boardW.toFixed(0)}x${this.boardH.toFixed(0)}`,
    )

    // 建块节点
    for (let id = 0; id < rows * cols; id++) {
      const n = new Node('p' + id)
      this.node.addChild(n)
      const u = n.addComponent(UITransform)
      u.setAnchorPoint(0.5, 0.5)
      const sp = n.addComponent(Sprite)
      sp.trim = false
      sp.spriteFrame = this.frames[id]
      sp.sizeMode = Sprite.SizeMode.CUSTOM
      // 关键:赋 spriteFrame(默认 TRIMMED)会把 contentSize 重置成切片像素尺寸,
      // 必须在最后再 setContentSize。M3 块满格(无 GAP):同组相邻无缝,异组之间靠留缝层分隔。
      u.setContentSize(this.cellW, this.cellH)
      this.pieceNodes[id] = n
    }
    this.seamFill.node.setSiblingIndex(rows * cols) // 接缝置顶
    this.seamLine.node.setSiblingIndex(rows * cols + 1)

    this.groups = computeGroups(this.state.order, rows, cols)
    this.relayout()

    this.node.on(Node.EventType.TOUCH_START, this.onDown, this)
    this.node.on(Node.EventType.TOUCH_MOVE, this.onMove, this)
    this.node.on(Node.EventType.TOUCH_END, this.onUp, this)
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onUp, this)

    this.started = true
    this.emitStats()
  }

  private makeSeamLayer(name: string): Graphics {
    const sn = new Node(name)
    this.node.addChild(sn)
    const u = sn.addComponent(UITransform)
    u.setContentSize(this.boardW, this.boardH)
    u.setAnchorPoint(0.5, 0.5)
    return sn.addComponent(Graphics)
  }

  update(dt: number): void {
    if (!this.started || this.finished) return
    this.elapsedMs += dt * 1000
    this.statsAccum += dt
    if (this.statsAccum >= 0.25) {
      this.statsAccum = 0
      this.emitStats()
    }
  }

  private emitStats(): void {
    if (!this.state) return
    this.onStats?.({
      elapsedMs: this.elapsedMs,
      moves: this.state.moves,
      placed: correctCount(this.state),
      total: this.state.order.length,
    })
  }

  // 单元 i(当前格)中心的本地坐标(原点=棋盘中心,y 向上)
  private cellCenter(i: number): Vec3 {
    const r = Math.floor(i / this.grid.cols)
    const c = i % this.grid.cols
    const x = -this.boardW / 2 + this.cellW * (c + 0.5)
    const y = this.boardH / 2 - this.cellH * (r + 0.5)
    return new Vec3(x, y, 0)
  }

  // 把所有块摆到各自当前格;清除拖拽偏移
  private relayout(): void {
    for (let i = 0; i < this.state.order.length; i++) {
      const id = this.state.order[i]
      this.pieceNodes[id].setPosition(this.cellCenter(i))
    }
    this.drawSeams()
  }

  // 异组之间画 cream 留缝(覆盖相邻块边缘)+ 各组外缘描边;同组内部不画 → 无缝
  private drawSeams(): void {
    const { rows, cols } = this.grid
    const id = this.groups.id
    const gap = Math.max(3, Math.min(this.cellW, this.cellH) * 0.06)

    // 留缝填充(异组相邻边)
    const f = this.seamFill
    f.clear()
    f.fillColor = GAP_COLOR
    for (let i = 0; i < rows * cols; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      const ctr = this.cellCenter(i)
      const x0 = ctr.x - this.cellW / 2
      const y0 = ctr.y - this.cellH / 2
      if (c < cols - 1 && id[i] !== id[i + 1]) f.rect(x0 + this.cellW - gap / 2, y0, gap, this.cellH)
      if (r < rows - 1 && id[i] !== id[i + cols]) f.rect(x0, y0 - gap / 2, this.cellW, gap)
    }
    f.fill()

    // 组外缘描边
    const g = this.seamLine
    g.clear()
    g.lineWidth = 1.5
    g.strokeColor = LINE_COLOR
    for (let i = 0; i < rows * cols; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      const ctr = this.cellCenter(i)
      const x0 = ctr.x - this.cellW / 2
      const y0 = ctr.y - this.cellH / 2
      const right = c < cols - 1 ? id[i] !== id[i + 1] : true
      const bottom = r < rows - 1 ? id[i] !== id[i + cols] : true
      const left = c > 0 ? id[i] !== id[i - 1] : true
      const top = r > 0 ? id[i] !== id[i - cols] : true
      if (top) (g.moveTo(x0, y0 + this.cellH), g.lineTo(x0 + this.cellW, y0 + this.cellH))
      if (bottom) (g.moveTo(x0, y0), g.lineTo(x0 + this.cellW, y0))
      if (left) (g.moveTo(x0, y0), g.lineTo(x0, y0 + this.cellH))
      if (right) (g.moveTo(x0 + this.cellW, y0), g.lineTo(x0 + this.cellW, y0 + this.cellH))
    }
    g.stroke()
  }

  // 触摸本地坐标 → 含点单元序号(越界返回 -1)
  private cellAt(e: EventTouch): number {
    const ui = this.getComponent(UITransform)!
    const p = e.getUILocation()
    const local = ui.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0))
    const c = Math.floor((local.x + this.boardW / 2) / this.cellW)
    const r = Math.floor((this.boardH / 2 - local.y) / this.cellH)
    if (r < 0 || c < 0 || r >= this.grid.rows || c >= this.grid.cols) return -1
    return r * this.grid.cols + c
  }

  private localOf(e: EventTouch): Vec3 {
    const ui = this.getComponent(UITransform)!
    const p = e.getUILocation()
    return ui.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0))
  }

  private onDown(e: EventTouch): void {
    const cell = this.cellAt(e)
    if (cell < 0) return
    this.groups = computeGroups(this.state.order, this.grid.rows, this.grid.cols)
    const cells = groupCells(this.groups, cell)
    const l = this.localOf(e)
    this.drag = { cells, grabCell: cell, startX: l.x, startY: l.y, curX: l.x, curY: l.y }
    // 置顶被拖的块
    for (const c of cells) this.pieceNodes[this.state.order[c]].setSiblingIndex(this.node.children.length - 1)
  }

  private onMove(e: EventTouch): void {
    if (!this.drag) return
    const l = this.localOf(e)
    this.drag.curX = l.x
    this.drag.curY = l.y
    const dx = l.x - this.drag.startX
    const dy = l.y - this.drag.startY
    for (const c of this.drag.cells) {
      const p = this.cellCenter(c)
      this.pieceNodes[this.state.order[c]].setPosition(p.x + dx, p.y + dy, 0)
    }
  }

  private onUp(): void {
    if (!this.drag) return
    const d = this.drag
    this.drag = null
    const { cols, rows } = this.grid
    const grabR = Math.floor(d.grabCell / cols)
    const grabC = d.grabCell % cols
    const dx = d.curX - d.startX
    const dy = d.curY - d.startY
    // 抓取格中心的落点 → 最近格(注意 y 向上,行号随 y 减小而增大)
    const cx = -this.boardW / 2 + this.cellW * (grabC + 0.5) + dx
    const cy = this.boardH / 2 - this.cellH * (grabR + 0.5) + dy
    let tc = Math.round((cx + this.boardW / 2 - this.cellW / 2) / this.cellW)
    let tr = Math.round((this.boardH / 2 - this.cellH / 2 - cy) / this.cellH)
    let vr = tr - grabR
    let vc = tc - grabC
    // 用整组包围盒夹紧,保证落子后所有格在界内
    let minR = rows, maxR = -1, minC = cols, maxC = -1
    for (const c of d.cells) {
      const r = Math.floor(c / cols), col = c % cols
      minR = Math.min(minR, r); maxR = Math.max(maxR, r)
      minC = Math.min(minC, col); maxC = Math.max(maxC, col)
    }
    vr = Math.max(-minR, Math.min(rows - 1 - maxR, vr))
    vc = Math.max(-minC, Math.min(cols - 1 - maxC, vc))

    const res = applyGroupMove(this.state.order, cols, d.cells, vr, vc)
    if (res.changed) {
      this.state.order = res.order
      this.state.moves++
      this.groups = computeGroups(this.state.order, rows, cols)
    }
    this.relayout()
    if (res.changed) {
      this.emitStats()
      if (isComplete(this.state)) {
        this.finished = true
        this.state.elapsedMs = this.elapsedMs
        this.emitStats()
        this.onComplete?.({
          elapsedMs: this.elapsedMs,
          moves: this.state.moves,
          placed: correctCount(this.state),
          total: this.state.order.length,
        })
      }
    }
  }
}
