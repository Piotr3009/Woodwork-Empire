# Przekazanie dla Claude’a — paczka 1

Piotr zatwierdził podglądy i polecił przygotować komplet 09.10.2026. To gotowa paczka grafik; zmiany w kodzie gry wykonuje Claude.

## Pliki do gry

Skopiuj `sprites-2x/` z zachowaniem nazw i podziału na `0/` oraz `90/`.

| Plik | Widoki | Płótno px | Kotwica 0 | Kotwica 90 |
|---|---|---|---|---|
| `sander.used.png` | 0, 90 | 160 × 136 | 104, 128 | 56, 128 |
| `sander.budget.png` | 0, 90 | 160 × 148 | 104, 140 | 56, 140 |
| `sander.standard.png` | 0, 90 | 160 × 160 | 104, 152 | 56, 152 |
| `sander.pro.png` | 0, 90 | 256 × 220 | 152, 212 | 104, 212 |
| `sander.industrial.png` | 0, 90 | 400 × 304 | 296, 296 | 104, 296 |
| `cuttersSash.standard.png` | 0 | 112 × 112 | 56, 104 | — |
| `cuttersCasement.standard.png` | 0 | 112 × 112 | 56, 104 | — |
| `cuttersDoor.standard.png` | 0 | 112 × 112 | 56, 104 | — |

`dimensions.json` ma strukturę zgodną z wcześniejszą paczką 1: tablica `sprites`, `viewDeg`, `canvasPx:{w,h}`, `anchorPx:{x,y}`. Kotwice odnoszą się do pełnego płótna w pikselach pliku 2x.

## Ustawianie na siatce

1. Dla widoku obiektu wybierz odpowiedni folder. Widok 90 jest gotowym renderem obróconego modelu.
2. Ustaw lewy górny róg sprite’a jako `screenGroundAnchor - anchorPx * displayScale`.
3. Skaluj obraz i kotwicę tym samym współczynnikiem w obu osiach. Dla skali wyświetlania 1x z pliku 2x współczynnik wynosi 0,5.
4. Zachowaj całe przezroczyste płótno. Nie wycinaj przezroczystych brzegów ani nie wyznaczaj nowej kotwicy z widocznych pikseli.
5. Nie dodawaj obrotu, odbicia, pochylenia, perspektywy lub osobnego skalowania X/Y w CSS/canvas w celu ustawienia kąta. Rzut jest już zgodny z siatką 2:1.

Trzy walizki frezów trafiają do katalogu, nie na podłogę hali. W tej paczce są tylko widoki 0 i 90 wymienione w bieżącym briefie.

## Kontrola

- `exactProjectionVerified: true` dla 13/13 plików.
- Wszystkie wymagane rozmiary, kotwice, RGBA8 i marginesy co najmniej 8 px przeszły kontrolę.
- Kamera sprawdzona niezależnie na krawędziach siatek i wykonaniu vertex shadera GPU; szczegóły w `camera-QA.md`.
- Obrazy po zatwierdzeniu pozostały identyczne bajtowo; `approval.json`, `validation.json` i `SHA256SUMS.txt` zawierają odniesienia kontrolne.
- Modele są puste, bez ludzi, napisów, marek, podłogi i cienia rzucanego.

Masterów, źródeł i plansz podglądowych nie należy używać jako sprite’ów gry. Odtwarzanie renderów opisano w `source/README.md`.

Paczki 2 i 3 będą oddane osobno zgodnie z kolejnością z briefu. Ta paczka nie zastępuje pras, stołu do klejenia ani pozostałych wcześniejszych zasobów.
