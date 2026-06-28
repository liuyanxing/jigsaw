import { _decorator, Component, Node, Canvas, Color, view, ResolutionPolicy } from 'cc'
import { BoardView } from './game/BoardView'
import { loadPages, type MapPage, type LocationConfig } from './config/levels'
import { markCompleted } from './storage/progress'
import { loadTexture } from './util/Res'
import { WorldMap } from './ui/WorldMap'
import { StageSelect } from './ui/StageSelect'
import { Hud } from './ui/Hud'
import { node, setPos, label, fillRect, onTap } from './util/Ui'

const { ccclass } = _decorator

// 启动 + 三屏编排(M2):世界地图(首页) → 选关 → 对局。
// 把本组件挂在场景 Canvas 下的一个空节点上;屏幕节点作为 Canvas 的子节点,用 active 切换。

@ccclass('Boot')
export class Boot extends Component {
  private W = 720
  private H = 1280
  private canvasNode!: Node
  private worldNode!: Node
  private stageNode!: Node
  private gameNode!: Node
  private boardHolder!: Node
  private stage!: StageSelect
  private hud!: Hud
  private currentLocation: LocationConfig | null = null
  private currentIdx = 0

  start() {
    // 竖屏移动端设计分辨率(iOS/Android):宽固定 720 填满、高随屏幕比例自适应,无黑边、不裁内容。
    // 运行时强制一次,确保与项目设置一致、版本无关。
    view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH)

    // 找到 Canvas 节点用于挂屏幕节点;尺寸以 view 可见区为准(适配后的真实设计尺寸)
    let c: Node | null = this.node
    while (c && !c.getComponent(Canvas)) c = c.parent
    this.canvasNode = c ?? this.node.parent ?? this.node
    const vs = view.getVisibleSize()
    this.W = vs.width
    this.H = vs.height

    // 三屏容器
    this.worldNode = node('Screen-World', this.W, this.H, this.canvasNode)
    this.stageNode = node('Screen-Stage', this.W, this.H, this.canvasNode)
    this.gameNode = node('Screen-Game', this.W, this.H, this.canvasNode)

    // 选关页(常驻,show 时填充)
    this.stage = new StageSelect(this.stageNode, this.W, this.H, {
      onBack: () => this.only(this.worldNode),
      onPlay: (loc, idx) => this.startGame(loc, idx),
    })

    // 对局页:底色 + 棋盘容器 + 返回键
    const gbg = node('bg', this.W, this.H, this.gameNode)
    fillRect(gbg, this.W, this.H, new Color(236, 225, 198))
    this.boardHolder = node('BoardHolder', this.W, this.H, this.gameNode)
    const back = setPos(node('back', 80, 44, this.gameNode), -this.W / 2 + 48, this.H / 2 - 30)
    fillRect(back, 80, 44, new Color(255, 248, 232), 10)
    label('← 返回', 16, new Color(94, 68, 19), back)
    onTap(back, () => this.backToStage())

    // HUD(计时/步数/进度 + 完成弹窗)
    this.hud = new Hud(this.gameNode, this.W, this.H, {
      onReplay: () => this.startGame(this.currentLocation!, this.currentIdx),
      onExit: () => this.backToStage(),
    })

    // 加载关卡 → 世界地图
    void loadPages().then((pages: MapPage[]) => {
      if (!pages.length) {
        label('关卡加载失败,请确认 resources/levels.json 已导入', 18, new Color(180, 60, 40), this.worldNode)
        this.only(this.worldNode)
        return
      }
      new WorldMap(this.worldNode, pages[0], this.W, this.H, (loc) => {
        this.currentLocation = loc
        this.stage.show(loc)
        this.only(this.stageNode)
      })
      this.only(this.worldNode)
    })
  }

  private only(n: Node): void {
    this.worldNode.active = n === this.worldNode
    this.stageNode.active = n === this.stageNode
    this.gameNode.active = n === this.gameNode
  }

  private backToStage(): void {
    if (this.currentLocation) this.stage.show(this.currentLocation) // 重渲染反映新解锁
    this.only(this.stageNode)
  }

  private startGame(loc: LocationConfig, idx: number): void {
    const level = loc.levels[idx]
    this.currentLocation = loc
    this.currentIdx = idx
    this.boardHolder.removeAllChildren()
    this.hud.hideComplete()
    this.only(this.gameNode)

    void loadTexture(level.image).then((tex) => {
      if (!tex) {
        label('图片加载失败: ' + level.image, 16, new Color(180, 60, 40), this.boardHolder)
        return
      }
      const board = node('Board', 1, 1, this.boardHolder)
      const bv = board.addComponent(BoardView)
      bv.onStats = (s) => this.hud.setStats(s)
      bv.onComplete = (s) => {
        console.log(`[Boot] 完成 ${level.id}! moves=${s.moves}`)
        markCompleted(level.id)
        this.hud.showComplete(s)
      }
      const maxW = this.W * 0.92
      const maxH = this.H * 0.74
      bv.init(tex, level.rows, level.cols, level.seed ?? 1, maxW, maxH)
    })
  }
}
