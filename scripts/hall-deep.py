# The background of a unit that has grown a second time (v82; docs/art/SPRITES.md 9.8):
#
#   public/sprites/hallBackgroundDeep.png   the hall at 40 by 20 m, 3120 by 1848, RGB
#
# Nothing is painted here. It is made of hallBackgroundWide.png and nothing else: the floor carried
# on ten metres towards the camera, five metres at a time, and the left wall carried on with it
# in the rear wall's own blockwork, turned to face the other way and toned to the left wall's
# shade. The roller shutter, the door and the WC stay where they were painted. The origin moves
# ten metres to the right on the canvas, because the floor now runs ten metres further to the
# left of it. Run it again when hallBackgroundWide.png is made again:
#
#   python3 scripts/hall-wide.py
#   python3 scripts/hall-deep.py        (needs Pillow)
#   npm run sprites:manifest

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageOps, ImageStat

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'

LENGTH, DEPTH_BUILT, DEPTH = 40, 10, 20
# The projection of docs/art/SPRITES.md 9.2 on the 2x canvas, with the origin ten metres along.
SHIFT_X = (DEPTH - DEPTH_BUILT) * 48
ORIGIN_X, ORIGIN_Y = 600 + SHIFT_X, 288
WALL_TOP, WALL_THICK, KERB = 3.5, 0.9, 80
# Where the painted floor stops and its kerb begins, short of the tenth metre.
PAINTED = 9.06


def screen(x, y, z=0.0):
    return (ORIGIN_X + (x - y) * 48, ORIGIN_Y + (x + y) * 24 - z * 48)


def polygon_mask(size, polygons, fill=255):
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    for points in polygons:
        draw.polygon(points, fill=fill)
    return mask


def feathered(size, shapes_at, start, feather, steps=24):
    """A mask that comes in over `feather` metres from `start`: `shapes_at(edge)` is the list of
    polygons of everything from that edge on."""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    for index in range(steps + 1):
        for points in shapes_at(start + feather * index / steps):
            draw.polygon(points, fill=int(255 * index / steps))
    return mask


def shifted(image, dx_m, dy_m):
    """The picture moved by so many metres along the hall and towards the camera."""
    out = Image.new('RGB', image.size, image.getpixel((4, 4)))
    out.paste(image, (int(48 * (dx_m - dy_m)), int(24 * (dx_m + dy_m))))
    return out


def floor_from(edge, x_from=0.0, x_to=LENGTH, depth=DEPTH_BUILT):
    """The floor from `edge` to the front, with the kerb under its front edge and under its end."""
    near, corner, far = screen(x_from, depth), screen(x_to, depth), screen(x_to, edge)
    shapes = [[screen(x_from, edge), far, corner, near]]
    shapes.append([near, corner, (corner[0], corner[1] + KERB), (near[0], near[1] + KERB)])
    if x_to >= LENGTH:
        shapes.append([far, corner, (corner[0], corner[1] + KERB), (far[0], far[1] + KERB)])
    return shapes


