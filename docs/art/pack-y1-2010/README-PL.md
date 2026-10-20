# Woodwork Empire: kod graficzny linii jachtowej

Ta paczka dodaje moduł całej linii do renderera gry, dokładną poprawkę `hall.ts`, instalator oraz komplet grafik. Poprzedni podgląd jest dodatkiem w `index.html`; główny kod do gry jest w `game/`.

## Co zakodowano

- 12 stanowisk po 14 × 10 × 12 m, razem 168 m produkcji. Przed linią dok odbioru 14 m; rezerwacja linii z dokiem i bocznym przejazdem wynosi 182 × 20 m.
- 16 klatek każdej operacji, cztery rzeczywiste obroty, zielone roboty i suwnice, jacht biało-mahoniowo-złoty. Puste stanowisko korzysta z grafiki bez produktu.
- Animacje czytają postęp z gry. Pauza zachowuje klatkę, a końcowa klatka jest dostępna tylko dla jawnego stanu `complete`. Grafika nie nalicza sama zakończonej produkcji.
- Transport gotowego jachtu na początek linii, oczekiwanie na odbiór i pusty powrót. Koła wynikają z przebytej drogi; jacht zachowuje ustawienie względem linii.
- Kontrola podwójnego wyświetlania jachtu oraz podwójnego transportera na stanowisku 12.
- Kontrola miejsca na drugą linię, podłogi i korytarza. Dwie linie mogą dzielić dokładnie ten sam przejazd o szerokości 10 m; silnik musi użyć wspólnej rezerwacji ruchu.
- SVG zgodny z kolejką `{depth, foot, svg}` obecnego `hall.ts`, w tym `data-foot` używane przy przestawianiu chodzących pracowników. Stanowiska trafiają osobno do wspólnego sortowania hali.

## Podłączenie do gry

Sprawdzony punkt odniesienia: `Piotr3009/Woodwork-Empire`, commit `e849f7703f0cd3c93e798214b633a439c1ebd912`, v115. Nie wykonano commita ani wdrożenia do gry.

Rozpakuj paczkę i sprawdź instalację na checkoutcie:

```sh
python3 scripts/install-into-game.py /sciezka/do/Woodwork-Empire
```

Następnie zastosuj pliki i poprawkę renderera:

```sh
python3 scripts/install-into-game.py /sciezka/do/Woodwork-Empire --apply
```

Instalator kopiuje kod do `src/render/yacht/`, atlasy do `public/sprites/yacht/game-assets/` i stosuje `integration/hall.patch`. Wymaga Python oraz Git. Sprawdza dokładną wersję `hall.ts` i istniejące pliki przed zmianami. Jeżeli plik gry się zmienił, zatrzyma się bez zapisu; wtedy trzeba dopasować patch do nowego kodu. Nie pobiera zależności, nie tworzy commita i nie zmienia ekonomii.

Silnik przekazuje rzeczywistą ramkę graficzną do istniejącego wywołania:

```ts
hallScene(state, { ...existingHallOptions, yachtFrames: framesFromEngine });
```

`framesFromEngine` jest jawnym argumentem hosta, nie istniejącym polem `GameState`. Każda ramka ma identyfikator linii, początek w metrach, obrót, 12 stanów stanowisk i opcjonalny stan transportera. Przykład: `integration/host-frame.example.mjs`; pełne typy: `game/yacht-line.d.mts`.

Po podłączeniu uruchom `npm run check` w repozytorium gry oraz sprawdź halę, pauzę, odbiór i dwie linie. Pakiet nie udaje wykonania tego testu na pełnej grze.

Aktualny silnik obsługuje rodzaje `window`, `door`, `house`. Claude musi dodać rodzaj jachtowy, zakup, produkcję i zapis zgodnie z uzgodnioną ekonomią oraz podać jego stan do renderera. **Paczka realizuje naszą część graficzną; instalacja samego patcha nie dodaje jachtów do katalogu zakupów.** Szczegóły: `integration/CURRENT-REPO-CONTRACT.md`.

## Kod i zasoby

| Plik / katalog | Zastosowanie |
| --- | --- |
| `game/yacht-line.mjs` | 12 stanowisk, transporter, kotwice, obroty, rozmieszczenie |
| `game/yacht-svg.mjs` | Przycinanie atlasów do klatki i kolejka SVG hali |
| `game/*.d.mts` | Deklaracje TypeScript |
| `game-assets/` | 48 atlasów produkcji, 48 pustych stanowisk, 16 atlasów transportu |
| `assets/` | 880 osobnych sprite'ów i zasoby wcześniejszego podglądu |
| `vendor/` | Kontrolery stanowiska i transportu z poprzedniego pakietu |
| `integration/hall.patch` | Konkretna poprawka bieżącego renderera hali |
| `scripts/install-into-game.py` | Kopiowanie modułu i zastosowanie poprawki |

W grze pełny diament 1 m ma 48 × 24 px; eksport bazowy ma 96 × 48 px. Adapter skaluje kotwice i bitmapy dokładnie jeden raz. Nie dzielić wymiarów ponownie i nie stosować lustrzanego odbicia. Fizyczny obrót 90° wybiera widok stanowiska 270°, a transporter 90°.

Gotowy produkt pozostaje do potwierdzonego przekazania. Silnik zmienia właściciela jachtu, potem nowa ramka pokazuje go na transporterze. Wejście transportera jest lokalne i nieobrócone; adapter przenosi je do świata jeden raz.

Całe sprite'y nie rozstrzygają zasłaniania transportera między przednimi i tylnymi częściami suwnicy. Dla takiego przejazdu potrzebne są warstwy lub wspólny bufor głębokości w rendererze hosta; dane modeli były w pełnym pakiecie jachtów. Limit jest jawny jako `occlusionMode: 'whole-sprite-depth-order'`. Patch nie zastępuje tego kompozytora.

## Sprawdzenie

```sh
npm test
```

Testy nie wymagają instalowania paczek. Walidacja atlasów potwierdziła identyczność wszystkich 832 spakowanych klatek z wcześniej przygotowanymi sprite'ami oraz 48 pustych grafik. Wykonane sprawdzenia opisuje `QA-GAME.json`.

Do wcześniejszego podglądu uruchom `START-PODGLAD.cmd` lub `npm start`. Wymaga Node.js 18+ albo Python. Podgląd pokazuje osobne próbki stanowisk; nie zastępuje stanu produkcji z silnika. Instrukcja: `README-PODGLAD.md`.
