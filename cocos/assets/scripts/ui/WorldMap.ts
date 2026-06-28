import { Node, Color } from 'cc'
import { type MapPage, type LocationConfig } from '../config/levels'
import { loadSpriteFrame } from '../util/Res'
import { node, setPos, label, spriteNode, setSprite, onTap, fillRect } from '../util/Ui'

// 世界地图(首页):一张背景图 cover 占屏 + 沿地图分布的地点节点(地标圆标 + 名牌)。
// M2 先渲染单页(pages[0]);多页整屏翻页留到后续。数据来自 config/levels.ts。

const ICON = 72

export class WorldMap {
  readonly root: Node

  constructor(parent: Node, page: MapPage, W: number, H: number, onPlay: (loc: LocationConfig) => void) {
    this.root = node('WorldMap', W, H, parent)

    // 背景(stretch 占满,样式后续再做 cover)
    const bg = spriteNode('bg', W, H, null, this.root)
    void loadSpriteFrame(page.background).then((sf) => {
      if (sf) setSprite(bg, sf, W, H)
    })

    // 地点节点
    page.locations.forEach((loc, i) => {
      const lx = (loc.map.x / 100 - 0.5) * W
      const ly = (0.5 - loc.map.y / 100) * H
      const cell = setPos(node('loc-' + loc.id, ICON + 20, ICON + 30, this.root), lx, ly)

      const icon = spriteNode('icon', ICON, ICON, null, cell)
      setPos(icon, 0, 10)
      void loadSpriteFrame(loc.icon).then((sf) => {
        if (sf) setSprite(icon, sf, ICON, ICON)
      })

      // 名牌
      const pill = node('pill', ICON + 18, 22, cell)
      setPos(pill, 0, -ICON / 2 - 2)
      fillRect(pill, ICON + 18, 22, new Color(255, 244, 222, 235), 11)
      label(`${i + 1}. ${loc.name}`, 14, new Color(94, 68, 19), pill)

      onTap(cell, () => onPlay(loc))
    })
  }
}
