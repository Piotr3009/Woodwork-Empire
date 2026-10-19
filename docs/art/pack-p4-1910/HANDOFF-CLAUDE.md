# Woodwork Empire - linia domow A, produkcja robotyczna

## Zakres i status

Piotr zlecil zakodowanie wszystkich szesciu etapow produkcji z zielonymi robotami, ramionami przemyslowymi i suwnicami, w stylu zaakceptowanej linii A. Ta paczka dostarcza grafiki, modele i adaptery do integracji. Nie zostala jeszcze wpieta do repozytorium ani silnika gry. Nie traktuj plikow podgladu jako osobnej aprobaty wszystkich detali graficznych.

Linia ma 6 stanowisk po 14 x 10 x 10 m, lacznie 84 x 10 x 10 m. Dom ma 8 x 6 m. Zachowany jest przejazd szerokosci 10 m obok linii i mozliwosc postawienia drugiej linii rownolegle. Gotowy dom jedzie z konca produkcji do strefy `deliveryReady` przy poczatku linii, jak w poprzedniej paczce transportu.

Produkcja ma 16 klatek na kazde stanowisko i 4 kierunki, czyli 384 klatki pracy. Osobno sa 24 puste stanowiska i 24 atlasy. Grafiki maja rzeczywisty kanal alpha, bez podlogi i cienia na podlodze. Grafiki produkcji zawieraja zielone roboty; nie potrzeba animacji pracownikow do obslugi tej wersji linii.

## Pliki do podlaczenia

| Plik / katalog | Rola |
| --- | --- |
| `assets/production/manifest.json` | Pelny opis produkcji, klatek, widokow, kotwic i modeli |
| `assets/production/station-NN-view-VVV-frame-FF.png` | Kompletna klatka stanowiska z produktem, platforma, robotami i suwnica |
| `assets/production/station-NN-view-VVV-empty.png` | Infrastruktura z zaparkowanymi robotami, bez domu, platformy i przenoszonego materialu |
| `assets/production/station-NN-view-VVV-atlas.png` | Alternatywny atlas 4 x 4 klatki; domyslny adapter wybiera pojedyncze PNG |
| `models/production/station-NN-frame-FF.npz` | Geometria metryczna kazdej klatki do poprawnego zaslaniania obiektow |
| `models/production/station-NN-empty.npz` | Geometria pustego stanowiska |
| `source/production-controller.mjs` | Szesciostanowiskowy kontrakt stanowisk, jednorazowe klipy, adapter obrazu, przekazanie do transportu |
| `source/delivery-route.mjs` | Istniejacy kontroler przejazdu koniec linii -> poczatek oraz powrotu pustej platformy |
| `source/delivery-visuals.mjs` | Dobor grafik transportera i fazy kol wedlug przebytej drogi |
| `assets/transport/sprite-manifest.json` | Zachowane grafiki transportera |
| `factory-layout.json` | Uklad linii, wspolnego przejazdu i stanowiska odbioru |
| `INTEGRATION-EXAMPLE.mjs` | Uruchamialna demonstracja kontraktu API z jawnymi atrapami fizycznego transferu |

`NN` to numer stanowiska 01..06, `VVV` to widok 000/090/180/270, `FF` to klatka 00..15. Dane w `assets/production/manifest.json` sa wiazace dla nowych animacji. Stare statyczne pliki w `assets/line/` sa zachowane dla zgodnosci z poprzednim pakietem; nie zastapuja nowego manifestu produkcji.

## Stany produktu i zadania

`stationIndex` jest liczony od 1. `productState` jest liczony od 0. Zachowaj ten podzial.

| Stanowisko | `jobType` | Stan na wejsciu | Stan po zakonczeniu |
| --- | --- | --- | --- |
| 1. Podloga | `floor-assembly` | 0: pusta platforma | 1: podloga |
| 2. Szkielet | `frame-assembly` | 1: podloga | 2: szkielet scian |
| 3. Poszycie i instalacje | `services-installation` | 2: szkielet scian | 3: OSB i instalacje |
| 4. Dach | `roof-installation` | 3: OSB i instalacje | 4: zamkniety dach |
| 5. Wykonczenie | `finishing` | 4: zamkniety dach | 5: wykonczony dom |
| 6. Kontrola | `quality-control` | 5: wykonczony dom | 6: dom sprawdzony, gotowy do transportu |

Stany 5 i 6 maja identyczny skonczony dom. Kontrola zmienia status produktu i pokazuje prace ramion kontrolnych; nie buduje ani nie rozbiera ponownie domu.

Nie lacz szesciu stanowisk w jeden wymuszony timer calej linii. Kazde ma osobny `HouseProductionController`. Silnik gry moze obslugiwac kilka domow jednoczesnie, buforowac produkty i blokowac stanowisko, gdy nastepne jest zajete.

