// 相机:世界坐标(=原图像素)↔ 屏幕坐标(CSS px)的变换。
// Android 对应:Canvas 的 Matrix(scale + translate)。缩放/平移(A6)只需改这里。

export interface Camera {
  scale: number
  tx: number
  ty: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** 把世界 (0,0,imgW,imgH) 以 contain 居中放进 viewport;fill∈(0,1] 为留白系数。 */
export function fitCamera(imgW: number, imgH: number, vp: Rect, fill = 0.96): Camera {
  const scale = Math.min(vp.w / imgW, vp.h / imgH) * fill
  const drawW = imgW * scale
  const drawH = imgH * scale
  return {
    scale,
    tx: vp.x + (vp.w - drawW) / 2,
    ty: vp.y + (vp.h - drawH) / 2,
  }
}

export function worldToScreen(cam: Camera, wx: number, wy: number): { x: number; y: number } {
  return { x: wx * cam.scale + cam.tx, y: wy * cam.scale + cam.ty }
}

export function screenToWorld(cam: Camera, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - cam.tx) / cam.scale, y: (sy - cam.ty) / cam.scale }
}
