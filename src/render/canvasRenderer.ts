import { type Camera, worldToScreen } from './camera'
import { type Grid } from '../core/grid'
import { type GameImage } from '../assets/images'

// 网格渲染。无状态纯绘制,直接映射 Android Canvas。
// 同组(相对位置正确)相邻块无缝;异组之间留缝 + 边框。

function cellScreen(cam: Camera, grid: Grid, cellIdx: number) {
  const r = Math.floor(cellIdx / grid.cols)
  const c = cellIdx % grid.cols
  // 把每条边吸到整数像素:相邻格的公共边算出同一个整数 → 严丝合缝,消除浮点亚像素缝隙。
  const tl = worldToScreen(cam, c * grid.cellW, r * grid.cellH)
  const br = worldToScreen(cam, (c + 1) * grid.cellW, (r + 1) * grid.cellH)
  const x = Math.round(tl.x)
  const y = Math.round(tl.y)
  return { x, y, w: Math.round(br.x) - x, h: Math.round(br.y) - y, r, c }
}

/** 把某块(home 内容)画到指定屏幕矩形。 */
function drawPieceImage(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  img: GameImage,
  pieceId: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const hr = Math.floor(pieceId / grid.cols)
  const hc = pieceId % grid.cols
  ctx.drawImage(img.source, hc * grid.cellW, hr * grid.cellH, grid.cellW, grid.cellH, x, y, w, h)
}

export function drawBoardBackground(ctx: CanvasRenderingContext2D, cam: Camera, grid: Grid): void {
  const tl = worldToScreen(cam, 0, 0)
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(tl.x - 6, tl.y - 6, grid.imgW * cam.scale + 12, grid.imgH * cam.scale + 12)
  ctx.restore()
}

export function drawPieceCell(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  grid: Grid,
  img: GameImage,
  cellIdx: number,
  pieceId: number,
): void {
  const s = cellScreen(cam, grid, cellIdx)
  drawPieceImage(ctx, grid, img, pieceId, s.x, s.y, s.w, s.h)
}

export function drawEmptyCell(ctx: CanvasRenderingContext2D, cam: Camera, grid: Grid, cellIdx: number): void {
  const s = cellScreen(cam, grid, cellIdx)
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(s.x, s.y, s.w, s.h)
  ctx.restore()
}

/** 异组之间画背景缝 + 各组外缘描边;同组内部不画 → 无缝。 */
export function drawSeams(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  grid: Grid,
  groupId: number[],
  gap: number,
  gapColor: string,
): void {
  const { rows, cols } = grid
  const n = rows * cols
  ctx.save()
  // 背景缝(盖住相邻块的边缘形成间隙)
  ctx.fillStyle = gapColor
  for (let i = 0; i < n; i++) {
    const s = cellScreen(cam, grid, i)
    if (s.c < cols - 1 && groupId[i] !== groupId[i + 1]) ctx.fillRect(s.x + s.w - gap / 2, s.y, gap, s.h)
    if (s.r < rows - 1 && groupId[i] !== groupId[i + cols]) ctx.fillRect(s.x, s.y + s.h - gap / 2, s.w, gap)
  }
  // 各组外缘描边
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1
  for (let i = 0; i < n; i++) {
    const s = cellScreen(cam, grid, i)
    const top = s.r > 0 ? groupId[i] !== groupId[i - cols] : true
    const bottom = s.r < rows - 1 ? groupId[i] !== groupId[i + cols] : true
    const left = s.c > 0 ? groupId[i] !== groupId[i - 1] : true
    const right = s.c < cols - 1 ? groupId[i] !== groupId[i + 1] : true
    ctx.beginPath()
    if (top) (ctx.moveTo(s.x, s.y), ctx.lineTo(s.x + s.w, s.y))
    if (bottom) (ctx.moveTo(s.x, s.y + s.h), ctx.lineTo(s.x + s.w, s.y + s.h))
    if (left) (ctx.moveTo(s.x, s.y), ctx.lineTo(s.x, s.y + s.h))
    if (right) (ctx.moveTo(s.x + s.w, s.y), ctx.lineTo(s.x + s.w, s.y + s.h))
    ctx.stroke()
  }
  ctx.restore()
}

/** 拖拽中:整组浮起(世界位移 dxWorld,dyWorld),带投影 + 外缘描边。 */
export function drawFloatingGroup(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  grid: Grid,
  img: GameImage,
  cells: number[],
  pieces: number[],
  dxWorld: number,
  dyWorld: number,
): void {
  const set = new Set(cells)
  const ox = dxWorld * cam.scale
  const oy = dyWorld * cam.scale
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 12
  for (let k = 0; k < cells.length; k++) {
    const s = cellScreen(cam, grid, cells[k])
    drawPieceImage(ctx, grid, img, pieces[k], s.x + ox, s.y + oy, s.w, s.h)
    ctx.shadowColor = 'transparent' // 仅首块产生投影,避免组内叠影
  }
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = 2
  const { cols } = grid
  for (const cell of cells) {
    const s = cellScreen(cam, grid, cell)
    const x = s.x + ox
    const y = s.y + oy
    ctx.beginPath()
    if (!set.has(cell - cols) || s.r === 0) (ctx.moveTo(x, y), ctx.lineTo(x + s.w, y))
    if (!set.has(cell + cols) || s.r === grid.rows - 1) (ctx.moveTo(x, y + s.h), ctx.lineTo(x + s.w, y + s.h))
    if (!set.has(cell - 1) || s.c === 0) (ctx.moveTo(x, y), ctx.lineTo(x, y + s.h))
    if (!set.has(cell + 1) || s.c === cols - 1) (ctx.moveTo(x + s.w, y), ctx.lineTo(x + s.w, y + s.h))
    ctx.stroke()
  }
  ctx.restore()
}

/** 预览:把完整目标图叠在棋盘上(查看答案)。 */
export function drawPreviewOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  grid: Grid,
  img: GameImage,
  alpha: number,
): void {
  const tl = worldToScreen(cam, 0, 0)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(img.source, 0, 0, img.width, img.height, tl.x, tl.y, grid.imgW * cam.scale, grid.imgH * cam.scale)
  ctx.restore()
}