## Sterowanie czasem i odbior produktu

```js
import {
  HouseProductionController, PRODUCTION_STATIONS, getProductionVisual,
  handOffToDelivery,
} from './source/production-controller.mjs';

const station = new HouseProductionController({
  id: 'line-1-station-2', stationIndex: 2,
  durationSeconds: gameJobDurationSeconds,
});

// Wywolaj dopiero po fizycznym ustawieniu podlogi na stanowisku nr 2.
station.start({
  jobId: 'house-42-frame', houseId: 'house-42',
  jobType: 'frame-assembly', productState: 1,
  // inputOutput: receiptFromStation1, // jesli uzywasz tokenow tej paczki
});

const snapshot = station.update(deltaSeconds);
const visual = getProductionVisual(snapshot, {
  rotation: 0, worldOrigin: [26, 0, 0], originPx: cameraOriginPx,
});
```

`durationSeconds` bierze sie z rzeczywistego zlecenia gry. Mozna podac inny czas przy kazdym `start()`. Klatka odpowiada `floor(progress * 15)`. Klatka 0 jest stanem wejsciowym, 15 stanem wyjsciowym. `update()` przyjmuje sekundy; zbyt duzy krok zatrzymuje sie na koncu biezacej operacji. Nie przenosi niewykorzystanego czasu do nastepnej produkcji ani do transportu.

Klip odtwarza sie raz i zatrzymuje na klatce 15. Nie zapetlaj GIF-a w silniku gry. W przeciwnym razie dach podnosilby sie ponownie, a gotowy dom wracal do niedokonczonego stanu.

`pause()` zatrzymuje klatke i postep, zachowujac produkt na stanowisku. `resume()` kontynuuje od tego samego miejsca. Gdy `state === 'complete'`, produkt pozostaje widoczny i blokuje stanowisko do czasu jawnego `takeOutput()`.

`drainEvents()` zwraca `productionComplete` raz na zakonczone zadanie. Zdarzenie oznacza zakonczenie operacji, nie odbior produktu i nie dostarczenie domu klientowi. Samo wywolanie `getSnapshot()` ani odczyt obrazu nie zmienia stanu.

`resourceHeld` oznacza zajecie stanowiska przez ten produkt. Pobieranie surowcow, ceny, energia, odblokowania i rezerwacje zasobow magazynowych pozostaja w istniejacej logice gry.

## Przekazanie pomiedzy stanowiskami

Kolejnosc integracji:

1. Biezace stanowisko osiaga `complete` i trzyma klatke 15.
2. Silnik rezerwuje nastepne stanowisko oraz droge przejazdu. Jesli nie moze, biezacy dom nadal czeka na stanowisku.
3. Silnik wywoluje `takeOutput()`. Od tego momentu silnik transferu jest wlascicielem produktu i jego ruchomej grafiki.
4. Stanowisko przechodzi na grafike `empty`. Nie rysuj jednoczesnie jego gotowego domu i drugiego domu na ruchomej platformie.
5. Silnik fizycznie przemieszcza produkt do nastepnego stanowiska.
6. Po dotarciu silnik wywoluje `start()` nastepnego stanowiska z tym samym `houseId`, nowym `jobId` i zgodnym `productState`. Opcjonalne `inputOutput` przyjmuje oryginalny token zwrocony przez `takeOutput()`.

Ten pakiet nie implementuje automatycznego przemieszczania miedzy stanowiskami 1..6. Nie wolno zastepowac fizycznego transferu natychmiastowym uruchamianiem kolejnego stanowiska w grze. Przyklad API jawnie uzywa atrap takich potwierdzen, aby pokazac sam kontrakt kontrolerow.

Token `takeOutput()` moze zostac wykorzystany tylko raz przy przekazaniu. Bledny lub zajety odbiorca nie zuzywa tokena. Kontroler stanowiska odrzuca ponowne wykorzystanie tego samego `jobId` lub `houseId`. To zabezpieczenie w ramach danej instancji; globalna unikalnosc produktu i przenoszenie miedzy liniami nalezy do magazynu/silnika gry.

Tokeny sa obiektami w pamieci. Nie klonuj ich przez JSON przed przekazaniem do `start({inputOutput})` lub `handOffToDelivery()`. Adapter nie zawiera serializacji ani odtwarzania zapisu gry. Powiaz go z istniejacym zapisem produktu, postepu i wlasciciela w grze; nie odtwarzaj odebranych juz wynikow przez ponowne wywolywanie zakonczenia. Gdy silnik ma wlasny trwaly system przenoszenia produktow, `start()` moze otrzymac sprawdzony przez ten system `houseId` i `productState` bez `inputOutput`.

## Kontrola -> transport -> delivery ready na poczatku

Po ukonczeniu stanowiska 6 zachowaj produkt na klatce 15, dopoki transporter nie jest dostepny przy koncu linii. Nastepnie silnik potwierdza fizyczne zabezpieczenie domu na platformie i jawnie oddaje wynik:

