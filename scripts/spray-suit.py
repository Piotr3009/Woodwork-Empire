# The man in the spray booth (v71; docs/art/SPRITES.md 10.6): the joiner's own bench sheet with a
# white suit and a respirator on, as one sheet every role plays in a booth, because the suit covers
# the man whoever he is.
#
#   public/sprites/character.suit.spray.sheet.png
#   public/sprites/character.suit.spray.json
#
# Nothing is drawn here. Every pixel is the delivered joiner's: his clothes, his arms and his hair
# go to a shaded white (the top and the legs each stretched on its own range, so the folds still
# read), the lower half of his face to the grey of a respirator, and his boots stay his boots. Run
# it again when the art side repaints the joiner's bench sheet, or delete both files the day a
# painted sprayer is delivered under the same two names:
#
#   python3 scripts/spray-suit.py        (needs Pillow)
#   npm run sprites:manifest

import json
from pathlib import Path

from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'
SOURCE = 'character.joiner.bench'
TARGET = 'character.suit.spray'

# Shares of the man's own height, from the top of his head: where the head ends, where the top
# hands over to the legs, and how much of the bottom is boot.
HEAD, WAIST, BOOTS = 0.17, 0.50, 0.075


def luminance(pixel):
    return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]


def is_skin(r, g, b):
    return r > 95 and r > g + 12 and g > b - 5 and r - b > 28 and g > 50


def spread(values):
    """The range a region's own light and shade runs over, without its three per cent of outliers."""
    ordered = sorted(values)
    if not ordered:
        return (0, 255)
    return (ordered[int(len(ordered) * 0.03)], ordered[int(len(ordered) * 0.97)])


def suit(frame):
    """One cell of the sheet with the suit on."""
    out = frame.copy()
    pixels = out.load()
    width, height = out.size
    body = [(x, y) for y in range(height) for x in range(width) if pixels[x, y][3] > 40]
    if not body:
        return out
    top = min(y for _, y in body)
    bottom = max(y for _, y in body)
    tall = bottom - top
    head_bottom = top + int(tall * HEAD)
    waist = top + int(tall * WAIST)
    boots = bottom - int(tall * BOOTS)
    face = {(x, y) for x, y in body if y <= head_bottom and is_skin(*pixels[x, y][:3])}
    upper = spread([luminance(pixels[x, y]) for x, y in body if y < waist and (x, y) not in face])
    lower = spread([luminance(pixels[x, y]) for x, y in body if waist <= y < boots])
    for x, y in body:
        if (x, y) in face or y >= boots:
            continue
        r, g, b, a = pixels[x, y]
        low, high = upper if y < waist else lower
        shade = max(0.0, min(1.0, (luminance((r, g, b)) - low) / max(1, high - low)))
        white = int(150 + shade**0.8 * 100)
        pixels[x, y] = (white - 3, white, min(255, white + 5), a)
    if face:
        first = min(y for _, y in face)
        last = max(y for _, y in face)
        mask_from = first + (last - first) * 0.42
        for x, y in face:
            a = pixels[x, y][3]
            if y >= mask_from:
                grey = int(70 + luminance(pixels[x, y]) / 255 * 60)
                pixels[x, y] = (grey, grey + 8, grey + 20, a)
            elif y <= first + 1:
                # The hood's edge over his brow.
                pixels[x, y] = (214, 217, 222, a)
    return out


def main():
    numbers = json.loads((SPRITES / f'{SOURCE}.json').read_text(encoding='utf8'))
    sheet = Image.open(SPRITES / f'{SOURCE}.sheet.png').convert('RGBA')
    cell_width, cell_height = numbers['cellWidth'], numbers['cellHeight']
    out = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    for row in range(sheet.height // cell_height):
        for column in range(sheet.width // cell_width):
            box = (column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height)
            out.paste(suit(sheet.crop(box)), box[:2])
    out.save(SPRITES / f'{TARGET}.sheet.png', optimize=True)
    numbers['spriteKey'] = 'character.suit'
    numbers['animation'] = 'spray'
    numbers['source'] = {'file': f'{SOURCE}.sheet.png', 'by': 'scripts/spray-suit.py'}
    (SPRITES / f'{TARGET}.json').write_text(json.dumps(numbers, indent=2) + '\n', encoding='utf8')
    print(f'{TARGET}.sheet.png', out.size)


if __name__ == '__main__':
    main()
