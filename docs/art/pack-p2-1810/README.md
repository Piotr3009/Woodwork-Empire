# P2 - hala, poziomy 2 do 6

Status: PODGLAD do oceny Piotra. To nie jest FINAL i nie oznacza zatwierdzenia ani wdrozenia do gry.

Paczka zawiera 15 zarejestrowanych PNG: po trzy warstwy dla poziomow 2, 3, 4, 5 i 6. Kazda warstwa ma 1680 x 1128 px. Tlo jest RGB, biuro i kantyna RGBA, 8 bitow, bez profilu. Poziom 1 pozostaje bez zmian i znajduje sie tylko w reference jako dostarczony wzorzec.

- sprites-2x: dokladne nazwy hallBackground.levelN.png, hallOffice.levelN.png i hallCanteen.levelN.png.
- masks: trzy mapy regionow L8 i 15 dokladnych masek roznic 0/255.
- approved-previews: plansza 3 x 2, piec hal 50 x 27 m z niezmienionych cutterow, plansza roznic.
- approved-previews/proposed-cutter: osobno podpisane podglady propozycji poprawki cuttera. Nie sa zamiennikiem wymaganych podgladow i nie sa wdrozone.
- source: kompletny kod materialow, masek, plansz i walidacji. Oryginalne skrypty gry sa w reference.
- reports: wykonanie cutterow, niezalezny QA i opis propozycji.

Wazne ograniczenie: oryginalny hall-deep.py przesuwa fragment posadzki o 2.5 m, co narusza faze wymaganych metrowych fug poziomu 2. Porownuje tez rozne wysokosci scian przy tonowaniu przedluzenia, co wprowadza skok odcienia przy cokole 0.8 m. To zostalo pokazane i opisane, a nie ukryte. Pelna bramka techniczna pozostaje otwarta do decyzji. Szczegoly w HANDOFF-CLAUDE.md i reports/qa-P2.json.

Odtworzenie: Python 3, Pillow i numpy. Uruchom `python3 source/build_p2.py --previews`, potem `python3 source/compose_previews.py`, a na koncu `python3 source/validate_p2.py`. Opcjonalny, oddzielny test propozycji: `python3 source/compose_previews.py --candidate` (wymaga narzedzia patch). Wszystkie cuttery uruchamiaja sie w katalogu tymczasowym. Repozytorium gry nie jest dotykane.
