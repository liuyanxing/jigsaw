import { type Grid, makeGrid, cellAtWorld, nearestCell, clamp } from '../core/grid'
import { type PuzzleState, generatePuzzle } from '../core/puzzle'
import { computeGroups, groupCells, type Groups } from '../core/groups'
import { applyGroupMove } from '../core/move'
import { correctCount, totalCount, isComplete } from '../core/state'
import { serialize, deserialize, type SavedState } from '../core/serialize'
import { type Camera, fitCamera, screenToWorld } from '../render/camera'
import { type GameImage } from '../assets/images'
import {
  drawBoardBackground,
  drawPieceCell,
  drawEmptyCell,
  drawSeams,
  drawFloatingGroup,
  drawPreviewOverlay,
} from '../render/canvasRenderer'
import { saveGame } from '../storage/localStore'
import { snapSound, winSound } from '../audio/sfx'

export interface GameStats {
  elapsedMs: number
  moves: number
  placed: number
  total: number
}

export interface GameHooks {
  onStats(s: GameStats): void
  onComplete(s: { elapsedMs: number; moves: number }): void
}

const TOP_INSET = 58
const BG = '#0f1a17'

function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}

interface Drag {
  cells: number[]
  pieces: number[]
  grabCell: number
  startWX: number
  startWY: number
  curWX: number
  curWY: number
}

