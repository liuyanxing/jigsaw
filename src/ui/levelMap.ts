// 关卡地图(首页):多张地图页,每页 cover 占满一屏,上下滑动整屏翻页(scroll-snap)。
// 每页一张背景图 + 沿小路分布的地点节点(地标圆标 + 名牌)。数据来自 config/levels.ts ← public/levels.json。

import pillUrl from '../../assets/label_pill_bg.png'
import { type MapPage, type LocationConfig } from '../config/levels'

export interface LevelMapHooks {
  onPlay(location: LocationConfig): void
}

function div(cls: string): HTMLDivElement {
  const d = document.createElement('div')
  d.className = cls
  return d
}

export class LevelMap {
  constructor(root: HTMLElement, pages: MapPage[], hooks: LevelMapHooks) {
    const scroller = div('levelmap')

    for (const page of pages) {
      const pageEl = div('map-page')
      const canvas = div('map-canvas')

      const bg = document.createElement('img')
      bg.className = 'map-bg'
      bg.alt = ''
      // 按背景图自然尺寸做 cover(填满一屏、只裁少量左右),适配任意比例的地图图
      bg.onload = () => {
        const w = bg.naturalWidth
        const h = bg.naturalHeight
        if (w && h) {
          canvas.style.aspectRatio = `${w} / ${h}`
          canvas.style.width = `max(100%, ${((w / h) * 100).toFixed(3)}vh)`
        }
      }
      bg.src = page.background
      canvas.appendChild(bg)

      page.locations.forEach((loc, i) => {
        const node = document.createElement('button')
        node.className = 'level-node'
        node.style.left = `${loc.map.x}%`
        node.style.top = `${loc.map.y}%`

        const icon = document.createElement('img')
        icon.className = 'node-icon'
        icon.src = loc.icon
        icon.alt = loc.name

        const pill = document.createElement('span')
        pill.className = 'node-pill'
        pill.textContent = `${i + 1}. ${loc.name}`
        pill.style.backgroundImage = `url(${pillUrl})`

        node.append(icon, pill)
        node.onclick = () => hooks.onPlay(loc)
        canvas.appendChild(node)
      })

      pageEl.appendChild(canvas)
      scroller.appendChild(pageEl)
    }

    root.appendChild(scroller)
  }
}