def hall_background_deep():
    wide = Image.open(SPRITES / 'hallBackgroundWide.png').convert('RGB')
    ground = wide.getpixel((4, 4))
    width = int(screen(LENGTH, 0)[0]) + 120
    height = int(screen(LENGTH, DEPTH)[1]) + 120
    base = Image.new('RGB', (width, height), ground)
    base.paste(wide, (SHIFT_X, 0))
    out = base.copy()
    size = out.size

    # 1. The floor the copies are taken from, with what is painted on it beside the left wall (the
    #    two yellow lines at the shutter, the shade at the door) painted out by the floor two and
    #    a half metres further along, so none of it is laid down again every five metres. The hall
    #    itself keeps them.
    clean = base.copy()
    along = feathered(
        size,
        lambda edge: [[screen(0.02, 2.2), screen(edge, 2.2), screen(edge, PAINTED), screen(0.02, PAINTED)]],
        2.3,
        -0.6,
    )
    down = feathered(
        size,
        lambda edge: [[screen(0.02, edge), screen(2.3, edge), screen(2.3, PAINTED), screen(0.02, PAINTED)]],
        2.2,
        0.3,
    )
    clean.paste(shifted(base, -2.5, 0), (0, 0), ImageChops.darker(along, down))
    # The yellow line at the near side of the shutter lies on the last of the painted floor, where
    # the first copy comes in: that corner of the hall is kept as it was painted.
    kept = ImageOps.invert(
        feathered(
            size,
            lambda edge: [[screen(0.0, 7.3), screen(edge, 7.3), screen(edge, PAINTED - 0.09), screen(0.0, PAINTED - 0.09)]],
            2.2,
            -0.7,
        )
    )

    # 2. The floor, five metres at a time. The painted floor stops 0.92 m short of the tenth metre,
    #    where its kerb begins, so each copy comes in over a metre and a half of floor that is
    #    there and is whole before the kerb of the one before it: no seam and no kerb left behind.
    slice_from, feather, step = 2.5, 1.5, 5.0
    for count in (1, 2):
        mask = feathered(
            size,
            lambda edge: floor_from(edge, depth=DEPTH_BUILT + step * count),
            slice_from + step * count,
            feather,
        )
        if count == 1:
            mask = ImageChops.darker(mask, kept)
        out.paste(shifted(clean, 0, step * count), (0, 0), mask)

    # 3. The left wall, ten metres more of it: the rear wall's blockwork between 22 and 32 m,
    #    mirrored, which turns a wall that runs along the hall into one that runs towards the
    #    camera, and toned to the shade the left wall is painted in. It starts at the shutter's
    #    frame, so the end the wall was painted with and the kerb under it are under the new wall.
    taken_from, joins_at, top, cap = 22.0, 9.15, WALL_TOP + 0.1, 0.2
    rear = polygon_mask(
        size,
        [[screen(taken_from, 0, 0.6), screen(taken_from + 10, 0, 0.6), screen(taken_from + 10, 0, 3.2), screen(taken_from, 0, 3.2)]],
    )
    left = polygon_mask(size, [[screen(0, 4.75, 2.5), screen(0, 5.6, 2.5), screen(0, 5.6, 3.2), screen(0, 4.75, 3.2)]])
    rear_tone = ImageStat.Stat(base, rear).mean
    left_tone = ImageStat.Stat(base, left).mean
    bands = [
        band.point(lambda value, ratio=left_tone[index] / rear_tone[index]: int(min(255, value * ratio)))
        for index, band in enumerate(base.split())
    ]
    # A point (0, 10 + t, z) of the left wall is the mirror of the rear wall's (taken_from + t, 0, z):
    # the two screen x add up to `centre`, and the left one is 240 - 24 * taken_from lower.
    centre = 2 * ORIGIN_X - SHIFT_X + 48 * taken_from
    turned = Image.new('RGB', size, ground)
    turned.paste(ImageOps.mirror(Image.merge('RGB', bands)), (int(centre - width + 1), int(SHIFT_X / 2 - 24 * taken_from)))
    wall = polygon_mask(
        size,
        [
            [screen(0, joins_at), screen(0, DEPTH), screen(0, DEPTH, top), screen(0, joins_at, top)],
            [
                screen(0, joins_at, top),
                screen(0, DEPTH, top),
                screen(-cap, DEPTH, top),
                screen(-cap, joins_at, top),
            ],
        ],
    )
    out.paste(turned, (0, 0), wall)

    # 4. The end of the left wall, where it stops at the front of the hall: the end it was painted
    #    with at ten metres, moved to twenty, with the foot of it and the kerb under it.
    #    The painted floor stops short of the wall's end, and the kerb is painted across the foot
    #    of the wall there: everything under the line of the floor's front edge comes with it.
    at, back, front = DEPTH - 0.1, -0.6, 0.05
    edge = PAINTED + DEPTH - DEPTH_BUILT
    left, right = screen(-1.0, edge), screen(0.4, edge)
    end = polygon_mask(
        size,
        [
            [screen(back, at), screen(front, at), screen(front, at, top), screen(back, at, top)],
            [left, right, (right[0], right[1] + 70), (left[0], left[1] + 70)],
        ],
    )
    out.paste(shifted(base, 0, DEPTH - DEPTH_BUILT), (0, 0), end)

    out.save(SPRITES / 'hallBackgroundDeep.png', optimize=True)
    return out.size


if __name__ == '__main__':
    print('hallBackgroundDeep.png', hall_background_deep())