```js
const readyHouse = station6.takeOutput();
handOffToDelivery(readyHouse, deliveryController);
```

`handOffToDelivery()` wymaga wyniku ze stanowiska 6 w stanie 6. Sprawdza, czy transporter jest wolny, istnieje w swiecie i stoi na koncu trasy. Dopiero wtedy wywoluje istniejace `deliveryController.start(houseId)` oraz `confirmLoaded()`. Ponowne przekazanie tego samego wyniku jest blokowane. Gdy przewoznik jest zajety, zachowaj token i produkt w kontrolowanym przez silnik buforze albo poczekaj z `takeOutput()`.

Ruch startuje po `deliveryController.update(dt)` i uzyskaniu rezerwacji przejazdu. Obie linie musza uzywac TEJ SAMEJ instancji `createAisleReservation()`.

| Punkt domyslnej trasy | Srodek platformy [x, y] w metrach |
| --- | --- |
| Koniec produkcji | [89, 5] |
| Wjazd do przejazdu | [89, 15] |
| Powrot w strone poczatku | [6, 15] |
| `deliveryReady` na poczatku | [6, 5] |

Dotarcie do `deliveryReady` pozostawia dom na platformie. Dopiero potwierdzone przez gre `completeDelivery()` odbiera dom, zwieksza licznik dostaw i rozpoczyna domyslny powrot pustego transportera. Nie naliczaj dostawy przy `productionComplete`, `takeOutput()` ani `handOffToDelivery()`.

## Kamera, rotacje i zaslanianie

Uzywaj istniejacej projekcji 2:1: `x = 48 * (X - Y)`, `y = 24 * (X + Y) - 48 * Z`. Obiekty sa metryczne, z tym samym oswietleniem swiata. Nie obracaj gotowego PNG o 90 stopni i nie odbijaj go w poziomie.

`getProductionVisual()` otrzymuje fizyczna rotacje swiata i dobiera widok L3 o przeciwnym znaku:

| Fizyczna rotacja | Widok pliku | Kotwica PNG [x, y] |
| --- | --- | --- |
| 0 | 000 | [488, 488] |
| 90 | 270 | [1160, 728] |
| 180 | 180 | [680, 1064] |
| 270 | 090 | [8, 824] |

Kazda klatka ma rozmiar 1168 x 1072 px. Kotwica jest projekcja lokalnego punktu stanowiska `[0,0,0]`. `worldOrigin` w adapterze oznacza pozycje tego punktu dla KONKRETNEGO stanowiska, nie poczatek calej linii. Dla nieobroconej pierwszej linii sa to kolejno `[12,0,0]`, `[26,0,0]`, `[40,0,0]`, `[54,0,0]`, `[68,0,0]`, `[82,0,0]`. Przy obrocie calej linii obroc rowniez te przesuniecia.

Podczas pracy kompletna klatka stanowiska ma juz poprawna kolejnosc domu, robotow i suwnicy wewnatrz tego stanowiska. Przy przejezdzajacej platformie, sasiednich stanowiskach i innych przecinajacych sie sylwetkach nie wystarcza narysowanie calej suwnicy nad lub pod calym domem. Uzyj metrycznej geometrii NPZ i wspolnego bufora glebi albo sprawdzonego w silniku podzialu na warstwy przed/za produktem. Podglad calej sceny korzysta z geometrii metrycznej, aby zachowac takie zaslanianie. Ten wymog dotyczy rowniez wjazdu i wyjazdu domu z ostatniego stanowiska.

Puste grafiki produkcji nie zawieraja domu ani platformy. Zachowuja roboty w pozycji spoczynkowej. Stan `idle` nie moze pokazywac klatki 0 poprzedniego produktu, bo np. na stanowisku 6 oznaczaloby to drugi, nieistniejacy dom.

## Uruchomienie i sprawdzenie adapterow

Z katalogu tej paczki:

```sh
node INTEGRATION-EXAMPLE.mjs
node --test tests/production-controller.test.mjs tests/delivery-route.test.mjs tests/delivery-visuals.test.mjs
```

Przyklad sprawdza ciag stanow 0..6, jednorazowy wynik kontroli, droge do poczatku linii i powrot pustej platformy. Wypisuje kazdy symulowany transfer jako atrape. Nie renderuje ani nie przemieszcza obiektow w prawdziwej grze.

Testy obejmuja m.in. nieregularne kroki czasu, pauze, brak zapetlenia po klatce 15, bledne dane, blokade zbyt wczesnego odbioru, pojedyncze zuzycie tokena, poprawne kotwice czterech widokow i wspoldzielony przejazd dla dwoch linii. Walidacja geometrii i wyeksportowanych grafik jest osobna od testow tego adaptera.
