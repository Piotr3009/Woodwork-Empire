"""L3 review boards and in-place driving GIFs from untouched final RGBA assets.

Input: sprites-2x/{0,90}/windowPallet.standard.png and
frames/{drive,driveLoaded}/{sw,se,nw,ne}/00.png through 05.png.
Every GIF has six explicit frames and a 750 ms loop with one common palette.
Only preview canvases receive a background, typography or dividing rules.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path

import numpy as np
from PIL import GifImagePlugin, Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DEFAULT_OUTPUT = ROOT / 'l3-output'
BACKGROUND = '#263237'
INK = '#F3F1E8'
MUTED = '#B5BDB6'
RULE = '#48575A'
ACCENT = '#A9C2AA'
DIRS = ('sw', 'se', 'nw', 'ne')
DIRECTION_NAMES = {
    'sw': 'SW · lewo w dół (+Y)',
    'se': 'SE · prawo w dół (+X)',
    'nw': 'NW · lewo w górę (−X)',
    'ne': 'NE · prawo w górę (−Y)',
}
VARIANTS = {
    'drive': ('pusty', 'Wózek pusty'),
    'driveLoaded': ('z-paleta', 'Wózek z paletą 10 okien'),
}
DURATIONS = [120, 130] * 3
DEFAULT_CELL_SIZE = (272, 256)


def font(size: int, bold: bool = False):
    filename = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    candidates = [HERE / 'fonts' / filename,
                  ROOT / 'recovered' / 'line1010-l2-src' / 'fonts' / filename,
                  Path('/usr/share/fonts/truetype/dejavu') / filename]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    raise FileNotFoundError(f'Missing preview font: {filename}')


def text(draw, xy, value, size=24, bold=False, fill=INK):
    draw.text(xy, value, font=font(size, bold), fill=fill)


def centered(draw, x, y, value, size=24, bold=False, fill=INK):
    face = font(size, bold)
    bounds = draw.textbbox((0, 0), value, font=face)
    draw.text((x - (bounds[2] - bounds[0]) / 2, y), value, font=face, fill=fill)


def atomic_write(raw: bytes, destination: Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + '.tmp')
    with temporary.open('wb') as handle:
        handle.write(raw)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, destination)


def read_rgba(path: Path, size: tuple[int, int], output: Path):
    raw = path.read_bytes()
    with Image.open(io.BytesIO(raw)) as source:
        source.load()
        if source.mode != 'RGBA' or source.size != size:
            raise ValueError(f'{path}: expected RGBA {size}; got {source.mode} {source.size}')
        frame = source.copy()
    provenance = dict(path=str(path.relative_to(output)), sizePx=list(size),
                      sha256=hashlib.sha256(raw).hexdigest())
    return frame, provenance


def load_sources(output: Path):
    frames, pallets, sources, sizes = {}, {}, [], {}
    for variant in VARIANTS:
        sheet_json = output / 'sheets' / f'vehicle.forklift.{variant}.sheet.json'
        size = DEFAULT_CELL_SIZE
        if sheet_json.exists():
            declared = json.loads(sheet_json.read_text())
            size = (int(declared['cellWidth']), int(declared['cellHeight']))
        sizes[variant] = size
        frames[variant] = {}
        for direction in DIRS:
            frames[variant][direction] = []
            for index in range(6):
                path = output / 'frames' / variant / direction / f'{index:02d}.png'
                frame, provenance = read_rgba(path, size, output)
                frames[variant][direction].append(frame)
                sources.append(provenance)
    for angle in (0, 90):
        path = output / 'sprites-2x' / str(angle) / 'windowPallet.standard.png'
        pallets[angle], provenance = read_rgba(path, (160, 172), output)
        sources.append(provenance)
    return frames, pallets, sources, sizes


def common_palette(frames: list[Image.Image]):
    # Equal samples from every phase avoid changes in quantization between
    # frames. Preserve small red/green lamps and other non-blue accents with
    # a reserved colour subset sampled before any downscaling.
    atlas = Image.new('RGB', (3 * 420, 2 * 380), BACKGROUND)
    accents = []
    for index, frame in enumerate(frames):
        sample = frame.copy()
        sample.thumbnail((420, 380), Image.Resampling.LANCZOS)
        atlas.paste(sample, ((index % 3) * 420, (index // 3) * 380))
        array = np.asarray(frame).astype(np.int16)
        spread = array.max(axis=2) - array.min(axis=2)
        blue = (array[:, :, 2] > array[:, :, 0] + 10) & (array[:, :, 2] > array[:, :, 1])
        vivid = (spread > 35) & (array.max(axis=2) > 70) & ~blue
        pixels = array[vivid].astype(np.uint8)
        accents.append(pixels[::max(1, len(pixels) // 24000)])
    base = atlas.quantize(colors=224, method=Image.Quantize.MEDIANCUT,
                          dither=Image.Dither.NONE)
    pixels = np.concatenate(accents, axis=0)
    if not len(pixels):
        pixels = np.asarray([[190, 45, 32], [54, 154, 77], [225, 176, 39]], dtype=np.uint8)
    accents_image = Image.fromarray(pixels[None, :, :])
    extra = accents_image.quantize(colors=26, method=Image.Quantize.MAXCOVERAGE,
                                   dither=Image.Dither.NONE)
    colours = base.getpalette()[:224 * 3] + extra.getpalette()[:26 * 3]
    for value in (BACKGROUND, INK, MUTED, RULE, ACCENT):
        colours.extend(int(value[i:i + 2], 16) for i in (1, 3, 5))
    palette = Image.new('P', (1, 1))
    palette.putpalette(colours + [0, 0, 0])
    return palette


def save_gif(frames: list[Image.Image], destination: Path):
    if len(frames) != 6 or len({frame.size for frame in frames}) != 1:
        raise ValueError('L3 GIF requires six equally sized frames')
    palette = common_palette(frames)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    stream = io.BytesIO()
    header, _ = GifImagePlugin.getheader(indexed[0], info={'loop': 0, 'version': b'89a'})
    for block in header:
        stream.write(block)
    # Explicit full-canvas blocks preserve even identical phases, which the
    # ordinary save_all API would otherwise merge into a longer single frame.
    for frame, duration in zip(indexed, DURATIONS):
        for block in GifImagePlugin.getdata(frame, duration=duration, disposal=2,
                                           include_color_table=False):
            stream.write(block)
    stream.write(b';')
    raw = stream.getvalue()
    with Image.open(io.BytesIO(raw)) as check:
        if check.n_frames != 6 or check.info.get('loop') != 0:
            raise OSError('Encoded GIF lost frames or its infinite loop')
        actual = []
        for index in range(6):
            check.seek(index)
            check.load()
            actual.append(check.info['duration'])
            if check.size != frames[0].size or check.disposal_method != 2:
                raise OSError('Encoded GIF changed canvas or disposal')
        if actual != DURATIONS or sum(actual) != 750:
            raise OSError('Encoded GIF does not have the required 750 ms cycle')
    atomic_write(raw, destination)
    return dict(file=destination.name, canvasPx=list(frames[0].size), frames=6,
                fps=8, durationsMs=DURATIONS, cycleMs=750, loop=0, disposal=2,
                commonGlobalPalette=True, vehicleInPlace=True,
                bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def save_png(image, destination):
    stream = io.BytesIO()
    image.save(stream, format='PNG', optimize=True)
    raw = stream.getvalue()
    with Image.open(io.BytesIO(raw)) as check:
        check.load()
        if check.size != image.size:
            raise OSError('Encoded PNG dimensions changed')
    atomic_write(raw, destination)
    return dict(file=destination.name, canvasPx=list(image.size),
                bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())


def paste_vehicle(board, source, center_x, top, box=(544, 512)):
    # Every phase uses the entire source cell, including its transparent
    # padding. Never crop to alpha or recenter the visible silhouette.
    scale = min(box[0] / source.width, box[1] / source.height)
    target = (round(source.width * scale), round(source.height * scale))
    display = source.resize(target, Image.Resampling.LANCZOS)
    board.paste(display, (round(center_x - target[0] / 2), top), display)


def individual(variant, direction, frames, destination):
    title = VARIANTS[variant][1]
    template = Image.new('RGB', (720, 800), BACKGROUND)
    draw = ImageDraw.Draw(template)
    text(draw, (44, 27), 'WOODWORK EMPIRE TYCOON', 17, True, MUTED)
    text(draw, (43, 62), title, 32, True)
    text(draw, (44, 111), DIRECTION_NAMES[direction], 23, fill=ACCENT)
    draw.line((44, 156, 676, 156), fill=RULE, width=2)
    draw.line((44, 725, 676, 725), fill=RULE, width=2)
    text(draw, (44, 739), 'L3 · 6 klatek · 8 kl./s · pętla 0,75 s', 19, fill=MUTED)
    text(draw, (44, 768), 'PODGLĄD · DO ZATWIERDZENIA', 16, True, ACCENT)
    boards = []
    for source in frames:
        board = template.copy()
        paste_vehicle(board, source, 360, 178)
        boards.append(board)
    result = save_gif(boards, destination)
    scale = min(544 / frames[0].width, 512 / frames[0].height)
    target_width = round(frames[0].width * scale)
    result.update(variant=variant, direction=direction,
                  sourceCellOriginPx=[round(360 - target_width / 2), 178],
                  sourceCellScale=scale)
    return result


def comparison(variant, directions, destination):
    template = Image.new('RGB', (1360, 1460), BACKGROUND)
    draw = ImageDraw.Draw(template)
    text(draw, (64, 28), 'WOODWORK EMPIRE TYCOON', 20, True, MUTED)
    text(draw, (62, 67), VARIANTS[variant][1], 46, True)
    text(draw, (64, 131), 'Cztery kierunki jazdy · stała kamera 2:1', 25, fill=MUTED)
    draw.line((64, 182, 1296, 182), fill=RULE, width=2)
    draw.line((64, 790, 1296, 790), fill=RULE, width=2)
    draw.line((64, 1390, 1296, 1390), fill=RULE, width=2)
    text(draw, (64, 1407), 'DO ZATWIERDZENIA · L3 · 6 klatek · 8 kl./s · widły w kierunku jazdy',
         22, fill=MUTED)
    placements = {}
    for index, direction in enumerate(DIRS):
        center = 360 + (index % 2) * 640
        top = 204 + (index // 2) * 600
        centered(draw, center, top, DIRECTION_NAMES[direction], 25, True, ACCENT)
        placements[direction] = (center, top + 56)
    boards = []
    for frame in range(6):
        board = template.copy()
        for direction in DIRS:
            center, top = placements[direction]
            paste_vehicle(board, directions[direction][frame], center, top)
        boards.append(board)
    result = save_gif(boards, destination)
    result.update(variant=variant, directionOrder=list(DIRS), phasesSynchronized=True)
    return result


def static_board(frames, pallets, destination):
    board = Image.new('RGB', (2448, 1970), BACKGROUND)
    draw = ImageDraw.Draw(board)
    text(draw, (64, 29), 'WOODWORK EMPIRE TYCOON', 24, True, MUTED)
    text(draw, (62, 77), 'L3 · paleta okien i wózek widłowy', 57, True)
    text(draw, (64, 154), 'Podgląd modeli 3D · kamera dimetryczna 2:1 · widoki bez lustrzanego odbicia',
         28, fill=MUTED)
    draw.line((64, 207, 2384, 207), fill=RULE, width=2)
    text(draw, (64, 280), 'Paleta · 10 okien', 42, True)
    text(draw, (66, 344), '2 × 1 × 1,75 m', 30, fill=ACCENT)
    text(draw, (66, 400), 'Folia ochronna i narożniki', 26, fill=MUTED)
    text(draw, (66, 439), 'Dwa fizyczne ustawienia', 26, fill=MUTED)
    for angle, center in ((0, 1120), (90, 1856)):
        centered(draw, center, 233, f'Widok {angle}°', 30, True, ACCENT)
        source = pallets[angle].resize((320, 344), Image.Resampling.LANCZOS)
        board.paste(source, (center - 160, 280), source)
    draw.line((64, 651, 2384, 651), fill=RULE, width=2)
    for row, variant in enumerate(VARIANTS):
        top = 674 + row * 622
        text(draw, (64, top), VARIANTS[variant][1], 38, True)
        for column, direction in enumerate(DIRS):
            center = 354 + column * 580
            centered(draw, center, top + 61, DIRECTION_NAMES[direction], 25, True, ACCENT)
            paste_vehicle(board, frames[variant][direction][0], center, top + 101)
        if row == 0:
            draw.line((64, top + 614, 2384, top + 614), fill=RULE, width=2)
    draw.line((64, 1917, 2384, 1917), fill=RULE, width=2)
    text(draw, (64, 1933), 'DO ZATWIERDZENIA · jazda w miejscu · stała kotwica we wszystkich klatkach i kierunkach',
         22, fill=MUTED)
    return save_png(board, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    frames, pallets, sources, sizes = load_sources(args.output)
    previews = args.output / 'previews'
    metadata = dict(schemaVersion=1, sourcePixelsUnmodified=True, sources=sources,
                    sourceCellSizesPx=sizes, previewBackground=BACKGROUND, outputs=[])
    destination = previews / 'L3-podglad-statyczny.png'
    metadata['outputs'].append(static_board(frames, pallets, destination))
    print(destination, flush=True)
    for variant, (slug, _) in VARIANTS.items():
        for direction in DIRS:
            destination = previews / f'L3-wozek-{slug}-{direction}.gif'
            metadata['outputs'].append(individual(variant, direction,
                                                  frames[variant][direction], destination))
            print(destination, flush=True)
        destination = previews / f'L3-wozek-{slug}-4-kierunki.gif'
        metadata['outputs'].append(comparison(variant, frames[variant], destination))
        print(destination, flush=True)
    atomic_write((json.dumps(metadata, indent=2, ensure_ascii=False) + '\n').encode(),
                 previews / 'l3-previews.json')


if __name__ == '__main__':
    main()
