#!/usr/bin/env python3
"""去掉圆形白边并缩放到指定尺寸。

适用于：透明底 + 圆形图标 + 外圈白色圆环 的导出图。
默认处理 assets/export (1)/ 下的 PNG/JPG。
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("缺少 Pillow，请先运行: pip install Pillow", file=sys.stderr)
    sys.exit(1)

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
DEFAULT_INPUT = Path(__file__).resolve().parent.parent / "assets" / "export (1)"
DEFAULT_SIZE = 92


def _classify_pixel(r: int, g: int, b: int, a: int, white_threshold: int, alpha_threshold: int) -> str:
    if a <= alpha_threshold:
        return "transparent"
    if r >= white_threshold and g >= white_threshold and b >= white_threshold:
        return "white"
    return "color"


def _centroid(img: Image.Image, alpha_threshold: int = 20) -> tuple[float, float]:
    px = img.load()
    w, h = img.size
    sx = sy = sa = 0.0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > alpha_threshold:
                sx += x * a
                sy += y * a
                sa += a
    if sa <= 0:
        return w / 2, h / 2
    return sx / sa, sy / sa


def _radial_profile(
    img: Image.Image,
    cx: float,
    cy: float,
    white_threshold: int,
    alpha_threshold: int,
) -> list[dict[str, float]]:
    px = img.load()
    w, h = img.size
    max_r = int(math.hypot(w, h))
    profile: list[dict[str, float]] = []

    for ri in range(max_r + 1):
        counts = {"transparent": 0.0, "white": 0.0, "color": 0.0}
        samples = max(32, int(2 * math.pi * max(ri, 1)))
        for i in range(samples):
            ang = 2 * math.pi * i / samples
            x = int(round(cx + ri * math.cos(ang)))
            y = int(round(cy + ri * math.sin(ang)))
            if 0 <= x < w and 0 <= y < h:
                kind = _classify_pixel(*px[x, y], white_threshold, alpha_threshold)
                counts[kind] += 1
        total = sum(counts.values())
        if total <= 0:
            profile.append({"transparent": 1.0, "white": 0.0, "color": 0.0})
        else:
            profile.append({k: v / total for k, v in counts.items()})

    return profile


def _find_content_radius(profile: list[dict[str, float]], white_ratio: float = 0.5) -> int | None:
    """从外向内穿过白色圆环，找到内侧彩色内容的半径。"""
    opaque_end = 0
    for ri, fracs in enumerate(profile):
        if fracs["transparent"] < 0.6:
            opaque_end = ri

    if opaque_end <= 0:
        return None

    ri = opaque_end
    while ri > 0 and profile[ri]["white"] >= white_ratio:
        ri -= 1

    while ri > 0 and profile[ri]["transparent"] >= 0.6:
        ri -= 1

    if profile[ri]["color"] >= 0.25:
        return ri

    # 兜底：找最靠外的连续白色环的内缘
    in_ring = False
    inner_edge = None
    for r, fracs in enumerate(profile):
        is_white_ring = fracs["white"] >= white_ratio and fracs["color"] < 0.2
        if is_white_ring and not in_ring:
            in_ring = True
            inner_edge = r
        elif not is_white_ring and in_ring:
            break
    return inner_edge - 1 if inner_edge and inner_edge > 0 else None


def remove_circular_white_border(
    img: Image.Image,
    white_threshold: int = 235,
    alpha_threshold: int = 20,
) -> Image.Image:
    rgba = img.convert("RGBA")
    cx, cy = _centroid(rgba, alpha_threshold)
    profile = _radial_profile(rgba, cx, cy, white_threshold, alpha_threshold)
    content_r = _find_content_radius(profile)

    if content_r is None or content_r < 8:
        # 没有检测到圆环，退回普通透明边裁剪
        bbox = rgba.getchannel("A").point(lambda a: 255 if a > alpha_threshold else 0).getbbox()
        return rgba.crop(bbox) if bbox else rgba

    px = rgba.load()
    w, h = rgba.size
    r2 = content_r * content_r
    cx_i, cy_i = int(round(cx)), int(round(cy))

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= alpha_threshold:
                continue
            dist2 = (x - cx) ** 2 + (y - cy) ** 2
            if dist2 > r2:
                px[x, y] = (r, g, b, 0)
            elif _classify_pixel(r, g, b, a, white_threshold, alpha_threshold) == "white":
                px[x, y] = (r, g, b, 0)

    side = max(2, content_r * 2)
    left = int(round(cx - content_r))
    top = int(round(cy - content_r))
    left = max(0, min(left, w - side))
    top = max(0, min(top, h - side))
    right = min(w, left + side)
    bottom = min(h, top + side)
    return rgba.crop((left, top, right, bottom))


def process_image(
    src: Path,
    dst: Path,
    size: int,
    white_threshold: int,
) -> tuple[tuple[int, int], tuple[int, int], tuple[int, int]]:
    with Image.open(src) as img:
        original = img.size
        trimmed = remove_circular_white_border(img, white_threshold=white_threshold)
        trimmed_size = trimmed.size
        resized = trimmed.resize((size, size), Image.Resampling.LANCZOS)

        dst.parent.mkdir(parents=True, exist_ok=True)
        save_kwargs: dict = {}
        if dst.suffix.lower() in {".jpg", ".jpeg"}:
            save_kwargs["quality"] = 95
        elif dst.suffix.lower() == ".png":
            save_kwargs["optimize"] = True

        resized.save(dst, **save_kwargs)
        return original, trimmed_size, (size, size)


def main() -> None:
    parser = argparse.ArgumentParser(description="去掉圆形白边并缩放到正方形")
    parser.add_argument(
        "input_dir",
        nargs="?",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"输入目录（默认: {DEFAULT_INPUT}）",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=None,
        help="输出目录；默认与输入目录相同（覆盖原文件）",
    )
    parser.add_argument(
        "-s",
        "--size",
        type=int,
        default=DEFAULT_SIZE,
        help=f"输出边长，默认 {DEFAULT_SIZE}",
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=int,
        default=235,
        help="白色判定阈值 0-255，默认 235",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只打印将要处理的文件，不写盘",
    )
    args = parser.parse_args()

    input_dir: Path = args.input_dir.resolve()
    output_dir: Path = (args.output_dir or input_dir).resolve()

    if not input_dir.is_dir():
        print(f"输入目录不存在: {input_dir}", file=sys.stderr)
        sys.exit(1)

    files = sorted(
        p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    if not files:
        print(f"目录中没有图片: {input_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"输入: {input_dir}")
    print(f"输出: {output_dir}")
    print(f"尺寸: {args.size}x{args.size}  白色阈值: {args.threshold}\n")

    for src in files:
        dst = output_dir / src.name
        if args.dry_run:
            print(f"[dry-run] {src.name}")
            continue
        orig, trimmed, final = process_image(src, dst, args.size, args.threshold)
        print(f"{src.name}: {orig[0]}x{orig[1]} -> 裁切 {trimmed[0]}x{trimmed[1]} -> {final[0]}x{final[1]}")

    print(f"\n完成，共处理 {len(files)} 张图片。")


if __name__ == "__main__":
    main()
