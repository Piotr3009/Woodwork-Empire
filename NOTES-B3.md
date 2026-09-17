# Notes from B3 (the desk) for phase C

Everything here is a change B3 needs in a file Turn 13 froze for phase B, or a file outside B3's
own list. Each one is written out exactly as it should be applied. Nothing in this file has been
applied by B3.

## 1. `src/ui/styles.css`: the two reputation rules (T19-B3a, CLAUDE.md T19 2.9)

Phase A left `.reputation-total` and `.reputation-week` as empty rules at the end of the Turn 19
block. The markup now uses both. Fill them with:

```css
/* 2.9 The reputation column's headline: the total, with the week's net beside it. */
.reputation-total .ledger-total-label {
  max-width: 55%;
}

.reputation-week {
  color: var(--sheet-dim);
  font-style: italic;
}
```

The sheet reads correctly without them (the figure already wears `.ledger-total-figure` and the
week's net already sits inside `.ledger-sum`); these two only keep the longer label off the figure
and set the week's net apart from the two columns of arithmetic beside it.

## 2. `src/ui/styles.css`: the sound controls (T19-B3c, CLAUDE.md T19 2.10)

Phase A left `.sound-row` and `.sound-volume` empty. Fill them with:

```css
/* 2.10 The sound controls in Settings. */
.sound-row .row-action {
  gap: 6px;
}

.sound-volume .row-action {
  gap: 10px;
}

.sound-volume input[type='range'] {
  accent-color: var(--ink);
  width: 140px;
}

.sound-volume .row-figure {
  font-variant-numeric: tabular-nums;
  min-width: 42px;
  text-align: right;
}
```

`.row-figure` is a new class name in `settings.ts`; if phase C would rather not add one, the span
can carry `.hint` instead and the last rule goes.

## 3. `src/ui/app.ts`: the mute's click (T19-B3c, CLAUDE.md T19 2.10)

There is no route for the Settings mute today. In the `data-do` switch, directly after
`case 'setTips':`, add:

```ts
    case 'setSound':
      // The mute, off the same two chips the tips row uses (CLAUDE.md T19 2.10).
      dispatch({ type: 'SET_SOUND', muted: element.dataset.muted === '1' });
      return;
```

## 4. `src/ui/app.ts`: the volume's slider (T19-B3c, CLAUDE.md T19 2.10)

There is no route for the Settings volume today. In `runInput`, beside the other `data-field`
branches, add:

```ts
    if (field === 'soundVolume') {
      // The master volume, nought to one; the slider counts in whole percent (CLAUDE.md T19 2.10).
      dispatch({ type: 'SET_SOUND', volume: Number(target.value) / 100 });
      return;
    }
```

`driveSound` already pushes `state.settings.sound` into the engine every frame, so nothing else is
needed for the change to be heard.

## 5. `src/ui/app.ts`: the laptop's Add as next (T19-B3b, CLAUDE.md T19 2.12)

There is no route for `queueTaskNext` today, although `QUEUE_TASK_NEXT` is already handled in
`game.ts` and `queueTaskNext` already exists in `tasks.ts`. In the `data-do` switch, directly
after `case 'doTheseTasks':`, add:

```ts
    case 'queueTaskNext':
      // Behind the one he is on, without putting that one down (CLAUDE.md T19 2.12).
      dispatch({ type: 'QUEUE_TASK_NEXT', taskId: id });
      return;
```

`id` is the `element.dataset.id` the neighbouring cases already read.

## 6. `src/engine/constants.ts`: the Settings tip (T19-B3c)

`TIPS.settings` still reads "Tips on or off. Nothing else here tonight." It is a lie the moment
the sound rows land. Suggested replacement, in the same voice:

```ts
  settings: 'Tips on or off, and the workshop\'s own noise: a volume, and a mute for a quiet room.',
```

## 7. `src/ui/modal.ts`: `taskStartAction` (T19-B3b)

This file is not on B3's list and B3 edited it anyway, because `taskStartAction` is the one
control a laptop task row carries and both of its callers (`src/ui/laptop.ts` and
`src/ui/drawings.ts`) are B3's. Writing the new button anywhere else would have made two code
paths for one button. The change is confined to that one function plus one module constant
(`QUEUED_REASON`) above it; nothing else in `modal.ts` was touched. If another agent has also
edited `modal.ts`, the two changes should merge cleanly, but this is where to look first.

## Numbers and wordings B3 chose [TUNE]

- **2.9, the label over the total:** `the total to date`. The brief fixes the figure, not the
  words above it; this pair of words is what stops it being read as a week.
- **2.9, the week's net:** `−5 this week` / `+0 this week`, in its own `[data-sum="week"]` span
  beside `[data-sum="total"]`, which holds the whole `Reputation 40` off `companyTotals`.
- **2.9, keeping the older weeks:** the head now says `What moved it this week`, and the weeks
  before it keep their `Week N` labels under it. The brief takes away the carried over row and the
  misleading headline; it does not ask for the history that Turn 15 built the sheet around.
- **2.12, the already queued row:** `Next in the queue`, a reason label with no button, so a
  second press of `Add as next` is never a dead click.
- **2.12, when `Add as next` is offered:** only on the "Busy with X" refusal, never on any other.
  See the report for why.
- **2.10, the volume slider:** 0 to 100 in steps of 5, so one drag is twenty dispatches and not
  two hundred.
- **2.10, the one shot gaps:** the hammer and the drill now read `HAMMER_EVERY_SECONDS` 3 and
  `DRILL_EVERY_SECONDS` 4 (phase A's constants, which were dead until now) through a new optional
  `gapMs` on `SoundSpec`; every other one shot keeps `SOUND_ONE_SHOT_GAP_MS` 1,000.
