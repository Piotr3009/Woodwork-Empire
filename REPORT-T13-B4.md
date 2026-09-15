# Report: Turn 13, phase B, group B4 (machines and the hall)

Branch `t13-b4` from `9dcfc9a` (phase A, T13-A2). Sections 3.1 (the class cards), 3.11, 3.12,
3.13, 3.17, 3.19 and 3.21 of CLAUDE.md T13, plus the character frame list of 3.23. Written as the
work went, one commit per task; phase C consolidates it into `REPORT-T13.md`.

---

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B4a Five classes everywhere, the spindle moulder, the badges | this commit | One layout function `classCard` in `src/ui/machine.ts` for every class card of every family: effects (output, dust, extraction and air needed, life, the class's own effects: what a fan pulls and holds, what a compressor gives, what a rack holds, that a machine with a drop takes a gate), a gap, costs (price, delivery, power, the insurance it adds a year, the floor), a gap, the description in the body font; every signed line through `signedFigure`; the badge and frame colour of the class from `CLASS_BADGE` on every card and on the Owned tile (`classBadge`, `classFrame`, a `--class-colour` custom property). `insuranceAddedYearly(price)` in `src/engine/machines.ts`. The spindle moulder's classes and the pallet truck draw as the placeholder in the hall (`objectArt`) and on the sprite check page (`PLACEHOLDER_SPRITES`, `placeholderKindFor` in `src/render/sprites.ts`). Verified: the two kitchens grey without a spindle moulder through `kitBlockFor`; `TIMBER_BRANCH_MIN_SPINDLE_CLASS` is read by nothing. | `tests/ui/machine.test.ts` (effects then costs then description on every card of every family; the badge and frame; every signed line through the helper), `tests/engine/variants.test.ts` (every ladder family has the five classes in `CLASS_ORDER` with a badge, no class carries a dust figure), `tests/engine/catalog.test.ts` (the kitchens need the spindle moulder; the timber constant is unread), `tests/ui/spriteCheck.test.ts`, `tests/render/hall.test.ts` |

---

## 2. Numbers chosen

None yet.

---

## 3. Notes for phase C

### `src/engine/index.ts`

- Export `insuranceAddedYearly` from `./machines` (imported by module path in `src/ui/machine.ts`
  with the `T13-C1` comment).

### `src/ui/styles.css`

The class badge and frame (T13-B4a). The colour comes from `CLASS_BADGE` on the element as
`--class-colour`, so the CSS carries no colour of its own:

```css
.badge-class {
  background: var(--class-colour, var(--panel));
  border-color: var(--class-colour, var(--border));
  color: var(--page);
  margin-right: 4px;
}
.tile.class-used,
.tile.class-budget,
.tile.class-standard,
.tile.class-pro,
.tile.class-industrial {
  border-color: var(--class-colour);
  box-shadow: inset 0 0 0 1px var(--class-colour);
}
.tile.is-owned.class-used,
.tile.is-owned.class-budget,
.tile.is-owned.class-standard,
.tile.is-owned.class-pro,
.tile.is-owned.class-industrial {
  box-shadow: inset 0 0 0 1px var(--class-colour), 0 0 0 2px var(--good);
}
.card-effects,
.card-costs {
  margin-bottom: 10px;
}
.card-costs {
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.card-description {
  border-top: 1px solid var(--border);
  padding-top: 6px;
}
.sprite-shot.is-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
```

---

## 4. Foreign test edits

None.

---

## 5. Art requested

In the style of `docs/art/REQUESTS-T13.md`; phase C merges these into it.

- **Spindle moulder, five classes** (`spindleMoulder.used` to `spindleMoulder.industrial`), on
  the machine templates: drawn tonight as `placeholder('spindleMoulder.<class>', size, { dimetric:
  true })` in the hall and on the sprite check page. Footprints off the ladder: used, budget and
  standard 2 by 1 by 1 m; pro 3 by 1 by 1 m; industrial 3 by 2 by 1.2 m. The industrial one
  heavier, with a power feed.
- **Pallet truck** (`palletTruck`), 1 by 1 by 1 m, a handling item like the forklift: drawn tonight
  as `placeholder('palletTruck', size, { dimetric: true })`.

---

## 6. Not done

Nothing yet.

---

## 7. Cross check notes

- The class cards read the dust off `DUST_OUTPUT_M3_PER_HOUR` by family and nothing else; the
  variants test now asserts that no class of any ladder carries a `dust` field (10.1).
- The insurance line on a card is `price * PROPERTY_INSURANCE_RATE_YEARLY` through
  `insuranceAddedYearly`; B1's `propertyPremiumYearly` reads the same constant over the hall, so
  the Insurance tab and the sum of the cards agree by construction (10.2).
