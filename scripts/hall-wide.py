# The two layers a unit that has grown is painted with (v67; docs/art/SPRITES.md 9.7):
#
#   public/sprites/hallBackgroundWide.png   the hall at 40 by 10 m, 2640 by 1608, RGB
#   public/sprites/hallCanteenWide.png      the canteen block at 4 by 4 m, 1680 by 1128, RGBA
#
# Nothing is painted here. Both are made of the three delivered pictures and nothing else: the
# floor and the rear wall of hallBackground.png carried on along the hall, five metres at a time,
# and the canteen block of hallCanteen.png stood beside itself with its second door walled up.
# Run it again when the art side repaints any of the three:
#
#   python3 scripts/hall-wide.py        (needs Pillow)
#   npm run sprites:manifest

from pathlib import Path

from PIL import Image, ImageDraw

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'

# The projection of docs/art/SPRITES.md 9.2, on the 2x canvas.
ORIGIN_X, ORIGIN_Y = 600, 288


def screen(x, y, z=0.0):
    return (ORIGIN_X + (x - y) * 48, ORIGIN_Y + (x + y) * 24 - z * 48)


def hall_background_wide():
    """The 20 by 10 m background with its own floor and rear wall carried on to 40 m.

    The slice of the hall from x = 9 to its end is laid down again five metres further along, four
    times, each copy feathered into the one before it over a metre and a half, so the shading of
    the floor and the courses of the blockwork run on without a seam."""
    source = Image.open(SPRITES / 'hallBackground.png').convert('RGB')
    length, depth = 40, 10
    slice_from, seam, feather, steps = 9.0, 14.0, 1.5, 24
    wall_top, kerb = 3.5, 80
    width = int(screen(length, 0)[0]) + 120
    height = int(screen(length, depth)[1]) + 120
    out = Image.new('RGB', (width, height), source.getpixel((4, 4)))
    out.paste(source, (0, 0))

    def region(draw, start, fill, end=20.0):
        draw.polygon([screen(start, 0), screen(end, 0), screen(end, depth), screen(start, depth)], fill=fill)
        draw.polygon(
            [screen(start, 0), screen(end, 0), screen(end, 0, wall_top), screen(start, 0, wall_top)],
            fill=fill,
        )
        draw.polygon(
            [
                screen(start, 0, wall_top),
                screen(end, 0, wall_top),
                screen(end, -0.9, wall_top),
                screen(start, -0.9, wall_top),
            ],
            fill=fill,
        )
        draw.polygon(
            [screen(end, 0), screen(end, -0.9), screen(end, -0.9, wall_top), screen(end, 0, wall_top)],
            fill=fill,
        )
        near, corner, far = screen(start, depth), screen(end, depth), screen(end, 0)
        draw.polygon([near, corner, (corner[0], corner[1] + kerb), (near[0], near[1] + kerb)], fill=fill)
        draw.polygon([far, corner, (corner[0], corner[1] + kerb), (far[0] + 60, far[1] + kerb)], fill=fill)

    mask = Image.new('L', source.size, 0)
    draw = ImageDraw.Draw(mask)
    for index in range(steps + 1):
        region(draw, slice_from + feather * index / steps, int(255 * index / steps))

    step = seam - slice_from
    shift = step
    while shift <= length - 20 + 0.01:
        out.paste(source, (int(shift * 48), int(shift * 24)), mask)
        shift += step
    out.save(SPRITES / 'hallBackgroundWide.png', optimize=True)
    return out.size


def hall_canteen_wide():
    """The canteen block at 4 by 4 m: its own picture twice, two metres apart, as one block.

    The second door goes, walled up with a patch of the hall's rear wall, and the rim that ran
    between the two roofs is covered with roof. The door of the block as it was built stays where
    it was painted, which is where the game has it (`roomDoorCell`)."""
    block = Image.open(SPRITES / 'hallCanteen.png').convert('RGBA')
    hall = Image.open(SPRITES / 'hallBackground.png').convert('RGBA')
    out = Image.new('RGBA', block.size, (0, 0, 0, 0))
    out.alpha_composite(block)
    out.alpha_composite(block, (96, 48))

    def mask_of(points):
        mask = Image.new('L', block.size, 0)
        ImageDraw.Draw(mask).polygon(points, fill=255)
        return mask

    face_top = 2.48
    front = [screen(5.0, 4, 0), screen(7.0, 4, 0), screen(7.0, 4, face_top), screen(5.0, 4, face_top)]
    patch = Image.new('RGBA', block.size, (0, 0, 0, 0))
    patch.paste(hall, (-384, 0))
    out.paste(patch, (0, 0), mask_of(front))

    roof_at = 2.8
    roof = Image.new('RGBA', block.size, (0, 0, 0, 0))
    roof.paste(out, (-48, -24))
    mask = Image.new('L', block.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [screen(4.5, -0.3, roof_at), screen(5.5, -0.3, roof_at), screen(5.5, 4.0, roof_at), screen(4.5, 4.0, roof_at)],
        fill=255,
    )
    draw.polygon(
        [
            screen(4.5, 4.0, roof_at),
            screen(5.5, 4.0, roof_at),
            screen(5.5, 4.0, face_top - 0.05),
            screen(4.5, 4.0, face_top - 0.05),
        ],
        fill=255,
    )
    out.paste(roof, (0, 0), mask)
    out.save(SPRITES / 'hallCanteenWide.png', optimize=True)
    return out.size


if __name__ == '__main__':
    print('hallBackgroundWide.png', hall_background_wide())
    print('hallCanteenWide.png', hall_canteen_wide())
