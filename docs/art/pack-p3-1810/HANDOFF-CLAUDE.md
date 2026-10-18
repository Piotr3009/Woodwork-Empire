# P3: przekazanie dla Claude'a

Copyright (c) 2026 Skylon Development Ltd. All rights reserved.

**Status: PODGLĄD, oczekiwanie na akceptację Piotra.** Nie jest to wdrożenie do gry
ani wydanie FINAL. Stan niezależnej kontroli ustala dołączony raport QA, a nie ten
opis. Nie należy przenosić akceptacji z L1, L2, L3 lub S1 na nową paczkę P3.

## Zakres

Nowe klucze grafiki: `doorLine1.standard` do `doorLine6.standard`,
`doorPallet.standard` i `vehicle.forklift.driveLoadedDoor`.
Paczka dostarcza grafikę, modele oraz ruch. Nie zmienia repozytorium gry, ekonomii,
przepustowości linii, zamówień, ścieżek pracowników ani logiki magazynu.

| Moduł | Stanowisko i wyrób |
|---|---|
| 1 | piła poprzeczna, popychacz, strugarka czterostronna, surowy element dębowy |
| 2 | CNC pięcioosiowe, brama, uchylna głowica, wrzeciono i indeksowana karuzela; elementy drzwi |
| 3 | głowice szczotkowe i zamknięta taśma szlifierska; elementy drzwi |
| 4 | prasa pozioma działająca z czterech stron; całe skrzydło |
| 5 | robot lakierniczy w kabinie, skrzydło na szynie podwieszanej |
| 6 | szklenie, okucia, ościeżnica, pakowanie i suwnica odkładająca komplet na paletę |

Obudowy są jasnoszare, z niebieskimi drzwiczkami i akcentami. Drewno to jasny dąb,
po lakierowaniu z łagodnym połyskiem. Brak napisów, marek i ludzi, poza kierowcą L3.

## Kamera, rejestracja i obrót

Rzut plików 2x, bez perspektywy, w metrach:

```text
sx = ox + 48 * (x - y)
sy = oy + 24 * (x + y) - 48 * z
```

Macierz ma postać `[[a,b,c,tx],[d,e,f,ty]]`, czyli działa bezpośrednio na punkt
modelu kanonicznego. Widok 90 to fizyczny obrót `(x,y,z) -> (y,w-x,z)`,
z wyznacznikiem +1. Nie wolno zastąpić go odbiciem PNG ani dawnym obrotem L1.

| Rodzina | Obwiednia m | Płótno px | Kotwica 0 | Kotwica 90 |
|---|---|---|---|---|
| moduły | 6 x 3 x 3 | 448 x 376 | (296,368) | (152,368) |
| paleta | 2 x 1 x 1.75 | 160 x 172 | (104,164) | (56,164) |

| Rodzina i widok | Macierz źródło -> piksel |
|---|---|
| moduł 0 | `[[48,-48,0,152],[24,24,-48,152]]` |
| moduł 90 | `[[48,48,0,8],[-24,24,-48,296]]` |
| paleta 0 | `[[48,-48,0,56],[24,24,-48,92]]` |
| paleta 90 | `[[48,48,0,8],[-24,24,-48,140]]` |

Punkt podłogowy kotwicy to `(w,d,0)` w widoku 0 oraz `(0,d,0)` przed obrotem w
widoku 90. Źródłowa macierz, geometria i dowody renderu są podstawą rejestracji.
W narożniku obwiedni może nie być podpory. Nie dodano tam sztucznych pikseli,
niewidocznej geometrii ani fikcyjnych stóp tylko po to, by zapełnić kotwicę.

Światła są stałe w przestrzeni świata dla obu widoków i wszystkich klatek:
`[-2.5,4.5,7]`, `[5,-3,4]`, `[-3,-4,6]`. Obraca się model, nie światło.
Brak podłogi, tła i rzuconego cienia. Renderer wykorzystuje zachowany shader L3.

## Łączenie stanowisk

Kolejny moduł jest przesunięty o `(288,144)` px w widoku 0 lub `(288,-144)` px
w widoku 90. Nie skalować pojedynczych modułów, nie kadrować do ich widocznej alfy.

