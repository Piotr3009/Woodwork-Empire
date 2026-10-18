# Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
#
# This file is proprietary and confidential. Unauthorised copying,
# modification, distribution or use of this file, in whole or in part,
# by any means including automated tools and AI systems, is strictly
# prohibited without prior written permission from Skylon Development Ltd.

# The pieces a hall wider than twenty metres is laid of (PIOTR, 12.10: "and where is the width?";
# v95; docs/art/SPRITES.md 9.10):
#
#   public/sprites/hallBackgroundWider.png          seven metres more of the hall's depth, RGBA
#   public/sprites/hallBackgroundWiderFront.png     the front of the hall, RGBA
#   public/sprites/hallBackgroundLongWider.png      the same seven metres of a long piece, RGBA
#   public/sprites/hallBackgroundLongWiderFront.png the front of a long piece, RGBA
#   public/sprites/hallBackgroundEndWider.png       the same seven metres of the end, RGBA
#   public/sprites/hallBackgroundEndWiderFront.png  the front of the end, RGBA
#
# Nothing is painted here, and nothing is scaled. Every piece is cut out of hallBackgroundDeep.png,
# pixel for pixel, at the place it has in that picture, as scripts/hall-long.py cuts the long
# pieces:
#
# - a band is the hall from y 11 to 19 (the floor, and on the left wall its face and its top), the
#   first metre coming in from nothing so that the join with what is under it does not show; laid
#   seven metres further towards the camera than the one before, it comes in over floor that is
#   there and covers the front kerb of the one before it, which the painted floor begins at 19.06;
# - a front is everything of the hall from y 19 on (the front kerb, the end of the left wall, the
#   corner of the kerb under the hall's end), coming in over the metre before it (18 to 19);
# - the hall's own band and front run from the left wall to x 39, where its painted floor stops; a
#   long piece's are cut from x 28 to 39 as the long piece is, and the end's from x 38 on as the end
#   is, each coming in over its first metre along the hall too. The end's are laid at the end of the
#   hall whether it is longer than forty metres or not. The hall's own stop at 39 so that no part of
#   the kerb under its end lies under a long piece's: where a band comes in over the one before it,
#   both let some of what is under them through, and that kerb showed as a dark patch at x 39.
#
# The flat ground the picture is painted on outside the hall is left out of every piece: the ground
# piece of scripts/hall-long.py is laid under the whole scene. On the left wall and above it a
# piece is cut along the screen's upright, where the wall at y stands; on the floor and below it
# along the floor's own y. Run it again when hallBackgroundDeep.png is made again:
#
#   python3 scripts/hall-long.py
#   python3 scripts/hall-wider.py       (needs Pillow and numpy)
#   npm run sprites:manifest

import sys
from pathlib import Path

import numpy as np
from PIL import Image

SPRITES = Path(__file__).resolve().parent.parent / 'public' / 'sprites'

# The hall's level (v113): today's hall is level 1 and its files keep their names; the art side's
# levels 2 to 6 (P2) are cut from their own three layers into files named `<layer>.levelN.png`, so
#
#   python3 scripts/hall-wider.py 3
#
# cuts level 3. With no level given, level 1, as it always was.
LEVEL = int(sys.argv[1]) if len(sys.argv) > 1 else 1


def named(name):
    """The file of a layer at the hall's level."""
    return SPRITES / (f'{name}.png' if LEVEL == 1 else f'{name}.level{LEVEL}.png')

# The projection of docs/art/SPRITES.md 9.8 on the 2x canvas: world (0, 0, 0) at 1080, 288.
ORIGIN_X, ORIGIN_Y = 1080, 288
BAND_FROM, FEATHER, BAND_TO = 11.0, 1.0, 19.0
FRONT_FROM = 18.0
LONG_FROM, LONG_TO = 28.0, 39.0
END_FROM = 38.0


def floor_of(width, height):
    """For every pixel, how far along the hall and how far towards the camera it is: the floor's x
    and y on the floor and below it, and on the left wall and above it the wall's own y at that
    upright of the screen."""
    px, py = np.meshgrid(np.arange(width) + 0.5, np.arange(height) + 0.5)
    u = (px - ORIGIN_X) / 48
    v = (py - ORIGIN_Y) / 24
    floor_x, floor_y = (u + v) / 2, (v - u) / 2
    across = np.where(floor_x < 0, -u, floor_y)
    return floor_x, across


def ramp(values, start):
    return np.clip((values - start) / FEATHER, 0, 1)


def cropped(image, alpha):
    """The picture with this alpha, cut to the box of what it holds, the box on even pixels so it
    lands on whole pixels of the game's 1x. Returns the piece and its top left corner."""
    rgba = image.convert('RGBA')
    rgba.putalpha(Image.fromarray(alpha))
    left, top, right, bottom = rgba.getchannel('A').getbbox()
    left, top = left - left % 2, top - top % 2
    right, bottom = right + right % 2, bottom + bottom % 2
    return rgba.crop((left, top, right, bottom)), (left, top)


def hall_wider():
    deep = Image.open(named('hallBackgroundDeep')).convert('RGB')
    width, height = deep.size
    along, across = floor_of(width, height)
    flat_colour = deep.getpixel((width - 1, 0))
    flat = np.all(np.asarray(deep) == np.array(flat_colour, dtype=np.uint8), axis=2)
    hall = ~flat

    band = (across < BAND_TO) & hall
    band_ramp = ramp(across, BAND_FROM)
    front = hall
    front_ramp = ramp(across, FRONT_FROM)
    # The painted floor stops at x 39.06, where the kerb under the end of the hall begins.
    short_of_the_end = along < LONG_TO
    long_ramp = ramp(along, LONG_FROM)
    end_ramp = ramp(along, END_FROM)

    def alpha(mask, value):
        return np.where(mask, np.rint(value * 255), 0).astype(np.uint8)

    pieces = {
        'hallBackgroundWider': alpha(band & short_of_the_end, band_ramp),
        'hallBackgroundWiderFront': alpha(front & short_of_the_end, front_ramp),
        'hallBackgroundLongWider': alpha(band & short_of_the_end, np.minimum(band_ramp, long_ramp)),
        'hallBackgroundLongWiderFront': alpha(front & short_of_the_end, np.minimum(front_ramp, long_ramp)),
        'hallBackgroundEndWider': alpha(band, np.minimum(band_ramp, end_ramp)),
        'hallBackgroundEndWiderFront': alpha(front, np.minimum(front_ramp, end_ramp)),
    }
    made = {}
    for name, mask in pieces.items():
        piece, at = cropped(deep, mask)
        piece.save(named(name), optimize=True)
        made[named(name).name] = (piece.size, at)
    return made


if __name__ == '__main__':
    for name, figures in hall_wider().items():
        print(name, *figures)
