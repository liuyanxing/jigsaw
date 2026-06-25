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

## 关卡配置(改 `public/levels.json`,免编译)

关卡是**纯数据**:改 `public/levels.json` + 刷新即生效(Vite 原样伺服 `public/`,`fetch` 用 `no-cache` 总取最新;线上替换该文件或改成从 CDN 拉取即可下发新关卡)。顶层是**多张地图页**,紧凑模板按难度阶梯展开:

```jsonc
{ "diffRamp": [[3,3], …, [7,7]],
  "pages": [
    { "id": "page-1", "background": "/assets/maps/bg_stage_01.webp",
      "locations": [
        { "id": "paris", "name": "巴黎", "icon": "/assets/icons/eiffel_tower.png",
          "map": { "x": 46, "y": 12 }, "count": 25,
          "images": ["builtin:sunset", …], "seedBase": 1000 }
      ] } ] }
```

- **加地图页**:`pages` 加一条(`id` + `background` 背景图 + `locations`),背景图丢进 `public/assets/maps/`。多页**整屏上下翻页**(scroll-snap),每页 cover 占满一屏(按背景图自然比例,只裁少量边)。
- **加地点**:该页 `locations` 加一条(`id/name/icon/map/count/images`)。
- **加子关**:该地点 `count + 1`(难度按 `diffRamp` 自动;特殊化用 `overrides`)。
- **配真实图**:图丢进 `public/assets/...` → 该关 `image`/`overrides` 填路径(或 `builtin:<id>` 占位)。
- **调难度**:改 `diffRamp`。

`src/config/levels.ts` 只负责类型 + `loadPages()` 加载展开(通用代码,不随关卡变);进度/解锁见 `src/storage/progress.ts`(顺序解锁,通关持久化)。

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
src/config/    levels.ts —— 关卡配置类型 + loadPages()(运行时 fetch /levels.json 并展开为多张地图页)
src/storage/   localStore(对局存档)+ progress(关卡顺序解锁,localStorage 持久化)
src/ui/        DOM 外壳(世界地图 levelMap / 选关页 stageSelect / 顶栏 / 暂停 / 新拼图 / 完成弹窗)
src/assets/    images:程序化内置图 + 设备图 + 按 `builtin:<id>` / public 路径解析关卡图
src/game/      controller:状态 + 拖拽整组/交换 + 渲染循环
assets/        UI 静态资产(地图背景 / 名牌 / 返回键 / 花框标题 / 徽标 / 橙色按钮),Vite import
public/        levels.json(★关卡数据,运行时加载免编译)+ assets/maps(地图背景)+ assets/icons(地标)+ assets/levels(后续实拍图)
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
- [x] 选关页:花框标题 + N 卡(地标缩略 + 完成✓/当前/可玩/锁定🔒 + 序号)+ 开始拼图;三屏导航 地图→选关→游戏,游戏内可返回选关。无资产的货币栏/锁定图标/整页插画用渐变与字形代替
- [x] 关卡配置化(数据驱动,改关卡免编译):`public/levels.json` 顶层**多张地图页**(整屏上下翻页 scroll-snap)→ 难度阶梯展开;顺序解锁 + localStorage 持久化(通关解锁下一关);图片按 `builtin:<id>` / public 路径解析
- [ ] 可选打磨:落子吸附动画、组内圆角、棋盘缩放/平移;每关独立实拍图、节点位置微调
- [ ] 阶段 B:Android(Kotlin + Compose + Canvas)重写
- [ ] 产品化:元进度(关卡/每日/金币)、激励广告、内购、后端图库

> 注:`src/main.ts` 暴露了 `window.__game` 仅用于调试,生产可移除。
