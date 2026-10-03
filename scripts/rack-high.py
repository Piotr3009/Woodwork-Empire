# The picture of the high capacity rack (v69): the industrial rack's own picture with its blue
# paint turned red, in both of its turns. Nothing is painted here: every pixel is the delivered
# rack's, and only the hue of its frame changes, so the sheets and the steel stay what they are.
# Run it again when the art side repaints the industrial rack:
#
#   python3 scripts/rack-high.py        (needs Pillow)
#   npm run sprites:manifest

import colorsys
from pathlib import Path

from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'

# The frame's paint is every blue in the picture; red is where it goes.
BLUE_FROM, BLUE_TO, PAINTED = 190, 260, 0.25
RED = 2 / 360


def in_red(source, target):
    picture = Image.open(SPRITES / source).convert('RGBA')
    pixels = picture.load()
    width, height = picture.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            hue, saturation, value = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if BLUE_FROM <= hue * 360 <= BLUE_TO and saturation > PAINTED:
                nr, ng, nb = colorsys.hsv_to_rgb(RED, min(1.0, saturation * 1.05), value)
                pixels[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    picture.save(SPRITES / target, optimize=True)
    return picture.size


if __name__ == '__main__':
    print('sheetRackHigh.standard.png', in_red('sheetRack.industrial.png', 'sheetRackHigh.standard.png'))
    print('sheetRackHigh.standard.r.png', in_red('sheetRack.industrial.r.png', 'sheetRackHigh.standard.r.png'))