| Styk | Punkt modelu m | Piksel 0 | Piksel 90 |
|---|---|---|---|
| przenośnik, wejście | (0,1.5,0.9) | (80,144.8) | (80,288.8) |
| przenośnik, wyjście | (6,1.5,0.9) | (368,288.8) | (368,144.8) |
| szyna, wejście | (0,1.5,2.8) | (80,53.6) | (80,197.6) |
| szyna, wyjście | (6,1.5,2.8) | (368,197.6) | (368,53.6) |

Przenośnik ma powierzchnię transportową y=1..2 m i górę rolek z=0.9 m.
Wejścia dotyczą M2 do M6, wyjścia M1 do M5. W M6 transport kończy się przy stole,
a nie na końcu obwiedni. Szyna podwieszana łączy wejście i wyjście M5 oraz M6.
Raport dowodowy wskazuje zakresy trójkątów powierzchni transportowych, nie obudów.

## Odtwarzanie ruchu

`doorLineN.standard.work.sheet.png`: 12 klatek w jednym rzędzie, komórka 448 x 376,
arkusz 5376 x 376, 6 fps, pętla 2 s. Kotwica każdej klatki: `(296,368)`.
Fazy eksportowane do PNG to `0/12` do `11/12`; model fazy `12/12` jest wyłącznie
sprawdzeniem zamknięcia pętli i nie jest trzynastą komórką. Pierwsza komórka ma
te same piksele co odpowiedni obraz statyczny w `sprites-2x/0/`.

Ruch zmienia geometrię modeli. Cały obraz, kamera i kotwica pozostają nieruchome.
AO statycznych trójkątów pochodzi z fazy 0. Pole `ao` w NPZ przechowuje wejście
FrozenAO: dla powierzchni nieprzezroczystych jest ono używane bez zmian. W przebiegu
przezroczystości shader ustawia AO na zero dla rodzajów materiału 5, 8 i 9.
Nie przeliczać statycznego AO niezależnie dla każdej klatki.

## Drzwi, paleta i stos

Skrzydło ma 1.92 x 0.82 x 0.044 m: dwie osobne szyby w górnej części i płycinę
na dole. Komplet z ościeżnicą ma 1.98 x 0.88 x 0.10 m, trzy zawiasy, zamek i klamkę.
Pakowany komplet ma folię i kartonowe narożniki. Długość skrzydła leży wzdłuż X.
Na rolkach oś wyrobu przypada w y=1.5 m.

Paleta to **nowy wariant czterostronnego wjazdu**, a nie identyczna konstrukcja
palety L3. Wymiary zewnętrzne: 2 x 1 x 0.228 m. Ma 17 drewnianych brył:

| Element | Zakres X m | Zakresy Y m | Zakres Z m | Liczba |
|---|---|---|---|---:|
| dolne deski | 0..2 | 0..0.16; 0.42..0.58; 0.84..1 | 0..0.04 | 3 |
| klocki | 0..0.18; 0.91..1.09; 1.82..2 | 0..0.16; 0.42..0.58; 0.84..1 | 0.04..0.18 | 9 |
| deski pokładu | 0..2 | 0..0.18; 0.205..0.385; 0.41..0.59; 0.615..0.795; 0.82..1 | .18..0.228 | 5 |

Spód pokładu jest na `.18` m, jego góra na `.228` m, grubość wynosi 48 mm.
To pozwala położyć nowy ładunek na niezmienionych widłach L3 przy spodzie palety
0.15 m nad podłogą. Ta sama geometria palety występuje w M6, osobno i na wózku.

W M6 paleta jest przesunięta o `[3.8,1,0]`, zatem zajmuje x=3.8..5.8, y=1..2.
Komplet o indeksie k, licząc od zera, ma przesunięcie lokalne na palecie:

```text
[0.01, 0.06, 0.228 + 0.105*k], k = 0..9
```

Wierzch dziesiątego kompletu wynosi `0.228 + 9*0.105 + 0.100 = 1.273` m.
W briefie zapisano też 1.278 m; ta liczba wymaga dodatkowej końcowej pianki 5 mm.
Wybrano podane równania układania dziesięciu kompletów, bez osobnej pianki na górze.
Nie zmieniać skali drzwi, by osiągnąć sprzeczną wysokość.

