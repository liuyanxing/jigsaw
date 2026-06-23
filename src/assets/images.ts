// 图片来源:内置图(程序化绘制,无需二进制资源)+ 设备图(file input,dataURL 持久化)。
// GameImage.source 是任意 CanvasImageSource(canvas 或 img),drawImage 子矩形即可切片。

export interface GameImage {
  id: string
  label: string
  source: CanvasImageSource
  width: number
  height: number
}

type Ctx = CanvasRenderingContext2D

const W = 900
const H = 1200
const USER_PREFIX = 'user:'
const MAX_USER_DIM = 1600

function makeCanvas(w: number, h: number): { cv: HTMLCanvasElement; ctx: Ctx } {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  return { cv, ctx: cv.getContext('2d')! }
}

function drawSunset(ctx: Ctx, w: number, h: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#1b2a6b')
  sky.addColorStop(0.45, '#7b3f8f')
  sky.addColorStop(0.7, '#ff7e5f')
  sky.addColorStop(1, '#ffb56b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  const sx = w * 0.5
  const sy = h * 0.42
  const r = w * 0.16
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#ffd36b'
  ctx.beginPath()
  ctx.arc(sx, sy, r * 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const g = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r)
  g.addColorStop(0, '#fff3c4')
  g.addColorStop(1, '#ffd36b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2b1b3d'
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, h * 0.72)
  ctx.quadraticCurveTo(w * 0.25, h * 0.62, w * 0.5, h * 0.7)
  ctx.quadraticCurveTo(w * 0.75, h * 0.78, w, h * 0.68)
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 3
  for (const [bx, by] of [
    [w * 0.3, h * 0.2],
    [w * 0.38, h * 0.16],
    [w * 0.66, h * 0.22],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(bx - 12, by)
    ctx.quadraticCurveTo(bx, by - 8, bx, by)
    ctx.quadraticCurveTo(bx, by - 8, bx + 12, by)
    ctx.stroke()
  }
}

function drawRings(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#0e1726'
  ctx.fillRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2
  const hues = ['#ff5252', '#ff9800', '#ffeb3b', '#4caf50', '#00bcd4', '#3f51b5', '#9c27b0']
  const maxR = Math.hypot(w, h) / 2
  const rings = 10
  for (let i = rings; i >= 1; i--) {
    ctx.fillStyle = hues[i % hues.length]
    ctx.beginPath()
    ctx.arc(cx, cy, (maxR * i) / rings, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, cy, (maxR / rings) * 0.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawBlocks(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#faf7f0'
  ctx.fillRect(0, 0, w, h)
  const cells = [
    { x: 0, y: 0, w: 0.55, h: 0.4, c: '#e63946' },
    { x: 0.55, y: 0, w: 0.45, h: 0.25, c: '#f1c40f' },
    { x: 0.55, y: 0.25, w: 0.45, h: 0.15, c: '#faf7f0' },
    { x: 0, y: 0.4, w: 0.3, h: 0.6, c: '#457b9d' },
    { x: 0.3, y: 0.4, w: 0.4, h: 0.35, c: '#faf7f0' },
    { x: 0.7, y: 0.4, w: 0.3, h: 0.35, c: '#2a9d8f' },
    { x: 0.3, y: 0.75, w: 0.7, h: 0.25, c: '#f1c40f' },
  ]
  for (const c of cells) {
    ctx.fillStyle = c.c
    ctx.fillRect(c.x * w, c.y * h, c.w * w, c.h * h)
  }
  ctx.strokeStyle = '#1d1d1d'
  ctx.lineWidth = Math.max(6, w * 0.012)
  for (const c of cells) ctx.strokeRect(c.x * w, c.y * h, c.w * w, c.h * h)
}

function drawRefGrid(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#eaf4ff')
  g.addColorStop(1, '#cfe0c8')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const cols = 6
  const rows = 8
  const cw = w / cols
  const ch = h / rows
  ctx.font = `bold ${Math.floor(cw * 0.32)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.fillRect(c * cw, r * ch, cw, ch)
      }
      ctx.fillStyle = '#2b3a55'
      ctx.fillText(`${String.fromCharCode(65 + c)}${r + 1}`, c * cw + cw / 2, r * ch + ch / 2)
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.lineWidth = 2
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cw, 0)
    ctx.lineTo(c * cw, h)
    ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * ch)
    ctx.lineTo(w, r * ch)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(230,57,70,0.9)'
  ctx.font = `bold ${Math.floor(cw * 0.42)}px system-ui, sans-serif`
  ctx.fillText('▲ TOP ▲', w / 2, ch * 0.5)
}

const BUILTIN_DEFS: { id: string; label: string; draw: (ctx: Ctx, w: number, h: number) => void }[] = [
  { id: 'sunset', label: '日落', draw: drawSunset },
  { id: 'rings', label: '同心环', draw: drawRings },
  { id: 'blocks', label: '色块', draw: drawBlocks },
  { id: 'refgrid', label: '坐标网格', draw: drawRefGrid },
]

export function builtinImages(): GameImage[] {
  return BUILTIN_DEFS.map((d) => {
    const { cv, ctx } = makeCanvas(W, H)
    d.draw(ctx, W, H)
    return { id: d.id, label: d.label, source: cv, width: W, height: H }
  })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(file)
  })
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

/** 大图降采样到画布,限制内存与每帧 drawImage 成本。 */
function downscale(img: HTMLImageElement, maxDim: number): { source: CanvasImageSource; width: number; height: number } {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const scale = Math.min(1, maxDim / Math.max(iw, ih))
  const w = Math.round(iw * scale)
  const h = Math.round(ih * scale)
  const { cv, ctx } = makeCanvas(w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return { source: cv, width: w, height: h }
}

const userKey = (id: string): string => `jigsaw:img:${id}`

/** 解析 id → GameImage:内置已在内存;用户图按 id 从 localStorage 还原。 */
export class ImageRegistry {
  private map = new Map<string, GameImage>()

  constructor() {
    for (const img of builtinImages()) this.map.set(img.id, img)
  }

  all(): GameImage[] {
    return [...this.map.values()]
  }

  builtins(): GameImage[] {
    return this.all().filter((i) => !i.id.startsWith(USER_PREFIX))
  }

  get(id: string): GameImage | undefined {
    return this.map.get(id)
  }

  async addUserImage(file: File): Promise<GameImage> {
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImageEl(dataUrl)
    const { source, width, height } = downscale(img, MAX_USER_DIM)
    const id = USER_PREFIX + String(performance.now()).replace('.', '')
    try {
      localStorage.setItem(userKey(id), dataUrl)
    } catch {
      // 存不下(配额)就不持久化,本局仍可玩
    }
    const gi: GameImage = { id, label: '我的图片', source, width, height }
    this.map.set(id, gi)
    return gi
  }

  async resolve(id: string): Promise<GameImage | undefined> {
    const existing = this.map.get(id)
    if (existing) return existing
    if (id.startsWith(USER_PREFIX)) {
      const dataUrl = localStorage.getItem(userKey(id))
      if (!dataUrl) return undefined
      const img = await loadImageEl(dataUrl)
      const { source, width, height } = downscale(img, MAX_USER_DIM)
      const gi: GameImage = { id, label: '我的图片', source, width, height }
      this.map.set(id, gi)
      return gi
    }
    return undefined
  }
}
