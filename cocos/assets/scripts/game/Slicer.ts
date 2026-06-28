import { SpriteFrame, Texture2D, Rect } from 'cc'

// 把整张关卡图按 rows×cols 切成单元贴片。返回的 SpriteFrame 顺序:index = r*cols + c = pieceId
// (与 core/puzzle 中“块 id == home 单元序号”一致)。
//
// 注:Cocos Creator 3.x 的 SpriteFrame.rect 以纹理“左上角”为原点(与原图像素一致),
// 故 y = r*ch。若实测发现上下颠倒,把 y 改成 (h - (r + 1) * ch) 即可。

export function sliceTexture(tex: Texture2D, rows: number, cols: number): SpriteFrame[] {
  const w = tex.width
  const h = tex.height
  const cw = w / cols
  const ch = h / rows
  const frames: SpriteFrame[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sf = new SpriteFrame()
      sf.texture = tex
      sf.rect = new Rect(c * cw, r * ch, cw, ch)
      frames.push(sf)
    }
  }
  return frames
}
