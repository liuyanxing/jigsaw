import { Node, UITransform, Label, Sprite, SpriteFrame, Color, Graphics, EventTouch, Vec3 } from 'cc'

// 代码构建 UI 的小工具(M2 用,样式从简)。所有节点锚点居中、原点在父节点中心、y 向上。

export function node(name: string, w: number, h: number, parent?: Node): Node {
  const n = new Node(name)
  const u = n.addComponent(UITransform)
  u.setContentSize(w, h)
  u.setAnchorPoint(0.5, 0.5)
  if (parent) parent.addChild(n)
  return n
}

export function setPos(n: Node, x: number, y: number): Node {
  n.setPosition(x, y, 0)
  return n
}

/** 文本节点(系统字体)。 */
export function label(text: string, size: number, color = new Color(94, 68, 19), parent?: Node): Node {
  const n = new Node('label')
  n.addComponent(UITransform).setAnchorPoint(0.5, 0.5)
  const l = n.addComponent(Label)
  l.string = text
  l.fontSize = size
  l.lineHeight = size + 2
  l.color = color
  l.horizontalAlign = Label.HorizontalAlign.CENTER
  l.verticalAlign = Label.VerticalAlign.CENTER
  if (parent) parent.addChild(n)
  return n
}

/** 纯色矩形(用 Graphics 画,圆角可选)。挂在传入节点上。 */
export function fillRect(host: Node, w: number, h: number, color: Color, radius = 0): Graphics {
  const g = host.getComponent(Graphics) ?? host.addComponent(Graphics)
  g.clear()
  g.fillColor = color
  if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius)
  else g.rect(-w / 2, -h / 2, w, h)
  g.fill()
  return g
}

/** Sprite 节点(CUSTOM 尺寸,按传入 w/h 渲染,不被 spriteFrame 重置)。 */
export function spriteNode(name: string, w: number, h: number, sf: SpriteFrame | null, parent?: Node): Node {
  const n = node(name, w, h, parent)
  const sp = n.addComponent(Sprite)
  sp.trim = false
  if (sf) sp.spriteFrame = sf
  sp.sizeMode = Sprite.SizeMode.CUSTOM
  n.getComponent(UITransform)!.setContentSize(w, h) // 赋帧后再定尺寸,避免被重置
  return n
}

/** 给某 Sprite 节点换帧并保持自定义尺寸。 */
export function setSprite(n: Node, sf: SpriteFrame, w: number, h: number): void {
  const sp = n.getComponent(Sprite)
  if (!sp) return
  sp.spriteFrame = sf
  sp.sizeMode = Sprite.SizeMode.CUSTOM
  n.getComponent(UITransform)!.setContentSize(w, h)
}

/** 点按(用 TOUCH_END,带轻微位移判定避免与拖动混淆;UI 这里直接触发即可)。 */
export function onTap(n: Node, cb: () => void): void {
  n.on(
    Node.EventType.TOUCH_END,
    (_e: EventTouch) => {
      cb()
    },
    n,
  )
}

export { Vec3 }
