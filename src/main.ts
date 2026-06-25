import './style.css'
import { ImageRegistry } from './assets/images'
import { JigsawGame } from './game/controller'
import { Hud } from './ui/hud'
import { LevelMap } from './ui/levelMap'
import { StageSelect } from './ui/stageSelect'
import { loadPages, type LocationConfig, type PuzzleConfig } from './config/levels'
import { markCompleted } from './storage/progress'

const app = document.getElementById('app')!

// 三个屏幕:世界地图(首页) → 选关页 → 游戏。切换 .hidden。
const worldScreen = document.createElement('div')
worldScreen.className = 'screen'
const stageScreen = document.createElement('div')
stageScreen.className = 'screen hidden'
const gameScreen = document.createElement('div')
gameScreen.className = 'screen hidden'
const canvas = document.createElement('canvas')
canvas.id = 'board'
gameScreen.appendChild(canvas)
app.append(worldScreen, stageScreen, gameScreen)

const registry = new ImageRegistry()
const hud = new Hud(gameScreen, registry)

let currentLocation: LocationConfig | null = null
let currentLevel: PuzzleConfig | null = null

const game = new JigsawGame(canvas, {
  onStats: (s) => hud.updateStats(s),
  onComplete: (s) => {
    if (currentLevel) markCompleted(currentLevel.id) // 记录通关 → 解锁下一关
    hud.showComplete(s)
  },
})
hud.bindGame(game)

function only(screen: HTMLElement): void {
  for (const s of [worldScreen, stageScreen, gameScreen]) s.classList.toggle('hidden', s !== screen)
}
function showGame(): void {
  only(gameScreen)
  window.dispatchEvent(new Event('resize')) // 画布按当前视口重新布局
}

const stage = new StageSelect(stageScreen, registry, {
  onBack: () => only(worldScreen),
  onPlay: async (loc, idx) => {
    const level = loc.levels[idx]
    const img = (await registry.resolve(level.image)) ?? registry.builtins()[0]
    currentLocation = loc
    currentLevel = level
    showGame()
    game.newGame(img, level.rows, level.cols, level.seed)
  },
})

// 游戏内"返回"回到所在地点的选关页(重渲染以反映新解锁)
hud.onExit = () => {
  if (currentLocation) stage.show(currentLocation)
  only(stageScreen)
}

async function boot(): Promise<void> {
  worldScreen.innerHTML =
    '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#bfe6f5;color:#6e4a18;font-size:18px;font-weight:700">加载中…</div>'
  const pages = await loadPages()
  worldScreen.replaceChildren()
  new LevelMap(worldScreen, pages, {
    onPlay: (loc) => {
      currentLocation = loc
      stage.show(loc)
      only(stageScreen)
    },
  })
}
void boot()

// 调试用:控制台/预览可访问游戏实例(生产可移除)
;(window as unknown as { __game: JigsawGame }).__game = game
