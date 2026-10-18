# Woodwork Empire, P3: linia produkcyjna drzwi

Copyright (c) 2026 Skylon Development Ltd. All rights reserved.

**PODGLĄD DO AKCEPTACJI PIOTRA.** Ta paczka nie jest wydaniem FINAL. O stanie
niezależnej kontroli technicznej, obrazu i źródeł decydują raporty QA dołączone do
paczki. Sam eksport, lokalny test modeli ani ten README nie stanowią takiej akceptacji.

P3 przedstawia sześć stanowisk produkcji drewnianych drzwi z dwiema szybami i dolną
płyciną, następnie komplet drzwi z ościeżnicą, paletę dziesięciu kompletów oraz
niezmieniony wózek i kierowcę z L3 z nowym ładunkiem. Obudowy są jasnoszare, a
niebieski pozostał na drzwiczkach i akcentach. Moduły i ruch powstają z geometrii
3D, w tej samej rodzinie materiałów, kamery i oświetlenia co poprzednia linia.

## Zawartość kontraktu P3

| Element | Pliki | Format |
|---|---:|---|
| Moduły 1 do 6, widoki 0 i 90 | 12 PNG | 448 x 376, RGBA8 |
| Paleta drzwi, widoki 0 i 90 | 2 PNG | 160 x 172, RGBA8 |
| Arkusze pracy modułów | 6 PNG + 6 JSON | 12 komórek 448 x 376, 6 fps |
| Nakładki stosu 01 do 10 | 10 PNG | 448 x 376, kumulacyjne |
| Wózek z paletą drzwi | 1 PNG + 1 JSON | 4 kierunki, po 6 komórek 272 x 256, 8 fps |
| Klatki oddzielnie | 96 PNG | te same piksele co w arkuszach |
| Mastery statyczne 6x | 14 PNG | moduły 2688 x 2256; paleta 960 x 1032 |

Łącznie kontrakt zawiera 31 PNG gry i 7 JSON-ów arkuszy, poza klatkami, masterami,
modelami, planszami, GIF-ami, źródłami i raportami.

| Katalog | Przeznaczenie |
|---|---|
| `sprites-2x/0/`, `sprites-2x/90/` | obrazy statyczne do gry |
| `sheets/` | arkusze pracy i wózka wraz z opisem komórek |
| `overlays/` | same komplety na palecie M6, bez palety i maszyny |
| `frames/` | pojedyncze klatki pracy i jazdy |
| `masters/0/`, `masters/90/` | rzeczywisty render w rozdzielczości 6x |
| `models/` | siatki NPZ w metrach, normale, materiały, bryły oraz użyte AO |
| `source/` | modele, ruch, render, podglądy i zależności |
| `reports/` | dowody renderu i raporty kontroli |
| `approved-previews/` | plansze i GIF-y do przeglądu; nazwa katalogu nie oznacza akceptacji |
| `reference/` | zamówienie P3 i dostarczone wzory |

## Najpierw obejrzyj

- `approved-previews/P3-podglad.png`: linia drzwi i porównanie z linią okien,
  pojedyncze moduły w obu widokach oraz paleta.
- `approved-previews/P3-modul-1.gif` do `P3-modul-6.gif`: praca każdego stanowiska.
- `approved-previews/P3-cala-linia.gif`: cała linia w ruchu.
- `approved-previews/P3-nakladki.png`: dziesięć stanów stosu M6.
- `approved-previews/P3-wozek-4-kierunki.gif`: niezmieniony wózek L3 z nowym ładunkiem.

## Odtworzenie ze źródeł

Środowisko wykonania użyte do prac P3: CPython 3.12.14, Linux, kontekst OpenGL
3.3 przez EGL. Zależności Python przypina `source/requirements.txt`. Potrzebny jest
sterownik zapewniający EGL, np. Mesa. Modele, shadery, materiały i fonty są lokalne
w paczce. Render nie pobiera obrazów ani nie korzysta z usług generowania grafiki.

