"""Sinh icon app (iOS / Android / splash / favicon) từ logo BiHome của web (frontend/src/components/BiHomeLogo.tsx).

Chạy: python mobile/scripts/generate-icons.py  (cần Pillow) → ghi đè mobile/assets/*.png
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'assets'
PRIMARY = (31, 157, 85)
ACCENT = (187, 247, 208)
WHITE = (255, 255, 255)
SS = 4  # vẽ lớn rồi thu nhỏ để khử răng cưa


def house(draw, s, ox, oy, scale, body, door, dot=True):
    """Ngôi nhà theo viewBox 40×40 của BiHomeMark, đặt tại (ox, oy) với hệ số scale."""
    p = lambda x, y: (ox + x * scale * s, oy + y * scale * s)
    draw.polygon([p(20, 9), p(31, 18), p(31, 31), p(9, 31), p(9, 18)], fill=body)
    draw.rounded_rectangle([p(16, 21), p(24, 31)], radius=1.5 * scale * s, fill=door)
    if dot:
        cx, cy = p(27, 13)
        r = 2.4 * scale * s
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT)


def canvas(size, bg):
    return Image.new('RGBA', (size * SS, size * SS), bg)


def save(img, size, name):
    img.resize((size, size), Image.LANCZOS).save(OUT / name)
    print(name, size)


def main():
    # iOS / chung: nền xanh full-bleed (iOS tự bo góc).
    img = canvas(1024, PRIMARY + (255,))
    house(ImageDraw.Draw(img), SS, 112 * SS, 112 * SS, 20, WHITE, PRIMARY)
    save(img, 1024, 'icon.png')

    # Android adaptive: nền / hình (vùng an toàn ~66%) / đơn sắc.
    save(canvas(1024, PRIMARY + (255,)), 1024, 'android-icon-background.png')
    fg = canvas(1024, (0, 0, 0, 0))
    house(ImageDraw.Draw(fg), SS, 232 * SS, 232 * SS, 14, WHITE, PRIMARY)
    save(fg, 1024, 'android-icon-foreground.png')
    mono = canvas(1024, (0, 0, 0, 0))
    house(ImageDraw.Draw(mono), SS, 232 * SS, 232 * SS, 14, WHITE, (0, 0, 0, 0), dot=False)
    save(mono, 1024, 'android-icon-monochrome.png')

    # Splash: logo bo góc trên nền trắng.
    splash = canvas(1024, (0, 0, 0, 0))
    d = ImageDraw.Draw(splash)
    d.rounded_rectangle([112 * SS, 112 * SS, 912 * SS, 912 * SS], radius=200 * SS, fill=PRIMARY)
    house(d, SS, 112 * SS, 112 * SS, 20, WHITE, PRIMARY)
    save(splash, 1024, 'splash-icon.png')

    fav = canvas(48, (0, 0, 0, 0))
    d = ImageDraw.Draw(fav)
    d.rounded_rectangle([0, 0, 48 * SS, 48 * SS], radius=12 * SS, fill=PRIMARY)
    house(d, SS, 0, 0, 1.2, WHITE, PRIMARY)
    save(fav, 48, 'favicon.png')


if __name__ == '__main__':
    main()
