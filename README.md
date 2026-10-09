# Woodwork Empire Tycoon — paczka 1

Zatwierdzona przez Piotra 09.10.2026. **13 gotowych grafik PNG**, komplet źródeł modeli 3D i pomiarów kamery. Zawartość odpowiada paczce 1 z briefu z 08.10.2026.

## Zawartość

- `sprites-2x/0/`: pięć szlifierek i trzy zestawy frezów — 8 PNG.
- `sprites-2x/90/`: te same pięć szlifierek po fizycznym obrocie modelu — 5 PNG.
- `masters-6x/`: te same rendery w rozdzielczości sześciokrotnie większej od sprite’ów, do archiwizacji.
- `dimensions.json`: płótna, obwiednie, kotwice i parametry rzutu dla każdego widoku.
- `validation.json`, `camera-QA.md`, `qa/`: wyniki kontroli wymiarów, alfy, marginesów, modeli i kamery.
- `approved-previews/`: dwa podglądy zaakceptowane przez Piotra.
- `source/`: generatory, renderer, siatki 3D, materiały i oryginalny brief.
- `approval.json`: zapis zatwierdzenia; `SHA256SUMS.txt`: sumy kontrolne całej zawartości.

## Zachowana geometria

Rzut ortograficzny 2:1: 1 m wzdłuż osi podłogi daje `(48,24)` lub `(-48,24)` px. Nachylenia krawędzi wynoszą dokładnie ±0,5. Wysokość 1 m daje 48 px w pionie. Kotwice pochodzą z geometrii. Wszystkie pliki mają prawdziwą alfę RGBA8 i co najmniej 8 px przezroczystego marginesu.

Widok 90 powstał z obrotu tej samej bryły przy stałej kamerze i świetle. Finalne sprite’y są identyczne bajtowo z renderami, z których wykonano zatwierdzone podglądy; podczas pakowania nie renderowano ich ponownie ani nie zmieniano pikseli.

## Modele

Zachowano konstrukcję i kolory wcześniejszych szlifierek. Zgodnie z bieżącym briefem model używany ma okrągłą szlifierkę mimośrodową z odkurzaczem, a budżetowy — dwie szlifierki ręczne na wieszakach. Model przemysłowy ma cztery sekcje, cztery górne króćce i wysokość 2 m. Frezy występują w trzech wspólnych walizkach, rozróżnianych liczbą i kształtem głowic.

Zestawy frezów są ilustracjami katalogowymi. Ich obwiednia 1 × 1 × 1 w metadanych służy kadrowaniu płótna 112 × 112; nie jest deklaracją fizycznych wymiarów walizki.

Nie ma odstępstw od wymaganych nazw plików, płócien, kotwic i kamery paczki 1. Pakiet nie obejmuje paczek 2 i 3. Instrukcja wdrożenia jest w `HANDOFF-CLAUDE.md`.
