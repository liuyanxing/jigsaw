# 拼图(Jigsaw)游戏 · Web 原型

矩形块拼图的可玩 Web 原型,**为后续 Android 原生重写而设计**:核心逻辑与平台无关,
渲染/输入/存储是薄平台层,便于近乎 1:1 翻译成 Kotlin。

> 完整方案见 `~/.claude/plans/andorid-jigsaw-cryptic-cake.md`。

## 玩法(对标 OpenMyGame 参考作品)

- **所有矩形块打乱后铺满网格**(无托盘)。
- **拖动一块** → 与目标格的块**交换**位置。
- 相邻块若**相对位置正确**,自动连成一个**组**:组内**无缝**显示,可整组一起拖动;
  非同组之间用**缝隙 + 边框**分隔。
- 整组拖到别处时,被覆盖的外来块按常规**交换**填回腾空格。
- **全部归位**(每块在自己 home 格)即完成。

顶栏:`≡` 暂停/重玩/换图 · ⏱ 用时 · 👣 步数 · ✓ 归位进度 · 💡 短暂查看完整图 · 👁 预览叠层开关。

## 运行

```bash
npm install
npm run dev      # 开发服务器 http://localhost:5173
npm test         # core 纯逻辑单测(Vitest,18 项)
npm run build    # 类型检查 + 生产构建(dist/,~20KB JS)
```

手机视角:浏览器开发者工具切到移动设备模拟(竖屏)。

## 架构:核心层 vs 平台层

世界坐标 = **原图像素空间**;相机(scale+translate)映射到屏幕。块 id == 它的 home 单元序号,
其图像内容即 home 单元在原图中的矩形;绘制即 `drawImage(src, srcRect, dstRect)`,无路径裁剪。
棋盘状态就是一个**置换** `order[cellIndex] = pieceId`。

```
src/core/      纯逻辑,无 DOM —— 直译成 Kotlin
  rng          种子 PRNG(mulberry32)+ 洗牌
  grid         网格几何(单元↔世界坐标、含点单元、最近单元)
  puzzle       order 置换 + 打乱生成
  groups       相邻同 offset 连通成组(相对位置正确)
  move         整组平移落子 + 外来块填空(交换)
  state        归位计数 / 完成判定(order 恒等)
  serialize    存/读档(只存 order + 元数据,分辨率无关)
src/render/    Canvas 绘制(camera / 棋盘+分组接缝+浮起组+预览)
src/storage/   localStorage 实现
src/ui/        DOM 外壳(世界地图 levelMap / 选关页 stageSelect / 顶栏 / 暂停 / 新拼图 / 完成弹窗)
assets/        UI 资产(项目根:地图背景 / 地标圆标 / 名牌 / 返回键 / 花框标题 / 卡底 / 完成与进行中徽标 / 橙色按钮),Vite 直接 import
src/assets/    程序化内置图 + 设备图(dataURL 持久化)
src/game/      controller:状态 + 拖拽整组/交换 + 渲染循环
```

## Web → Android 重写映射

| Web(原型) | Android | 说明 |
|---|---|---|
| `core/*`(TS) | `core/*`(Kotlin) | 数学一致,逐文件直译 |
| `drawImage(src, sRect, dRect)` | `Canvas.drawBitmap(bmp, srcRect, dstRect)` | 矩形切片 |
| 相机 scale+translate | `Matrix` / 手动变换 | 缩放平移同源 |
| Pointer Events | `Modifier.pointerInput` / `MotionEvent` | 同样的拾取/拖动/落子意图 |
| 分组接缝绘制(背景缝+描边) | 同样的 Canvas drawRect/stroke | 无缝/分隔视觉 |
| localStorage | DataStore / Room | 换实现,接口一致 |
| 程序化图 / `<input type=file>` | `assets` / Photo Picker | 图片来源 |
| WebAudio | SoundPool | 音效 |

## 已实现 / 待办

- [x] core:置换/分组/整组交换/完成判定/存档 + 18 项单测
- [x] 网格渲染:同组无缝、异组留缝+边框;整组浮起拖动 + 投影
- [x] 交互:打乱铺网格、单块交换、整组拖动交换、完成庆祝、计时/步数/进度、预览、存档续玩
- [x] 世界地图首页:地图背景 + 5 个路径节点(地标圆标 + 名牌),点节点进入该地点的选关页
- [x] 选关页:花框标题 + 5×5=25 卡(地标缩略 + 完成✓/进行中/可玩/锁定🔒 + 序号)+ 开始拼图;占位进度(1 完成/2 当前/3 解锁);三屏导航 地图→选关→游戏,游戏内可返回选关。无资产的货币栏/锁定图标/整页插画用渐变与字形代替
- [ ] 可选打磨:落子吸附动画、组内圆角、棋盘缩放/平移;真实关卡进度(完成/解锁持久化)、每关独立图与难度、节点位置微调
- [ ] 阶段 B:Android(Kotlin + Compose + Canvas)重写
- [ ] 产品化:元进度(关卡/每日/金币)、激励广告、内购、后端图库

> 注:`src/main.ts` 暴露了 `window.__game` 仅用于调试,生产可移除。
