import './style.css'
import { ImageRegistry } from './assets/images'
import { JigsawGame } from './game/controller'
import { Hud } from './ui/hud'
import { LevelMap, type LevelDef } from './ui/levelMap'
import { StageSelect } from './ui/stageSelect'

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
const game = new JigsawGame(canvas, {
  onStats: (s) => hud.updateStats(s),
  onComplete: (s) => hud.showComplete(s),
})
hud.bindGame(game)

let currentLocation: LevelDef | null = null

function only(screen: HTMLElement): void {
  for (const s of [worldScreen, stageScreen, gameScreen]) s.classList.toggle('hidden', s !== screen)
}
function showGame(): void {
  only(gameScreen)
  window.dispatchEvent(new Event('resize')) // 画布按当前视口重新布局
}

const stage = new StageSelect(stageScreen, registry, {
  onBack: () => only(worldScreen),
  onPlay: (loc) => {
    // 暂用内置图占位(该地标的拼图原图后续再加)
    const img = registry.get(loc.imageId) ?? registry.builtins()[0]
    currentLocation = loc
    showGame()
    game.newGame(img, loc.rows, loc.cols)
  },
})

new LevelMap(worldScreen, {
  onPlay: (loc: LevelDef) => {
    currentLocation = loc
    stage.show(loc)
    only(stageScreen)
  },
})

// 游戏内"返回"回到所在地点的选关页
hud.onExit = () => {
  if (currentLocation) stage.show(currentLocation)
  only(stageScreen)
}

// 调试用:控制台/预览可访问游戏实例(生产可移除)
;(window as unknown as { __game: JigsawGame }).__game = game
