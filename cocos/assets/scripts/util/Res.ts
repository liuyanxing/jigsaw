import { resources, SpriteFrame, Texture2D } from 'cc'
import { refToResPath } from '../config/levels'

// 资源加载:把 levels.json 里的图片引用('/assets/...')加载成 Cocos SpriteFrame / Texture2D。
// SpriteFrame 带缓存(选关缩略图、图标、地图背景多处复用)。

const sfCache = new Map<string, SpriteFrame>()

/** 引用 → SpriteFrame(缓存)。失败返回 null。 */
export function loadSpriteFrame(ref: string): Promise<SpriteFrame | null> {
  const path = refToResPath(ref) + '/spriteFrame'
  const hit = sfCache.get(path)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve) => {
    resources.load(path, SpriteFrame, (err, sf) => {
      if (err || !sf) {
        console.warn('[Res] 加载 SpriteFrame 失败:', path, err)
        resolve(null)
        return
      }
      sfCache.set(path, sf)
      resolve(sf)
    })
  })
}

/** 引用 → Texture2D(对局切片用)。失败返回 null。 */
export function loadTexture(ref: string): Promise<Texture2D | null> {
  const path = refToResPath(ref) + '/texture'
  return new Promise((resolve) => {
    resources.load(path, Texture2D, (err, tex) => {
      if (err || !tex) {
        console.warn('[Res] 加载 Texture2D 失败:', path, err)
        resolve(null)
        return
      }
      resolve(tex)
    })
  })
}