`stackNN` zawiera dokładnie NN kompletów, kumulacyjnie, bez palety i maszyny.
W grze rysować tylko jedną nakładkę naraz, na tej samej kotwicy co M6. Dla pustej
palety nie rysować żadnej. Zakresy produktów są oddzielone od całej geometrii
maszyny, w tym jej ruchomych części, na potrzeby bufora głębokości i kontroli.
Zasłonięte przez maszynę fragmenty nie mogą pojawiać się na wierzchu jej grafiki.

**Arkusz M6 odkłada komplet na pustą paletę; Claude synchronizuje wzrost NN z
zniknięciem chwilowego produktu, tak jak w L2.**

Nakładki nie mają kryjącego piksela na podłogowej kotwicy, ponieważ zawierają tylko
produkty nad paletą. Jest to udokumentowany wyjątek, nie błąd rejestracji.

## Wózek z nowym ładunkiem

Wózek i kierowca, w tym widły, zachowują siatki, normale, materiały i kolejność
trójkątów L3. Nowa geometria ładunku jest dopisywana za modelem pojazdu.
Kanoniczny kierunek jazdy i wideł to +X. Transformacja lokalnej palety:

```json
[[0,1,0,0.5],[-1,0,0,1],[0,0,1,0.15],[0,0,0,1]]
```

Ładunek ma 2 m w poprzek jazdy, zajmuje x=0.5..1.5 m, y=-1..1 m, a spód palety
z=0.15 m. Spód jej pokładu po przeniesieniu jest na z=0.33 m, tak jak powierzchnia
nośna wideł L3. Widły wchodzą w rzeczywiste wolne kieszenie pomiędzy klockami.
Końcówki oryginalnych wideł wystają przed paletę; nie skracano modelu pojazdu.

| Wiersz | Kierunek | Obrót rzeczywistego modelu |
|---:|---|---:|
| 0 | sw, +Y | +90 stopni |
| 1 | se, +X | 0 stopni |
| 2 | nw, -X | 180 stopni |
| 3 | ne, -Y | -90 stopni |

Komórka ma 272 x 256 px, arkusz 1632 x 1024 px, kotwica `(136,192)` w każdej
komórce, 6 klatek na kierunek i 8 fps. Przemieszczenie po hali wykonuje gra.
Kotwica jest punktem podłogi pod podwoziem. Prawdziwy pojazd może mieć geometrię
poniżej jej wiersza; obowiązuje margines alfy 8 px wokół komórki, nie ogólna zasada
najniższego piksela stosowana do statycznych obiektów obwiedniowych.

## Źródła, kontrola, wydanie FINAL

Odtworzenie: polecenia w `README.md`, wersje w `source/requirements.txt`, pochodzenie
w `source/SOURCE-MANIFEST.md`. Kamera, shader i stałe światła L3 są zachowane.
Mastery 6x powstają w rendererze; arkusze i klatki mają identyczne piksele.
`reports/p3-evidence.json` wiąże render z NPZ, macierzą, rzeczywistymi uniformami,
zakresami geometrii oraz SHA256.

Niezależny QA sprawdza dane i obrazy, w tym wszystkie 120 kombinacji stosów z
klatkami M6. Niniejszy handoff nie przyznaje PASS. Oczekujemy na akceptację Piotra;
nie ma `approval.json` ani zgody na oznaczenie tej paczki jako FINAL. Po zgodzie
należy zachować zatwierdzone obrazy, klatki, mastery oraz podglądy bajt w bajt,
zapisać rzeczywiste słowa Piotra i SHA256 zatwierdzonego archiwum, a następnie
przeprowadzić kontrolę zgodności FINAL i wygenerować końcowe sumy kontrolne.

Metadane producenta powstają przez `python source/finalize_p3.py`. Po skopiowaniu
niezależnego raportu QA użyć tylko `python source/finalize_p3.py --checksums-only`,
aby uaktualnić spis plików bez nadpisania statusu QA pełną regeneracją metadanych.