Uruchamiaj w rozpakowanym katalogu P3, najlepiej w osobnej kopii roboczej, ponieważ
ponowny eksport zapisuje pliki wynikowe:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r source/requirements.txt
export NUMBA_NUM_THREADS=2
python source/render_p3.py --pallet --scale 6
python source/render_overlays_p3.py
python source/render_vehicle_door.py --scale 6
python source/make_previews_p3.py
python source/finalize_p3.py
```

Pierwsze polecenie renderu tworzy moduły, ich animacje, modele i paletę. Drugie
przygotowuje nakładki po utworzeniu geometrii M6. Trzecie generuje arkusz pojazdu,
czwarte składa plansze i GIF-y, a piąte łączy dowody renderu, sprawdza format,
klatki i mastery oraz zapisuje metadane i sumy kontrolne. Skrypty domyślnie pracują w
katalogu nadrzędnym względem `source/`. Generowanie 6x może potrwać; masterów nie
należy zastępować powiększeniem małego PNG.

Opcjonalne porównanie pojazdu z odzyskaną, niezmienioną paczką L3:

```bash
python source/render_vehicle_door.py --scale 6 --reference /sciezka/do/L3
```

Parametr `--reference` służy kontroli tożsamości siatek L3. Do samego odtworzenia
P3 wystarczają dołączone źródła. Tożsamość bajtów obrazów na innym sterowniku GPU
nie jest zakładana: źródła, liczby i scena są odtwarzalne, a wydanie FINAL musi
kopiować zatwierdzone PNG bez ponownego renderowania.

## Ustalenia wymagające uwagi

- Paleta ma wariant czterostronnego wjazdu: 17 brył drewnianych, pokład od
  `.18` do `.228` m. Jej konstrukcja nie jest identyczna z paletą L3. Wózek,
  kierowca i widły pozostają bez zmian. Ten sam nowy wariant palety występuje
  w M6, osobno i na wózku.
- Dziesięć kompletów po 0.100 m, co 0.105 m, zaczynających się na 0.228 m,
  daje wierzch na **1.273 m**. Podane w briefie 1.278 m wymagałoby dodatkowej
  końcowej warstwy pianki 5 mm; takiej osobnej warstwy tutaj nie dodano.
- Kotwice są punktami rejestracji projekcji. Pustych narożników obwiedni nie
  wypełnia się sztucznymi pikselami ani podporami. Nakładki nie mają podłogowej
  podstawy, a kotwica wózka leży pod podwoziem, zgodnie z L3.
- Szczegóły montażu i współrzędnych zawiera `HANDOFF-CLAUDE.md`.

## Kontrola i zatwierdzenie

Niezależny QA sprawdza PNG, klatki, kamery, styki, pętle, rzeczywiste AO statycznych
powierzchni, pochodzenie modelu pojazdu i głębokość nakładek. Przegląd obrazu musi
objąć również wszystkie 120 połączeń dziesięciu stosów z dwunastoma klatkami M6.
Wynik automatyczny bez niezależnego przeglądu wizualnego nie oznacza pełnego PASS.

Akceptacja Piotra jest nadal wymagana. Dopiero po niej można przygotować FINAL,
z zachowaniem zatwierdzonych plików bajt w bajt i rzeczywistą treścią jego zgody.
W paczce PODGLĄD nie należy tworzyć `approval.json`. `checksums.sha256` opisuje
ostatecznie zapakowane pliki, a `source/SOURCE-MANIFEST.md` opisuje ich pochodzenie.

Po dołączeniu niezależnego raportu QA odświeżyć wyłącznie sumy kontrolne:

```bash
python source/finalize_p3.py --checksums-only
```

Pełne ponowne uruchomienie finalizera odtwarza metadane producenta ze statusem
niezależnego QA `PENDING`; nie używać go do nadpisania przyjętego wyniku QA.
