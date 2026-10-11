# What was edited in this pack

The art side's pack 1 of 09.10.2026 (five sanders in two views and three cutter cases) was pushed
by Piotr into the root of the repo in commit 46713f3. Turn 30 (CLAUDE.md T30 2.1) moved it here as
it was delivered, with two exceptions:

- **The thirteen pictures** went into the game: `sprites-2x/0/sander.<class>.png` to
  `public/sprites/sander.<class>.png`, `sprites-2x/90/sander.<class>.png` to
  `public/sprites/sander.<class>.r.png`, and the three `sprites-2x/0/cutters<Kind>.standard.png`
  to `public/sprites/`, byte for byte. `sprites-2x/` itself is gone.
- **The game writes no em or en dash anywhere** (a standing rule of the project), so in five text
  files of the pack each one was replaced by a colon or a comma, and nothing else of the file was
  touched: `HANDOFF-CLAUDE.md` (4), `README.md` (4), `camera-QA.md` (1), `source/README.md` (1)
  and `source/validate.py` (1).

`SHA256SUMS.txt` is the art side's own and was not edited, so its lines for those five files no
longer match them, and its thirteen `sprites-2x/` lines name the files where they stood: each of
the thirteen in `public/sprites/` matches its line. One more line did not match as delivered, in
commit 46713f3 already: `source/brief.txt`, which nobody here touched. Every other file of the
pack matches its line.
