# L3: FINAL, instrukcja dla Claude

**Status: FINAL, Piotr zatwierdził L3 11.10.2026.** Grafiki i animacje są gotowe do przekazania do integracji. ZIP nie zmienia repozytorium ani gry.

## Pliki i kotwice

| Obiekt | Plik | Wymiary w px | Kotwica w px |
|---|---|---|---|
| Paleta, widok 0 | `sprites-2x/0/windowPallet.standard.png` | 160 × 172 | (104, 164) |
| Paleta, widok 90 | `sprites-2x/90/windowPallet.standard.png` | 160 × 172 | (56, 164) |
| Wózek pusty | `sheets/vehicle.forklift.drive.sheet.png` | Arkusz 1632 × 1024; komórka 272 × 256 | (136, 192) w komórce |
| Wózek z paletą | `sheets/vehicle.forklift.driveLoaded.sheet.png` | Arkusz 1632 × 1024; komórka 272 × 256 | (136, 192) w komórce |

Przy każdym arkuszu znajduje się JSON o tej samej nazwie bazowej, z końcówką `.sheet.json`. Arkusz ma 6 kolumn i 4 rzędy; odtwarzanie: 6 klatek, 8 fps, pętla.

| Rząd od góry | Kierunek | Ruch na ekranie | Kierunek modelu |
|---|---|---|---|
| 0 | `sw` | W lewo i w dół | +Y |
| 1 | `se` | W prawo i w dół | +X |
| 2 | `nw` | W lewo i w górę | −X |
| 3 | `ne` | W prawo i w górę | −Y |

Widły wskazują kierunek jazdy. W obu wariantach pojazd pozostaje nieruchomy względem kotwicy; przesunięcie po hali wykonuje gra. Kotwica oznacza ten sam punkt pod środkiem wspólnej obwiedni wózka wraz z przewidzianym ładunkiem. Nie centrować ponownie pustego wózka według widocznych pikseli i nie przycinać przezroczystych marginesów.

## Kamera i paleta

Rzut: `sx = ox + 48 * (x - y)`, `sy = oy + 24 * (x + y) - 48 * z`. Widok 90 palety używa obrotu z najnowszego briefu: `(x, y, z) -> (y, w - x, z)`. Kierunki wózka są renderami fizycznie obróconego modelu przy stałej kamerze i świetle. Korekcja wysokości jest już zawarta w macierzy renderera; nie stosować w grze dodatkowego mnożnika Z × 0,8165.

Paleta ma logiczną obwiednię 2 × 1 × 1,75 m. Jej drewniana podstawa ma 1,45 × 1 m, a górna powierzchnia znajduje się na wysokości Z = 0,228 m. Dziesięć okien zachowuje geometrię i materiały zatwierdzonego L2 `stack10`: każde ma 1,10 × 0,08 × 1,44 m, z rozstawem 0,082 m w osi Y. Wariant załadowany zawiera tę samą paletę przeniesioną na widły.

## Uwagi do przekazania

- Wygląd wcześniejszego standardowego wózka odtworzono w nowej siatce 3D. Poprzednia referencja była rastrem; źródłowy obraz zachowano w `reference/forklift-standard-appearance.png`.
- Folder `approved-previews/` zawiera dokładnie zaakceptowane podglądy. Grafiki do gry, modele i źródła zachowano bez zmian względem zatwierdzonego ZIP-a. Rekord akceptacji i porównanie SHA-256 znajdują się w `approval.json` oraz `reports/final-identity-QA.json`.
- Żółty pas, przejazdy po hali, podnoszenie i odkładanie palety oraz stan magazynu obsługuje gra. Arkusze przedstawiają jazdę w miejscu.
- ZIP zawiera pełne źródła i raporty. Polecenia odtworzenia i walidacji znajdują się w `README.md`.
- S1 jest kolejnym etapem. Opcjonalne L2b wymaga osobnej zgody Piotra. Żaden z tych etapów nie należy do tej paczki L3.
