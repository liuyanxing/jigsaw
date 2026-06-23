// 关卡地图(首页):地图背景 + 沿蜿蜒小路分布的关卡节点(地标圆标 + 名牌)。
// 仅实现已有资产的部分;顶部货币栏/侧边标签/底部按钮栏/勾选与锁定徽标暂缺资产,后续再补。

import bgUrl from '../../assets/bg_stage_01.webp'
import pillUrl from '../../assets/label_pill_bg.png'
import eiffel from '../../assets/eiffel_tower.png'
import fuji from '../../assets/mount_fuji.png'
import statue from '../../assets/statue_of_liberty.png'
import pyramids from '../../assets/egypt_pyramids.png'
import sydney from '../../assets/sydney_opera_house.png'

export interface LevelDef {
  name: string
  icon: string
  x: number // 节点中心占地图宽的百分比(落在小路上,可微调)
  y: number // 节点中心占地图高的百分比
  rows: number
  cols: number
  imageId: string // 暂用内置图占位,后续替换为该地标对应的拼图原图
}

// 自上而下沿小路分布;x/y 已大致对齐 bg_stage_01 的路径,可按需要再微调。
export const LEVELS: LevelDef[] = [
  { name: '1. 巴黎', icon: eiffel, x: 46, y: 12, rows: 3, cols: 3, imageId: 'sunset' },
  { name: '2. 富士山', icon: fuji, x: 49, y: 27, rows: 4, cols: 4, imageId: 'rings' },
  { name: '3. 纽约', icon: statue, x: 44, y: 43, rows: 4, cols: 4, imageId: 'blocks' },
  { name: '4. 埃及', icon: pyramids, x: 40, y: 59, rows: 6, cols: 6, imageId: 'refgrid' },
  { name: '5. 悉尼', icon: sydney, x: 45, y: 76, rows: 6, cols: 6, imageId: 'sunset' },
]

export interface LevelMapHooks {
  onPlay(level: LevelDef): void
}

export class LevelMap {
  constructor(root: HTMLElement, hooks: LevelMapHooks) {
    const scroller = document.createElement('div')
    scroller.className = 'levelmap'

    const canvas = document.createElement('div')
    canvas.className = 'map-canvas'

    const bg = document.createElement('img')
    bg.className = 'map-bg'
    bg.src = bgUrl
    bg.alt = ''
    canvas.appendChild(bg)

    for (const lv of LEVELS) {
      const node = document.createElement('button')
      node.className = 'level-node'
      node.style.left = `${lv.x}%`
      node.style.top = `${lv.y}%`

      const icon = document.createElement('img')
      icon.className = 'node-icon'
      icon.src = lv.icon
      icon.alt = lv.name

      const pill = document.createElement('span')
      pill.className = 'node-pill'
      pill.textContent = lv.name
      pill.style.backgroundImage = `url(${pillUrl})`

      node.append(icon, pill)
      node.onclick = () => hooks.onPlay(lv)
      canvas.appendChild(node)
    }

    scroller.appendChild(canvas)
    root.appendChild(scroller)
  }
}