export class JigsawGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private hooks: GameHooks
  private dpr = 1
  private cssW = 0
  private cssH = 0

  private image!: GameImage
  private grid!: Grid
  private state!: PuzzleState
  private cam!: Camera
  private groups!: Groups

  private drag: Drag | null = null

  showPreview = false
  private previewUntil = 0
  paused = false
  complete = false
  private running = false

  private lastTs = 0
  private lastStatsTs = 0

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.hooks = hooks
    this.canvas.style.touchAction = 'none'
    this.resize()
    window.addEventListener('resize', this.resize)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    requestAnimationFrame(this.frame)
  }

  // ---------- 生命周期 ----------

  newGame(image: GameImage, rows: number, cols: number, seed = randomSeed()): void {
    this.image = image
    this.grid = makeGrid(image.width, image.height, rows, cols)
    this.state = generatePuzzle(this.grid, image.id, seed)
    this.groups = computeGroups(this.state.order, rows, cols)
    this.drag = null
    this.complete = false
    this.paused = false
    this.running = true
    this.recomputeCamera()
    this.save()
    this.emitStats(true)
  }

  loadSaved(saved: SavedState, image: GameImage): void {
    this.image = image
    this.grid = makeGrid(image.width, image.height, saved.rows, saved.cols)
    this.state = deserialize(saved)
    this.groups = computeGroups(this.state.order, saved.rows, saved.cols)
    this.drag = null
    this.complete = isComplete(this.state)
    this.paused = false
    this.running = !this.complete
    this.recomputeCamera()
    this.emitStats(true)
  }

  restart(): void {
    if (this.image) this.newGame(this.image, this.grid.rows, this.grid.cols)
  }

  get currentImageId(): string {
    return this.image?.id ?? ''
  }
  get rows(): number {
    return this.grid?.rows ?? 0
  }
  get cols(): number {
    return this.grid?.cols ?? 0
  }

  pause(): void {
    this.paused = true
  }
  resume(): void {
    if (!this.complete) this.paused = false
  }
  setPreview(on: boolean): void {
    this.showPreview = on
  }
  peek(): void {
    this.previewUntil = performance.now() + 1500
  }

  // ---------- 布局 / 相机 ----------

  private resize = (): void => {
    this.dpr = window.devicePixelRatio || 1
    this.cssW = window.innerWidth
    this.cssH = window.innerHeight
    this.canvas.width = Math.round(this.cssW * this.dpr)
    this.canvas.height = Math.round(this.cssH * this.dpr)
    this.canvas.style.width = `${this.cssW}px`
    this.canvas.style.height = `${this.cssH}px`
    if (this.grid) this.recomputeCamera()
  }

  private recomputeCamera(): void {
    const vp = { x: 8, y: TOP_INSET + 4, w: this.cssW - 16, h: this.cssH - TOP_INSET - 12 }
    this.cam = fitCamera(this.grid.imgW, this.grid.imgH, vp, 0.98)
  }

  private gapPx(): number {
    return Math.max(4, Math.min(this.grid.cellW, this.grid.cellH) * this.cam.scale * 0.07)
  }

  // ---------- 指针 ----------

  private localPoint(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  private onDown = (e: PointerEvent): void => {
    if (this.paused || this.complete) return
    const { x: sx, y: sy } = this.localPoint(e)
    const w = screenToWorld(this.cam, sx, sy)
    const rc = cellAtWorld(this.grid, w.x, w.y)
    if (!rc) return
    try {
      this.canvas.setPointerCapture(e.pointerId)
    } catch {
      // 合成事件忽略
    }
    const cellIdx = rc.row * this.grid.cols + rc.col
    this.groups = computeGroups(this.state.order, this.grid.rows, this.grid.cols)
    const cells = groupCells(this.groups, cellIdx)
    this.drag = {
      cells,
      pieces: cells.map((c) => this.state.order[c]),
      grabCell: cellIdx,
      startWX: w.x,
      startWY: w.y,
      curWX: w.x,
      curWY: w.y,
    }
    this.running = true
  }

  private onMove = (e: PointerEvent): void => {
    if (!this.drag) return
    const { x: sx, y: sy } = this.localPoint(e)
    const w = screenToWorld(this.cam, sx, sy)
    this.drag.curWX = w.x
    this.drag.curWY = w.y
  }

  private onUp = (e: PointerEvent): void => {
    try {
      this.canvas.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (!this.drag) return
    const d = this.drag
    this.drag = null

    const { cellW, cellH, cols, rows } = this.grid
    const grabR = Math.floor(d.grabCell / cols)
    const grabC = d.grabCell % cols
    const dxW = d.curWX - d.startWX
    const dyW = d.curWY - d.startWY
    // 抓取格的落点(浮起位置吸到最近格)
    const target = nearestCell(this.grid, grabC * cellW + dxW, grabR * cellH + dyW)
    let vr = target.row - grabR
    let vc = target.col - grabC
    // 用整组包围盒夹紧,保证落子后所有格在界内
    let minR = rows
    let maxR = -1
    let minC = cols
    let maxC = -1
    for (const c of d.cells) {
      const r = Math.floor(c / cols)
      const col = c % cols
      minR = Math.min(minR, r)
      maxR = Math.max(maxR, r)
      minC = Math.min(minC, col)
      maxC = Math.max(maxC, col)
    }
    vr = clamp(vr, -minR, rows - 1 - maxR)
    vc = clamp(vc, -minC, cols - 1 - maxC)

    const res = applyGroupMove(this.state.order, cols, d.cells, vr, vc)
    if (res.changed) {
      this.state.order = res.order
      this.state.moves++
      this.groups = computeGroups(this.state.order, rows, cols)
      snapSound()
      this.save()
      this.emitStats(true)
      if (isComplete(this.state)) this.win()
    }
  }

  private win(): void {
    this.complete = true
    this.running = false
    winSound()
    this.save()
    this.hooks.onComplete({ elapsedMs: this.state.elapsedMs, moves: this.state.moves })
  }

  // ---------- 存档 / 统计 ----------

  private save(): void {
    if (this.state) saveGame(serialize(this.state))
  }

  private emitStats(force = false): void {
    const now = this.lastTs
    if (!force && now - this.lastStatsTs < 180) return
    this.lastStatsTs = now
    this.hooks.onStats({
      elapsedMs: this.state.elapsedMs,
      moves: this.state.moves,
      placed: correctCount(this.state),
      total: totalCount(this.state),
    })
  }

  // ---------- 渲染循环 ----------

  private frame = (ts: number): void => {
    const dt = this.lastTs ? ts - this.lastTs : 0
    this.lastTs = ts
    if (this.running && !this.paused && !this.complete && this.state) this.state.elapsedMs += dt
    if (this.state) {
      this.render(ts)
      this.emitStats(false)
    }
    requestAnimationFrame(this.frame)
  }

  private render(ts: number): void {
    const ctx = this.ctx
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, this.cssW, this.cssH)

    drawBoardBackground(ctx, this.cam, this.grid)

    const dragging = this.drag ? new Set(this.drag.cells) : null
    const n = this.grid.rows * this.grid.cols
    for (let i = 0; i < n; i++) {
      if (dragging && dragging.has(i)) drawEmptyCell(ctx, this.cam, this.grid, i)
      else drawPieceCell(ctx, this.cam, this.grid, this.image, i, this.state.order[i])
    }

    drawSeams(ctx, this.cam, this.grid, this.groups.id, this.gapPx(), BG)

    if (this.drag) {
      drawFloatingGroup(
        ctx,
        this.cam,
        this.grid,
        this.image,
        this.drag.cells,
        this.drag.pieces,
        this.drag.curWX - this.drag.startWX,
        this.drag.curWY - this.drag.startWY,
      )
    }

    if (this.showPreview || ts < this.previewUntil) {
      drawPreviewOverlay(ctx, this.cam, this.grid, this.image, 0.92)
    }
  }
}
