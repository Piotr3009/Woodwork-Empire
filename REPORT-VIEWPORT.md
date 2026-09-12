# Hall and office viewport update

## Done

UI-01: The hall and office use the available viewport below the top bar. SVG artwork
scales uniformly without cropping; status lines and controls stay below the scene.
Pointer coordinates use the inverse SVG screen matrix so equipment dragging remains
aligned when the scene is scaled or centred.

## Validation

npm run check: lint, production build and 388 tests passed across 25 files.
A DOM regression test moves a workbench with 2x scale and nonzero viewport offsets.
Visual browser verification remains incomplete: Chromium was not installed and its
download timed out. Native browser layout and click targets still need visual review.

## Scope and existing contract

Piotr's request for full-screen hall and office replaces the fixed 1:1 display sizing
in CLAUDE.md section 3.11. Intrinsic SVG coordinates and the engine stay unchanged.
Existing SVG objects remain placeholder artwork. This change fills the available
viewport; it does not invoke the browser Fullscreen API.

## Reused paths and line balance

One shared CSS layout for both views; existing tileUnder handles drag coordinates.
Production code: 34 lines added, 13 removed. Tests: one regression test added and one
description updated. No duplicate renderer or simulation path.
