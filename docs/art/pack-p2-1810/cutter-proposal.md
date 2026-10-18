# Opcjonalna propozycja poprawki hall-deep.py

Status: propozycja do oceny przez Claude. Nie została zastosowana. Oryginalne cztery cuttery i obowiązkowe podglądy P2 pozostają oparte na załączonych skryptach bez zmian.

Plik propozycji: `source/proposed-hall-deep-fix.diff`. Ścieżka docelowa w przyszłym repozytorium integracyjnym: `scripts/hall-deep.py`.
Źródło porównania: `reference/zalaczniki/hall-deep.py`, identyczne z wejściowym `P2/zalaczniki/hall-deep.py`.
SHA-256 oryginału: `b468953439c330afb22c0676ad10d35188cf52584f80a58a82c4867b188e9b52`.

## Zakres

1. Czyszczenie podłogi: przesunięcie źródła z `-2.5` na `-3.0` m w osi X. Ujemne przesunięcie pobiera dla piksela docelowego materiał ze źródłowego `x+3.0`. Maska czyszczenia obejmuje w przybliżeniu `x=0.02..2.3`, więc próbkowany pas ma `x=3.02..5.3`, poza żółtymi pasami i obszarem przy bramie. Przesunięcie o całkowite metry zachowuje fazę fug co 1 m. Maska, obszar zachowania oryginalnych pasów, przesunięcia kolejnych kopii i geometria hali nie zmieniają się.
2. Tonowanie lustrzanego przedłużenia lewej ściany: obie próbki używają wspólnej wysokości `z=1.2..2.2`, nad najwyższym cokołem 0.8 m i poniżej LED. Tylna próbka zachowuje `x=22..32`. Lewa próbka przechodzi na `y=2.5..3.5`, czyli pełny metr ściany między WC a drzwiami osobowymi. Przeniesienie jej wzdłuż ściany jest konieczne: samo obniżenie starej próbki `y=4.75..5.6` objęłoby drzwi osobowe. Nowe zakresy obejmują pełne okresy paneli 1 m i bloczków 0.5 m, a wspólny zakres wysokości ma 1 m.

## Powód

Oryginalne czyszczenie podłogi przesuwa metrowe fugi o pół metra. Kopie wykonywane przy powiększaniu hali przenoszą ten błąd fazy na kolejne odcinki.

Oryginalny pomiar tylnego muru obejmuje `z=0.6..3.2`, a lewego `z=2.5..3.2`. Cokół 0.8 m występuje tylko w pierwszej próbce; poświata LED ma w nich różny udział. Współczynnik koloru może więc rozjaśniać lub zabarwiać przedłużenie mimo poprawnych materiałów. Propozycja zachowuje istniejący sposób tonowania, ale usuwa te dwie przyczyny nierównoważności próbek.

## Weryfikacja i dalszy krok

Sprawdzono, że wszystkie zamiany odnoszą się jednoznacznie do oryginalnego pliku i że proponowany kod przechodzi sprawdzenie składni Python. Oryginału nie zmodyfikowano i propozycji nie uruchamiano jako części obowiązkowych podglądów.

Claude powinien ocenić patch osobno przed integracją. Po ewentualnym zatwierdzeniu trzeba ponownie uruchomić komplet czterech cutterów dla poziomów 1-6, obejrzeć pełne hale 50 x 27 m, fazę podłogi w pasie przy lewej ścianie, zachowanie żółtych pasów, połączenie lewego muru przy y=9.15 i odcień całego przedłużenia. Jest to propozycja usunięcia dwóch konkretnych przyczyn, a nie deklaracja zaliczenia testów obrazowych ani gwarancja usunięcia wszystkich szwów.

## Oddzielne podglady propozycji

Propozycje uruchomiono osobno na kopiach tymczasowych dla poziomow 2 do 6. Podglady sa w approved-previews/proposed-cutter i maja widoczny podpis PROPOZYCJA CUTTERA. Nie zastapily obowiazkowych przebiegow oryginalnych skryptow i nie sa wdrozeniem. Logi oraz SHA-256 kazdego uruchomionego skryptu sa w reports/proposed-cutter-run-levelN.json. Niezalezny QA ocenia propozycje oddzielnie od oryginalow.
