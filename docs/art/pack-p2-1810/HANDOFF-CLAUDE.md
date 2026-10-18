# P2 - przekazanie do Claude

Status: PODGLAD. Piotr ocenia produkcyjne proporcje i pomieszczenia. Nie ma approval.json, nie ma zgody na FINAL. Nie zmieniono repozytorium, manifestu ani zadnego skryptu gry.

## Pliki gry

Uzyj 15 plikow z sprites-2x dopiero po decyzji Piotra. Sa plaskie, z koncowka `.level2.png` do `.level6.png`. Rejestracja kazdego plotna: (0,0), swiat (600,288), X=(48,24), Y=(-48,24), Z=(0,-48). Poziom 1 nie jest nowym plikiem gry.

Cokoly w metrach: poziom 2 = 0.6, 3 = 0.8, 4 = 0.5, 5 = 0.8, 6 = 0.8. Te same wysokosci na murach, WC, biurze i kantynie. Bloczki 0.5 x 0.25 m, przewiazka 0.25 m. Panele co 1 m, liczone od poczatku swiata. Podloga poziomu 2 ma fugi co 1 m. Poziomy 3 do 6 sa bezspoinowe. Material podlogi ma stale oswietlenie i drobna okresowa mikrofakture, bez swietlnych odbic, winiety ani gradientu.

Tylna sciana i fronty blokow maja identyczna faze, kolor i wysokosc cokolow. Dzieki temu hall-wide moze uzyc laty tylnej sciany do zamurowania drugich drzwi kantyny. Boczne lica blokow sa przyciemnione. LED poziomow 5 i 6 jest ciagly; listwa i cala poswiata leza powyzej z=3.2 m, na licach obu murow, bez poswiaty podlogowej.

Mapa geometrii pochodzi z oryginalnego rastra. Jej obrysy nie sa zastepowane idealnym rzutem. Zewnetrzne piksele, przednie krawezniki, zolte pasy i alfa pomieszczen sa zachowane. Idealne punkty swiata zakryte przez WC/bloki nie sa przedstawiane jako widoczne narozniki; ocena rejestracji opiera sie rowniez na zachowanym rastrze i alfa.

## Dwa konflikty z niezmienionym cutterem

1. Poziom 2 wymaga fugi 1 m, lecz hall-deep.py czysci pas przy lewej scianie kopia przesunieta o 2.5 m. Powstaje polmetrowe przesuniecie fug. Pozostawiono wymagany material oraz oryginalny cutter, a problem pokazano w obowiazkowym podgladzie.
2. Ton przedluzenia lewej sciany jest obliczany ze sredniej tylnej sciany z=0.6..3.2 i lewej z=2.5..3.2. Przy cokole 0.8 m pierwsza probka obejmuje ciemny cokól, druga nie. To powoduje skok jasnosci przedluzenia. Nie namalowano sztucznego gradientu, aby ukryc blad.

Plik source/proposed-hall-deep-fix.diff to niewdrozona propozycja dla Claude: przesuniecie -3.0 m oraz porownanie jasnych lic w tej samej wysokosci 1.2..2.2 m, z lewa probka miedzy WC a drzwiami. Oryginaly w reference zostaly bez zmian. Podglady po tej propozycji sa wyraznie oddzielone w approved-previews/proposed-cutter. Nie sa plikami gry ani zatwierdzeniem zmiany kodu.

Pytanie do decyzji: czy Claude ma przyjac zaproponowana poprawke hall-deep.py, aby spelnic wymaganie metrowych fug i jednolitego tonu wiekszej hali? Niezalezny raport wskazuje rzeczywisty wynik obu wariantow. Nie oznaczamy calego zamowienia PASS, jesli oryginalne cuttery nie spelniaja wymogu bezszwowosci.

## Odtwarzalnosc i FINAL

build_p2.py tworzy maski i 15 sprite'ow, compose_previews.py uruchamia niezmienione cztery skrypty w katalogu tymczasowym, validate_p2.py mierzy roznice i eksportuje SHA-256. Zaden pochodny fragment duzej hali nie jest przekazywany jako dodatkowy sprite gry.

Po zatwierdzeniu przez Piotra FINAL ma zawierac dokladnie te same bajty sprite'ow i plansz. Jego wlasne slowa nalezy zapisac w approval.json, a niezalezny QA sprawdza identycznosc SHA-256. Nazwa folderu approved-previews wynika z kontraktu i nie jest twierdzeniem o aktualnym zatwierdzeniu.
