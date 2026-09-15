# Report: Turn 13, group B5, chrome and guidance

Branch `t13-b5` from `9dcfc9a` (phase A, T13-A2). Files owned: `src/ui/topbar.ts`,
`src/ui/dayEnd.ts`, `src/ui/modal.ts`, `src/ui/laptop.ts`, `src/ui/tips.ts`, `src/ui/settings.ts`,
`src/ui/patch.ts`, `src/ui/eventModal.ts`, `src/engine/efficiency.ts`, `src/engine/warnings.ts`,
and the tests that match them by name. Sections 3.1 (side menu, colour audit), 3.5, 3.22, 3.18
(the day end flow) and 3.23 of CLAUDE.md T13.

## 1. Done

| Task | Commit | What went in | Proved by |
|---|---|---|---|
| T13-B5a Side menu, colour audit, settings | this commit | The side menu carries its own close control (`.menu-close`, `data-do="closeMenu"`) in `renderMenu`, over the click outside phase A wired; the gear (`.gear`, `data-do="openSettings"`) joins the push block of the top bar; the day end summary's In, Out and Net lines go through `signedFigure(signedMoney())`, which was the one unsigned figure the audit found in the files of this group; `renderSettings` is the one row of two chips and a hint, and nothing else. Where: `src/ui/topbar.ts`, `src/ui/dayEnd.ts`, `src/ui/settings.ts`. | `tests/ui/menu.test.ts` (open, click outside, closed; open, close control, closed; a click on the menu keeps it); `tests/ui/modal.test.ts` (the helper's three cases; the walk over every tab, every folder and every class card of the catalogue, the day end summary of a day that cost money, and the top bar's day figure in the red and in the black: no signed figure outside `.good` or `.bad`); `tests/ui/settings.test.ts` (the lit chip follows the setting; the gear opens the folder modal with its bubble; off switches `state.settings.tips` and every `renderTip` goes empty with nothing dismissed; on brings the undismissed bubbles back); `tests/ui/summary.test.ts` (the three signed rows) |

## 2. Numbers chosen

None so far. Every figure this group prints is the engine's.

## 3. Notes for phase C

### `src/ui/app.ts`

1. `READING_MODALS` (line 1039): add `'settings'`. Opening the settings on a stopped clock starts
   the clock at 1x tonight, because the list is `['workPlan', 'shopping', 'company']`; the
   settings act on nothing in the world and should not start time.

   ```ts
   const READING_MODALS: ModalId[] = ['workPlan', 'shopping', 'company', 'settings'];
   ```

### `src/ui/styles.css`

```css
.menu-close {
  background: none;
  border: 0;
  color: #f5efe2;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  position: absolute;
  right: 6px;
  top: 6px;
}

.menu-pop {
  position: relative; /* if it is not already: the cross sits in its top right corner */
}

.gear {
  font-size: 18px;
  line-height: 1;
  min-width: 40px;
  padding: 0 8px;
}

.settings .hint {
  margin-top: 8px;
}
```

## 4. Foreign test edits

None.

## 5. Art requested

Nothing drawn so far. The frame table of 3.23 follows in T13-B5d.

## 6. Not done

1. **Nothing moves into the settings from the autosave.** Turn 11's autosave (T11 3.2) has no
   control: the game is written down at every morning, every purchase, every hire, every accepted
   enquiry and every closed modal, never more than once a second, and the player was never asked.
   The summary cadence (`cadenceControl`, T4 3.6) is not an autosave setting; it is how often the
   evening summary is shown, and it stays where Piotr put it, on the summary and in the Menu.
   3.22 says "Tips on and off and nothing else tonight", and that is what the modal has.

## 7. Cross check notes

Filled in as the tasks land.
