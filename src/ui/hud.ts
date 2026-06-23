import { type ImageRegistry, type GameImage } from '../assets/images'
import { type JigsawGame, type GameStats } from '../game/controller'

// DOM 外壳:顶栏(计时/步数/进度 + 提示/虚影按钮)、暂停菜单、新拼图(选图+难度)、完成弹窗。

const DIFFS = [
  { label: '3 × 3', rows: 3, cols: 3 },
  { label: '4 × 4', rows: 4, cols: 4 },
  { label: '6 × 6', rows: 6, cols: 6 },
  { label: '8 × 8', rows: 8, cols: 8 },
]

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { cls?: string; text?: string } = {},
  ...kids: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (opts.cls) e.className = opts.cls
  if (opts.text) e.textContent = opts.text
  for (const k of kids) e.append(k)
  return e
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function thumb(img: GameImage, w: number): HTMLCanvasElement {
  const h = Math.round((w * img.height) / img.width)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  cv.getContext('2d')!.drawImage(img.source, 0, 0, w, h)
  return cv
}

export class Hud {
  private registry: ImageRegistry
  private game!: JigsawGame
  onExit: (() => void) | null = null // 返回关卡地图(由 main 注入)

  private timeEl = el('span', { cls: 'stat' })
  private movesEl = el('span', { cls: 'stat' })
  private progEl = el('span', { cls: 'stat' })
  private progFill = el('div', { cls: 'progfill' })
  private ghostBtn = el('button', { cls: 'icon-btn', text: '👁' })

  private overlay = el('div', { cls: 'overlay hidden' })
  private pauseCard = el('div', { cls: 'card hidden' })
  private newCard = el('div', { cls: 'card hidden' })
  private winCard = el('div', { cls: 'card hidden' })
  private winInfo = el('p', { cls: 'wininfo' })

  private diffBtns: HTMLButtonElement[] = []
  private selRows = 4
  private selCols = 4
  private fileInput = el('input') as HTMLInputElement

