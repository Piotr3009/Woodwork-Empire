# Sounds

The recordings of `docs/art/REQUESTS-T19.md` 1 go here, named exactly as that list names them:
`door.ogg`, `tableSaw.ogg`, `extractor.ogg`, `hammer.ogg`, `drill.ogg`, `sander.ogg`,
`sprayBooth.ogg`.

Nothing in the repository ships a recording. Until a file is here the sound engine
(`src/ui/sound.ts`) plays a quiet synthesised stand in for that event, so every hook can be heard
in the build. The engine looks for the file first and falls back on its own; no code change is
needed when a recording lands.
