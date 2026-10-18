# Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
#
# This file is proprietary and confidential. Unauthorised copying,
# modification, distribution or use of this file, in whole or in part,
# by any means including automated tools and AI systems, is strictly
# prohibited without prior written permission from Skylon Development Ltd.

# The pieces a hall longer than forty metres is laid of (CLAUDE.md T31 2.7; docs/art/SPRITES.md 9.9):
#
#   public/sprites/hallBackgroundLong.png     ten metres of the hall, RGBA
#   public/sprites/hallBackgroundEnd.png      the end of the hall, RGBA
#   public/sprites/hallBackgroundGround.png   the ground round the hall, RGB
#
# Nothing is painted here, and nothing is scaled. Every piece is cut out of hallBackgroundDeep.png,
# pixel for pixel, at the place it has in that picture:
#
# - the long piece is the hall from x 28 to 39 at every depth: its floor, its rear wall and its top,
#   and its front kerb, the first metre coming in from nothing so that the join with what is under
#   it does not show. The painted floor stops at
#   x 39.06, where the kerb under the end of the hall begins, so the piece stops at 39 and not at
#   40, and its feathered metre is 28 to 29: laid ten metres further along than the one before, it
#   comes in over floor that is there and covers the kerb under the end of the one before it;
# - the end is everything of the hall from x 39 on: the kerb under the end, the end of the rear wall
#   and of its top, and the corner of the front kerb, coming in over the metre before it (38 to 39),
#   which is the last long piece's last metre and the same metre of the picture, so the two meet as
#   they were drawn;
# - the ground is a piece of the flat ground the picture is painted on outside the hall, one step
#   of the hall's growth (480 by 240), which the game lays everywhere the longer scene shows past
#   the 800 m2 picture, under the long pieces and the end. The flat ground is left out of those
#   two, which keeps only the hall itself, and the ground piece is what shows round it.
#
# On the wall and above it a piece is cut along the screen's upright, where the wall at x stands;
# on the floor and below it along the floor's own x. The two meet on the foot of the rear wall,
# which a step of ten metres along the hall lays on itself. Run it again when hallBackgroundDeep.png
# is made again:
#
#   python3 scripts/hall-wide.py
#   python3 scripts/hall-deep.py
#   python3 scripts/hall-long.py        (needs Pillow and numpy)
#   npm run sprites:manifest

import sys
from pathlib import Path

import numpy as np
from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'

# The hall's level (v113): today's hall is level 1 and its files keep their names; the art side's
# levels 2 to 6 (P2) are cut from their own three layers into files named `<layer>.levelN.png`, so
#
#   python3 scripts/hall-long.py 3
#
# cuts level 3. With no level given, level 1, as it always was.
LEVEL = int(sys.argv[1]) if len(sys.argv) > 1 else 1


def named(name):
    """The file of a layer at the hall's level."""
    return SPRITES / (f'{name}.png' if LEVEL == 1 else f'{name}.level{LEVEL}.png')

# The projection of docs/art/SPRITES.md 9.8 on the 2x canvas: world (0, 0, 0) at 1080, 288.
ORIGIN_X, ORIGIN_Y = 1080, 288
CUT_FROM, FEATHER, CUT_TO = 28.0, 1.0, 39.0
STEP = (480, 240)


def along(width, height):
    """For every pixel, how far along the hall it is: the wall's x on the wall and above it, the
    floor's x on the floor and below it."""
    px, py = np.meshgrid(np.arange(width) + 0.5, np.arange(height) + 0.5)
    u = (px - ORIGIN_X) / 48
    v = (py - ORIGIN_Y) / 24
    floor_x, floor_y = (u + v) / 2, (v - u) / 2
    return np.where(floor_y < 0, u, floor_x)


def cropped(image, alpha):
    """The picture with this alpha, cut to the box of what it holds, the box on even pixels so it
    lands on whole pixels of the game's 1x. Returns the piece and its top left corner."""
    rgba = image.convert('RGBA')
    rgba.putalpha(Image.fromarray(alpha))
    left, top, right, bottom = rgba.getchannel('A').getbbox()
    left, top = left - left % 2, top - top % 2
    right, bottom = right + right % 2, bottom + bottom % 2
    return rgba.crop((left, top, right, bottom)), (left, top)


def hall_long():
    deep = Image.open(named('hallBackgroundDeep')).convert('RGB')
    width, height = deep.size
    x = along(width, height)

    # The flat ground the picture is painted on outside the hall is left out of both: the ground
    # piece is laid under them, so a feathered metre never lies over ground, where its rounding
    # would draw a line a level darker than the ground on either side of it.
    flat_colour = deep.getpixel((width - 1, 0))
    flat = np.all(np.asarray(deep) == np.array(flat_colour, dtype=np.uint8), axis=2)
    ramp = np.clip((x - CUT_FROM) / FEATHER, 0, 1)
    long_alpha = np.where((x < CUT_TO) & ~flat, np.rint(ramp * 255), 0).astype(np.uint8)
    # The end comes in over the last metre of the last long piece, which is the same metre of the
    # picture (x 38 to 39), so the two never meet on a hard edge each: drawn one by one and scaled,
    # two hard edges side by side let the ground show through along the join.
    end_ramp = np.clip((x - (CUT_TO - FEATHER)) / FEATHER, 0, 1)
    end_alpha = np.where(~flat, np.rint(end_ramp * 255), 0).astype(np.uint8)
    piece, piece_at = cropped(deep, long_alpha)
    end, end_at = cropped(deep, end_alpha)

    # The ground: one step of the hall's growth from the top right of the picture, which is all
    # flat ground over the far end of the rear wall. It must be one colour, or it cannot be laid
    # edge to edge.
    ground = deep.crop((width - STEP[0], 0, width, STEP[1]))
    colours = ground.getcolors()
    if colours is None or len(colours) != 1 or colours[0][1] != flat_colour:
        raise SystemExit('the ground is not one colour: the picture asks for another cut')

    piece.save(named('hallBackgroundLong'), optimize=True)
    end.save(named('hallBackgroundEnd'), optimize=True)
    ground.save(named('hallBackgroundGround'), optimize=True)
    return {
        named('hallBackgroundLong').name: (piece.size, piece_at),
        named('hallBackgroundEnd').name: (end.size, end_at),
        named('hallBackgroundGround').name: (ground.size, colours[0][1]),
    }


if __name__ == '__main__':
    for name, figures in hall_long().items():
        print(name, *figures)
