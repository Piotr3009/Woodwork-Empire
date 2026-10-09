# Reprodukcja paczki 1

Kod i siatki 3D odpowiadają zatwierdzonym 13 plikom PNG. Zmiany w tej kopii źródeł dotyczą wyłącznie ścieżek, importu renderera i lokalnych fontów. Geometria, materiały, shader, oświetlenie, kamera i fizyczne obroty pozostają bez zmian.

## Środowisko

Sprawdzone: CPython 3.12, Ubuntu 24.04, OpenGL 4.5 przez Mesa 25.2.8/llvmpipe i EGL. Potrzebna jest działająca biblioteka systemowa EGL/OpenGL; sam `pip` jej nie instaluje. Na Windows użyj środowiska Linux/WSL z EGL. Blender, VTK i przeglądarka nie są wymagane. Zależności Python są przypięte do faktycznie użytych wersji.

Uruchamiaj polecenia z głównego folderu rozpakowanego ZIP-a:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r source/requirements.txt
python source/render_all.py
python source/validate.py
python source/make_previews.py
```

Wszystkie nowe rendery, podglądy i raporty trafiają do `regenerated/`. Polecenia nie nadpisują zatwierdzonych `sprites-2x/` ani `approved-previews/`. Można wyrenderować pojedynczy obiekt:

```bash
python source/render_all.py sander.standard
```

Pełny walidator oczekuje wszystkich 13 plików, więc uruchamiaj go po wygenerowaniu całej paczki. `source/brief.txt` zawiera kontrakt używany przez walidator. `source/meshes/` zawiera zatwierdzone siatki, normalne, materiały i obwiednie AO jako NPZ bez pickle. `source/legacy/` to zależności istniejących generatorów, które utrzymują te same modele. Nie uruchamiaj generatorów legacy jako osobnych programów — wejściem tej paczki jest `render_all.py`.

## Kamera i jakość

Render to faktyczna siatka trójkątów z buforem głębokości i stałym światłem. Widok 90 powstaje przez `(x,y,z) → (y,w−x,z)` przy tej samej kamerze. Projekcja w końcowych pikselach: `sx = 8 + 48d + 48(x−y)`, `sy = 8 + 48h + 24(x+y) − 48z`, z zamianą obwiedni po obrocie. Krawędzie X/Y mają nachylenie ±0,5; piony są pionowe. Renderer liczy wewnętrznie obraz 6× większy od docelowego PNG, a następnie stosuje próbkowanie powierzchniowe BOX. Przezroczyste tło jest prawdziwym RGBA.

Na innym sterowniku OpenGL mogą wystąpić minimalne różnice rastra, mimo identycznej geometrii i projekcji. Zatwierdzone PNG z głównej paczki są plikami do wdrożenia.

## Sprawdzenie przenośności

`portability-check.json` dokumentuje porównanie odtworzonych ośmiu modeli z zatwierdzonymi NPZ: współrzędne, normalne, indeksy i parametry materiałów oraz obwiednie AO są identyczne. Obejmuje też zgodność tekstu obu shaderów.