  constructor(root: HTMLElement, registry: ImageRegistry) {
    this.registry = registry
    this.fileInput.type = 'file'
    this.fileInput.accept = 'image/*'
    this.fileInput.style.display = 'none'

    const pauseBtn = el('button', { cls: 'icon-btn', text: '≡' })
    pauseBtn.onclick = () => {
      this.game.pause()
      this.openPause()
    }
    const hintBtn = el('button', { cls: 'icon-btn', text: '💡' })
    hintBtn.onclick = () => this.game.peek() // 短暂查看完整图
    this.ghostBtn.onclick = () => {
      this.game.setPreview(!this.game.showPreview) // 切换预览叠层
      this.refreshGhostBtn()
    }

    const center = el('div', { cls: 'stats' }, this.timeEl, this.movesEl, this.progEl)
    const topbar = el(
      'div',
      { cls: 'topbar' },
      pauseBtn,
      center,
      el('div', { cls: 'top-actions' }, hintBtn, this.ghostBtn),
    )
    const progbar = el('div', { cls: 'progbar' }, this.progFill)

    this.buildPauseCard()
    this.buildNewCard()
    this.buildWinCard()
    this.overlay.append(this.pauseCard, this.newCard, this.winCard)
    // 点背景关闭暂停/新拼图弹窗;完成弹窗不允许点背景关闭
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay && this.winCard.classList.contains('hidden')) {
        this.game.resume()
        this.hide()
      }
    }

    root.append(topbar, progbar, this.overlay, this.fileInput)
  }

  bindGame(game: JigsawGame): void {
    this.game = game
    this.refreshGhostBtn()
  }

  updateStats(s: GameStats): void {
    this.timeEl.textContent = `⏱ ${fmtTime(s.elapsedMs)}`
    this.movesEl.textContent = `👣 ${s.moves}`
    this.progEl.textContent = `✓ ${s.placed}/${s.total}`
    this.progFill.style.width = `${s.total ? (s.placed / s.total) * 100 : 0}%`
  }

  showComplete(s: { elapsedMs: number; moves: number }): void {
    this.winInfo.textContent = `用时 ${fmtTime(s.elapsedMs)} · ${s.moves} 步`
    this.show(this.winCard)
  }

  // ---------- 卡片 ----------

  private buildPauseCard(): void {
    const resume = el('button', { cls: 'btn primary', text: '继续' })
    resume.onclick = () => {
      this.game.resume()
      this.hide()
    }
    const restart = el('button', { cls: 'btn', text: '重玩本图' })
    restart.onclick = () => {
      this.game.restart()
      this.hide()
    }
    const neu = el('button', { cls: 'btn', text: '换新拼图' })
    neu.onclick = () => this.openNew()
    const toMap = el('button', { cls: 'btn', text: '🗂 关卡列表' })
    toMap.onclick = () => {
      this.onExit?.()
      this.hide()
    }
    this.pauseCard.append(el('h2', { text: '已暂停' }), resume, restart, neu, toMap)
  }

  private buildNewCard(): void {
    const diffRow = el('div', { cls: 'diffrow' })
    DIFFS.forEach((d, i) => {
      const b = el('button', { cls: 'diff' + (i === 1 ? ' sel' : ''), text: d.label })
      b.onclick = () => {
        this.selRows = d.rows
        this.selCols = d.cols
        this.diffBtns.forEach((x) => x.classList.remove('sel'))
        b.classList.add('sel')
      }
      this.diffBtns.push(b)
      diffRow.append(b)
    })

    const gallery = el('div', { cls: 'gallery' })
    for (const img of this.registry.builtins()) {
      const t = thumb(img, 110)
      t.className = 'thumb'
      t.onclick = () => this.start(img)
      gallery.append(t)
    }

    const upload = el('button', { cls: 'btn', text: '＋ 选择本机图片' })
    upload.onclick = () => this.fileInput.click()
    this.fileInput.onchange = async () => {
      const f = this.fileInput.files?.[0]
      this.fileInput.value = ''
      if (!f) return
      try {
        const img = await this.registry.addUserImage(f)
        this.start(img)
      } catch {
        alert('图片加载失败')
      }
    }

    this.newCard.append(
      el('h2', { text: '新拼图' }),
      el('p', { cls: 'sub', text: '选择难度' }),
      diffRow,
      el('p', { cls: 'sub', text: '选择图片' }),
      gallery,
      upload,
    )
  }

  private buildWinCard(): void {
    const again = el('button', { cls: 'btn primary', text: '再来一张' })
    again.onclick = () => this.openNew()
    const replay = el('button', { cls: 'btn', text: '重玩本图' })
    replay.onclick = () => {
      this.game.restart()
      this.hide()
    }
    const toMap = el('button', { cls: 'btn', text: '🗂 关卡列表' })
    toMap.onclick = () => {
      this.onExit?.()
      this.hide()
    }
    this.winCard.append(el('h2', { text: '🎉 完成!' }), this.winInfo, again, replay, toMap)
  }

  private start(img: GameImage): void {
    this.game.newGame(img, this.selRows, this.selCols)
    this.hide()
  }

  private refreshGhostBtn(): void {
    this.ghostBtn.classList.toggle('off', !this.game.showPreview)
  }

  // 注:👁 = 预览叠层开关,💡 = 短暂查看完整图

  // ---------- 显隐 ----------

  private show(card: HTMLElement): void {
    for (const c of [this.pauseCard, this.newCard, this.winCard]) c.classList.toggle('hidden', c !== card)
    this.overlay.classList.remove('hidden')
  }
  private hide(): void {
    this.overlay.classList.add('hidden')
  }
  private openPause(): void {
    this.show(this.pauseCard)
  }
  openNew(): void {
    this.show(this.newCard)
  }
}
