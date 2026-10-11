# Niezależne QA: L3

`exactProjectionVerified: true` · `technicalChecksPassed: true`

Kontrola korzysta z rzeczywistych siatek, zapisanych rastrów i wykonania vertex shadera na GPU. Nie tworzy ani nie poprawia obrazów.

Paleta 90° stosuje fizyczny obrót ujemny `(x,y,z) → (y,2−x,z)` zgodnie z briefem z 11.10. To inna konwencja niż dodatni obrót modułów L1/L2. Kierunki wózka: sw=+Y, se=+X, nw=−X, ne=−Y. Kotwica wózka jest wspólnym punktem podłogi, a nie środkiem sylwetki PNG.

| Plik | Minimalny margines | Dokładny rzut |
|---|---|---|
| `sprites-2x/0/windowPallet.standard.png` | 15 px | True |
| `sprites-2x/90/windowPallet.standard.png` | 15 px | True |
| `frames/drive/sw/00.png` | 16 px | True |
| `frames/drive/sw/01.png` | 16 px | True |
| `frames/drive/sw/02.png` | 16 px | True |
| `frames/drive/sw/03.png` | 16 px | True |
| `frames/drive/sw/04.png` | 16 px | True |
| `frames/drive/sw/05.png` | 16 px | True |
| `frames/drive/se/00.png` | 16 px | True |
| `frames/drive/se/01.png` | 16 px | True |
| `frames/drive/se/02.png` | 16 px | True |
| `frames/drive/se/03.png` | 16 px | True |
| `frames/drive/se/04.png` | 16 px | True |
| `frames/drive/se/05.png` | 16 px | True |
| `frames/drive/nw/00.png` | 12 px | True |
| `frames/drive/nw/01.png` | 12 px | True |
| `frames/drive/nw/02.png` | 12 px | True |
| `frames/drive/nw/03.png` | 12 px | True |
| `frames/drive/nw/04.png` | 12 px | True |
| `frames/drive/nw/05.png` | 12 px | True |
| `frames/drive/ne/00.png` | 12 px | True |
| `frames/drive/ne/01.png` | 12 px | True |
| `frames/drive/ne/02.png` | 12 px | True |
| `frames/drive/ne/03.png` | 12 px | True |
| `frames/drive/ne/04.png` | 12 px | True |
| `frames/drive/ne/05.png` | 12 px | True |
| `frames/driveLoaded/sw/00.png` | 14 px | True |
| `frames/driveLoaded/sw/01.png` | 14 px | True |
| `frames/driveLoaded/sw/02.png` | 14 px | True |
| `frames/driveLoaded/sw/03.png` | 14 px | True |
| `frames/driveLoaded/sw/04.png` | 14 px | True |
| `frames/driveLoaded/sw/05.png` | 14 px | True |
| `frames/driveLoaded/se/00.png` | 14 px | True |
| `frames/driveLoaded/se/01.png` | 14 px | True |
| `frames/driveLoaded/se/02.png` | 14 px | True |
| `frames/driveLoaded/se/03.png` | 14 px | True |
| `frames/driveLoaded/se/04.png` | 14 px | True |
| `frames/driveLoaded/se/05.png` | 14 px | True |
| `frames/driveLoaded/nw/00.png` | 12 px | True |
| `frames/driveLoaded/nw/01.png` | 12 px | True |
| `frames/driveLoaded/nw/02.png` | 12 px | True |
| `frames/driveLoaded/nw/03.png` | 12 px | True |
| `frames/driveLoaded/nw/04.png` | 12 px | True |
| `frames/driveLoaded/nw/05.png` | 12 px | True |
| `frames/driveLoaded/ne/00.png` | 12 px | True |
| `frames/driveLoaded/ne/01.png` | 12 px | True |
| `frames/driveLoaded/ne/02.png` | 12 px | True |
| `frames/driveLoaded/ne/03.png` | 12 px | True |
| `frames/driveLoaded/ne/04.png` | 12 px | True |
| `frames/driveLoaded/ne/05.png` | 12 px | True |

Fazy animacji: 0/6…5/6. Model fazy 1 porównywany jest z fazą 0; ostatnia zapisana klatka nie musi być kopią pierwszej. Różnice przejść rastra stanowią kontrolę skoków, a nie zastępują oceny GIF-ów.

Nieruchome piksele kontrolowane są poza sumą projekcji geometrii ruchomej, z zapasem 3 px na antyaliasing. Okna i folia porównywane są z odzyskanym źródłem zatwierdzonej nakładki stack10 po samej translacji.

Pełne pomiary i skróty plików: `independent-validation.json`.
Kontakt opon: obracana siatka wielokątowa przybliża okrągłą powierzchnię. Największa zmierzona szczelina wynosi 0.000392011 m (0.018817 px). Jawna tolerancja tego testu to 0,001 m = 0,048 px. Nie zmienia ona ścisłych testów kotwicy, macierzy rzutu, skali ani marginesów. Paleta zachowuje test kontaktu z tolerancją 0,000002 m.



Status wydania: FINAL, zatwierdzone przez Piotra 11.10.2026. Wyniki techniczne zachowano z zaakceptowanego podglądu; nie wykonywano ponownego renderowania.
