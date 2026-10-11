# Woodwork Empire Tycoon: podgląd animacji L2

Wygląd L1 został zatwierdzony przez Piotra. Ta wersja robocza przedstawia ruch L2 do osobnej oceny; nie jest jeszcze zatwierdzoną paczką końcową animacji. Paczka L3 (osobna paleta i wózek z kierowcą) nie została wykonana.

## Zawartość

- Sześć arkuszy `windowLineN.standard.work.sheet.png`: 5376 × 376 px, 12 komórek po 448 × 376 px, prawdziwe RGBA (8 bitów na kanał).
- Sześć JSON-ów: `frames: 12`, `fps: 6`, `frameWidth: 448`, `frameHeight: 376`, `anchorX: 296`, `anchorY: 368`, `loop: true`.
- Siedem GIF-ów podglądowych: sześć modułów i cała linia, pętla 2 s. Jasne tło i opisy należą wyłącznie do podglądów.
- Dziesięć nakładek od `windowLine6.standard.stack01.png` do `stack10.png`: przezroczyste obrazy 448 × 376 px z samymi oknami, folią i narożnikami. Bez palety lub maszyny.
- Klatki PNG, raporty, kompletny kod geometrii, ruchu, renderowania i kontroli.

Każda pierwsza klatka jest rzeczywistym ponownym renderem, identycznym piksel w piksel z zatwierdzonym L1. Kamera, kotwica i światło pozostają stałe. Ruch zmienia geometrię 3D, a nie położenie całego sprite'a. Oświetlenie nieruchomych powierzchni korzysta z zamrożonego AO klatki 0, aby usunąć migotanie; zmiany zasłaniania wynikają z bufora głębokości. Faza 1 modelu jest identyczna z fazą 0, co zamyka pętlę. Zapisywanych jest 12 próbek: od 0/12 do 11/12.

## Ruch i decyzje

1. Piła: podanie deski, postój przy tarczy, cięcie i przejazd przez strugarkę.
2. CNC: przejazd suwnicy, pochylenie głowicy i obrót wrzeciona. Karuzela wykonuje indeks o jedno miejsce, zatrzymanie i powrót o jedno miejsce; ten powrót zamyka dwusekundową pętlę bez przeskoku różnych narzędzi. Jest to różnica wobec stale jednokierunkowego indeksowania opisanego w briefie.
3. Szlifierka: obrót szczotek, obieg pasa i transport deski.
4. Prasa: docisk z czterech stron, otwarcie i wymiana ramy. Listwy transferowe opuszczają się poniżej rolek podczas przejazdu, aby nie przecinać drewna.
5. Lakiernia: ruch robota, delikatna mgiełka i transport ram po szynie podwieszanej.
6. Szklenie: istniejąca rama z haka obraca się na stół, przyssawki opuszczają szybę, robot przejmuje okno i stawia je na palecie. W ostatniej klatce niesione okno znika; liczbę odłożonych okien wyświetla osobna nakładka.

Biały prostokąt pozostający na stole M6 jest stałym oprzyrządowaniem/podparciem szklenia, a nie kolejnym przesuwanym oknem. Okno z haka, przenoszone przez robota i występujące w nakładkach, ma wymiary 1.10 × 0.08 × 1.44 m. Nakładki są kumulacyjne: każda kolejna zachowuje poprzednie okna. Rozstaw w osi Y wynosi 0.082 m, a spód znajduje się na wysokości Z = 0.228 m. Te wymiary należy przenieść do późniejszego L3.

## Integracja po zatwierdzeniu ruchu

Nie przycinać arkuszy ani pojedynczych komórek. Rysować z tą samą kotwicą co L1. Nakładki `stack` są dostępne wyłącznie w widoku 0 i mają identyczne płótno oraz kotwicę. Gra wybiera jedną nakładkę zgodną z liczbą okien; nie nakłada kolejno wszystkich nakładek od `stack01` do `stackN`. Nakładki nie zawierają podłogi, palety ani własnego cienia.

Sąsiednie moduły ustawiać z przesunięciem (+288, +144) px; pas biegnie na wysokości 0.9 m, a szyna M5/M6 na wysokości 2.8 m. Ta sama faza wszystkich arkuszy daje zsynchronizowaną prezentację linii. Krótka pętla jest wizualizacją pracy; nie definiuje czasów procesu ani logiki produkcji w grze. Repozytorium i kod gry pozostają nietknięte.

## Odtworzenie

Wymagany jest Python 3.12, zależności z `line1010-l2-src/requirements.txt` oraz działający OpenGL/EGL (np. Mesa). Uruchom z katalogu zawierającego foldery `line1010-l2-src`, `line1010-output` i `line1010-reference`:

```bash
python3 -m venv .venv-line1010
source .venv-line1010/bin/activate
python -m pip install -r line1010-l2-src/requirements.txt
python line1010-l2-src/render_animation.py
python line1010-l2-src/render_overlays.py
python line1010-l2-src/make_animation_previews.py
python line1010-l2-src/validate_animation.py
```

Wyniki trafiają do `line1010-l2-output`. Zamrożone PNG L1 w `line1010-output/sprites-2x/0/` są wymagane do sprawdzenia pierwszej klatki. Pełny raport techniczny znajduje się w `line1010-l2-output/independent-validation.json`, a opis kontroli w `animation-QA-independent.md`. Raport techniczny nie zastępuje zatwierdzenia GIF-ów przez Piotra.
