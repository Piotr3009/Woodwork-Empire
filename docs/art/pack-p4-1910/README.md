# Woodwork Empire - linia domow A z robotami

Sześć animowanych stanowisk produkcji z zielonymi robotami przemysłowymi, suwnicami i chwytakami. Dom ma 8 x 6 m. Cała linia ma 84 x 10 m, wysokość 10 m. Gotowy dom wraca bocznym przejazdem na początek linii do strefy DELIVERY READY.

To paczka kodu, modeli i grafik do integracji z grą. Nie zmodyfikowano repozytorium gry.

## Produkcja

1. Podłoga: suwnica opuszcza pełną kasetę, roboty prowadzą ją i mocują.
2. Ściany: cztery ramy są kolejno pobierane ze stojaka, podnoszone, ustawiane i mocowane.
3. Poszycie i instalacje: suwnica podaje panele, roboty montują poszycie i instalacje.
4. Dach: kompletny dach opuszcza się na ściany, roboty mocują go, zawiesia odczepiają się.
5. Wykończenie: robot z głowicą roboczą przesuwa się wzdłuż elewacji; dom otrzymuje wykończenie i okna.
6. Kontrola: robot skanuje elewację oraz dach, następnie parkuje; zapala się zielona kontrolka.

Ramiona mają stałe długości i rzeczywiste przeguby. Części domu zachowują rzeczywiste wymiary. W grze każdy cykl jest jednorazowy, zależy od czasu zadania i zatrzymuje się na ostatniej klatce. GIF jest wyłącznie powtarzanym podglądem.

## Zawartość

- `assets/production/`: 384 przezroczyste klatki PNG (6 stanowisk x 16 klatek x 4 widoki), 24 puste stanowiska, 24 atlasy i manifesty.
- `models/production/`: 96 modeli klatek oraz 6 pustych stanowisk w NPZ, w metrach, z materiałami, normalnymi i AO.
- `assets/transport/`: animowany transporter z gotowym domem i pusty transporter; cztery widoki oraz dwa kierunki kół.
- `source/production-controller.mjs`: sterowanie produkcją, zatrzymywanie, odbiór produktu, przekazanie do transportu.
- `source/production_*.py`: ciągłe funkcje geometrii montażu oraz wspólne zielone roboty.
- `source/delivery-route.mjs`, `source/delivery-visuals.mjs`: powrót domu z końca linii na początek, obrót całego układu i rezerwacja wspólnego przejazdu.
- `factory-layout.json`: miejsce na drugą równoległą linię i wspólny przejazd 10 m.
- `HANDOFF-CLAUDE.md`, `INTEGRATION-EXAMPLE.mjs`: instrukcja oraz uruchamialny przykład kontraktu integracji.
- `QA-production.json`, `tests/`: wyniki i sprawdzenia geometrii, animacji oraz sterowania.

## Kamera i składanie sceny

Dokładny rzut 2:1: `sx = ox + 48*(x-y)`, `sy = oy + 24*(x+y) - 48*z`. Ta sama kamera, oświetlenie i materiały co w poprzedniej paczce. Widoki 0, 90, 180 i 270 odpowiadają fizycznemu obrotowi o minus ten kąt. Nie obracać gotowego obrazka w 2D.

Każda klatka zawiera całe stanowisko, platformę i aktualny produkt. Nie dokładać do niej drugiego domu lub platformy. Puste stanowisko zawiera tylko infrastrukturę i zaparkowane roboty. Przy wyjeździe domu potrzebny jest bufor głębokości dla modeli lub sprawdzone warstwy pierwszego planu w silniku gry; jeden sprite suwnicy nie odwzorowuje wszystkich przesłonięć ruchomego domu.

Transport pomiędzy stanowiskami, zapisy gry, gospodarka i własność produktów należą do silnika gry. Kontroler zwraca produkt dopiero po zakończeniu montażu i wymaga jawnego odebrania. Nie teleportuje domów między stanowiskami.

## Odtworzenie

Python 3.12, Node.js oraz FFmpeg. Zależności Pythona są w `source/shared/requirements.txt`; renderer wymaga EGL/OpenGL (działa też Mesa).

```sh
python3 -m pip install -r source/shared/requirements.txt
python3 source/export_production.py --scale 3
python3 source/production_preview.py
python3 source/production_line_preview.py
node --test tests/*.test.mjs
node INTEGRATION-EXAMPLE.mjs
python3 tests/qa_production.py
```

Źródła geometrii przyjmują ciągły postęp od 0 do 1. Dostarczony adapter sprite'ów używa 16 klatek, włącznie ze stanem początkowym i końcowym. Przy rendererze 3D można próbkować geometrię gęściej; przy zwiększaniu liczby klatek PNG należy wspólnie zmienić eksporter, manifest i adapter.
