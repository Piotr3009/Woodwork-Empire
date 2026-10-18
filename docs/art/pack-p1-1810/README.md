# P1: dwie wiaty za hala

Copyright (c) 2026 Skylon Development Ltd. All rights reserved.

Etap: PODGLAD do oceny Piotra. Brak zatwierdzenia i brak pliku approval.json.

W paczce sa cztery gotowe pliki gry, dwa modele 3D, cztery mastery 6x, dwie plansze,
pelny kod modelowania i renderu, metadane i raporty kontroli. Nie zmieniono kodu gry.

| Plik | Obwiednia | PNG gry | Master 6x | Kotwica 0 | Kotwica 90 |
|---|---|---|---|---|---|
| glassShelter.standard.png | 12 x 3 x 3 m | 736 x 520 | 4416 x 3120 | 584,512 | 152,512 |
| timberShelterLarge.standard.png | 18 x 3 x 4 m | 1024 x 712 | 6144 x 4272 | 872,704 | 152,704 |

Kazdy plik wystepuje w folderach 0 i 90. PNG gry maja RGBA 8 bitow bez profilu koloru,
prawdziwa przezroczystosc, 8 px bezpiecznego marginesu i nie zawieraja napisow ani tla.

Modele korzystaja z renderera L3 z zatwierdzonego S1, bez zmiany shaderow, swiatel
ani matematyki rzutu. Wspolna stal, przetloczenia blachy, obrobki, stopy i detale
zachowuja rodzine wizualna S1. Widok 90 jest fizycznym obrotem tego samego modelu.

Wiata szkla zawiera 6 stojakow A, 12 pakietow po 28 szyb zespolonych, czyli 336 IGU
i 672 rzeczywiste tafle. Wiata tarcicy zawiera 16 pakietow po 96 desek na 4 poziomach,
czyli 1536 desek. Pojemnosci 3200 i 3000 w grze pozostaja parametrami ekonomii.
Ilosci w modelu nie sa doslowna reprezentacja pojemnosci gry.

## Podglady

- `approved-previews/P1-podglad.png`: obie wiaty i oba widoki, w dokladnie dwukrotnej wielkosci PNG gry, z masterow.
- `approved-previews/P1-za-murem.png`: kazda wiata w pierwszym i drugim rzedzie, za rzeczywistym murem 3D.
- Nazwa `approved-previews` zachowuje uklad umowy. Nie oznacza zatwierdzenia Piotra na etapie PODGLAD.

## Odtworzenie

Python 3.12, Mesa EGL, pakiety z `source/requirements.txt`.

```sh
python source/render_p1.py
python source/make_previews_p1.py
python source/validate_p1.py
```

Wlasny walidator eksportu nie zastepuje niezaleznego `reports/qa-P1.json`.
Po akceptacji Piotra FINAL musi zachowac bajty zatwierdzonych plikow gry, masterow,
modeli i plansz. Nie wolno regenerowac ich przy samym pakowaniu FINAL.
