# The production manager on the hall (v75; docs/art/SPRITES.md 10.7): the joiner's own idle and
# walk sheets with the green shirt gone white, so the one man of the office who is seen on the
# floor is told from the crew at a glance (PIOTR, 03.10: "in a white shirt, not green like the
# rest").
#
#   public/sprites/character.productionManager.idle.sheet.png   (and .json)
#   public/sprites/character.productionManager.walk.sheet.png   (and .json)
#
# Nothing is drawn here. Every pixel is the delivered joiner's: the green of his shirt goes to a
# shaded white, stretched on the shirt's own range of light so the folds still read, and his face,
# his arms, his trousers and his boots stay his. Run it again when the art side repaints the
# joiner, or delete the four files the day a painted manager is delivered under the same names:
#
#   python3 scripts/manager-shirt.py     (needs Pillow)
#   npm run sprites:manifest

import json
from pathlib import Path

from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'
SOURCE = 'character.joiner'
TARGET = 'character.productionManager'
ANIMATIONS = ['idle', 'walk']

# How much greener than red and blue a pixel is before it is shirt.
GREEN_BY = 4
# The rows from the top of the shirt that are its collar, where the chin is in front of it.
COLLAR_ROWS = 6


def luminance(pixel):
    return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]


def is_shirt(r, g, b):
    return g >= r + GREEN_BY and g >= b + GREEN_BY


def spread(values):
    """The range the shirt's own light and shade runs over, without its three per cent of outliers."""
    ordered = sorted(values)
    if not ordered:
        return (0, 255)
    return (ordered[int(len(ordered) * 0.03)], ordered[int(len(ordered) * 0.97)])


def is_skin(r, g, b):
    return r > 95 and r > g + 12 and g > b - 5 and r - b > 28 and g > 50


def shirt(frame):
    """One cell of the sheet with the white shirt on."""
    out = frame.copy()
    pixels = out.load()
    width, height = out.size
    green = [
        (x, y)
        for y in range(height)
        for x in range(width)
        if pixels[x, y][3] > 40 and is_shirt(*pixels[x, y][:3])
    ]
    if not green:
        return out
    # The shirt is its green and the shade between the green of one row: the folds and the dark
    # under the arm are too grey to be told by their colour, and are shirt all the same.
    # Not at the collar, though: the dark between the two shoulders up there is his beard.
    cloth = set(green)
    collar = min(y for _, y in green) + COLLAR_ROWS
    for row in {y for _, y in green if y >= collar}:
        across = [x for x, y in green if y == row]
        for x in range(min(across), max(across) + 1):
            if pixels[x, row][3] > 40 and not is_skin(*pixels[x, row][:3]):
                cloth.add((x, row))
    low, high = spread([luminance(pixels[x, y]) for x, y in cloth])
    for x, y in cloth:
        r, g, b, a = pixels[x, y]
        shade = max(0.0, min(1.0, (luminance((r, g, b)) - low) / max(1, high - low)))
        white = int(118 + shade**0.75 * 128)
        pixels[x, y] = (white, white, min(255, white + 4), a)
    return out


def main():
    for animation in ANIMATIONS:
        numbers = json.loads((SPRITES / f'{SOURCE}.{animation}.json').read_text(encoding='utf8'))
        sheet = Image.open(SPRITES / f'{SOURCE}.{animation}.sheet.png').convert('RGBA')
        cell_width, cell_height = numbers['cellWidth'], numbers['cellHeight']
        out = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        for row in range(sheet.height // cell_height):
            for column in range(sheet.width // cell_width):
                box = (column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height)
                out.paste(shirt(sheet.crop(box)), box[:2])
        out.save(SPRITES / f'{TARGET}.{animation}.sheet.png', optimize=True)
        numbers['spriteKey'] = TARGET
        numbers['source'] = {'file': f'{SOURCE}.{animation}.sheet.png', 'by': 'scripts/manager-shirt.py'}
        (SPRITES / f'{TARGET}.{animation}.json').write_text(json.dumps(numbers, indent=2) + '\n', encoding='utf8')
        print(f'{TARGET}.{animation}.sheet.png', out.size)


if __name__ == '__main__':
    main()
