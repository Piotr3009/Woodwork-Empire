# P1: niezalezna kontrola kamery i grafiki

Copyright (c) 2026 Skylon Development Ltd. All rights reserved.

Kontrola: QA-P1, 18.10.2026. Wykonawca kontroli nie tworzyl ani nie poprawial modeli lub grafik.
Liczby testowe przepisano bezposrednio z zamowienia P1. Nie importowano walidatora wykonawcy.
Pelny wynik i dowody: `reports/qa-P1.json`. Obejrzenie obrazow i ich hashe: `reports/p1-visual-review.json`.

## Wynik

PASS dla czterech sprite'ow, czterech masterow i dwoch plansz podgladowych.
Jest to kontrola paczki PODGLAD, nie akceptacja artystyczna Piotra ani zgoda na FINAL.

## Pliki i kotwice

| Obiekt | Widok | Canvas | Kotwica | Najnizszy piksel alfa | Marginesy lewy/gorny/prawy/dolny |
|---|---|---|---|---|---|
| glassShelter.standard | 0 | 736 x 520 | 584,512 | y=511 | 8/9/8/8 px |
| glassShelter.standard | 90 | 736 x 520 | 152,512 | y=511 | 8/9/8/8 px |
| timberShelterLarge.standard | 0 | 1024 x 712 | 872,704 | y=703 | 8/9/8/8 px |
| timberShelterLarge.standard | 90 | 1024 x 712 | 152,704 | y=703 | 8/9/8/8 px |

W kazdym przypadku kryjacy piksel alfa >=128 lezy w oknie x=kotwica +/-1,
y=kotwica-3 do kotwica. Ponizej kotwicy brak pikseli alfa. Osiem pikseli od
lewej, prawej i gornej krawedzi jest calkowicie przezroczyste.
PNG: RGBA, 8 bitow, pelne dekodowanie bez bledow, brak iCCP/sRGB/gAMA/cHRM.
Mastery: odpowiednio 4416 x 3120 oraz 6144 x 4272, czyli dokladnie 6 razy wymiary pliku gry.

## Kamera i modele

Wzor shaderu: `sx=ox+48*(x-y)`, `sy=oy+24*(x+y)-48*z`.
Krawedzie wzdluz X i Y maja nachylenia +0.5 i -0.5, piony maja zerowe przesuniecie X.
W widoku 90 os X modelu idzie wzdluz ujemnej osi Y swiata, zgodnie z wymaganym obrotem.
Sprawdzono krawedzie rzeczywistej siatki, nie tylko hipotetyczne wektory jednostkowe:

- Szklo: 45660 trojkatow, 23858 krawedzi osi X, 7580 osi Y, 10480 osi Z.
- Tarcica: 116340 trojkatow, 41346 krawedzi osi X, 43620 osi Y, 48232 osi Z.
- Maksymalna numeryczna roznica nachylenia: 1.166e-15.
- Wszystkie wierzcholki mieszczą sie w obwiedniach, podstawy dotykaja z=0.
- Maksima siatek: (12,3,2.9846032252) oraz (18,3,3.9846032252).
- Zapisano normalne jednostkowe i materialy w NPZ.

Obrot 90: `(x,y,z)->(y,w-x,z)`. Macierz liniowa ma wyznacznik +1, nie jest lustrem.
Hash tablicy trojkatow z NPZ jest taki sam w obu raportach renderu danego modelu.
Sprawdzono rzeczywiste `uniforms.origin`, `uniforms.model_transform`, `sourceToPixel`
i kotwice przeciwko niezaleznym wartosciom zamowienia.

Swiatla swiata w obu widokach: (-2.5,4.5,7), (5,-3,4), (-3,-4,6).
Adapter `render_l3.py` jest identyczny z S1. `render3d.py` ma tylko zamiane dlugiego
myslnika na zwykly w komentarzu o zakresach materialow; shader nie zostal zmieniony.
Przeczytano kod eksportu, shader i kod plansz. Pliki gry pochodza z realnej geometrii 3D.

## Oglad obrazow

Obejrzano osobno wszystkie cztery PNG, obie pelne plansze, odniesienia S1 i glassRackLarge
oraz detal mastera szklenia. Dachy, rytm swietlikow, zielona konstrukcja i otwarte fronty
sa czytelne. Widoczne sa pakiety szyb, gumowe podkladki, cztery poziomy drewna, tasmy
oraz szare ramiona. W sprite'ach nie ma tekstu, cyfr, marek, ludzi, otaczajacej podlogi
ani zewnetrznego rzucanego cienia. Dozwolona stopa betonowa pozostaje wewnatrz obwiedni.

Mur w planszy ma tylna krawedz korony Y=3.1,Z=3.5. Promien do kamery porusza sie
w kierunku (1,1,1), zatem warunek widocznosci to z>y+0.4. W drugim rzedzie to z>y-3.6.
Dach szkla w pierwszym rzedzie i caly dach tarcicy pozostaja czytelne.
W drugim rzedzie widac kompletne wiaty. Zaslanianie wynika z rzeczywistego bufora glebi.

## Doprecyzowania briefu

Ekstrema rzutu osmiu rogow obwiedni leza 8 px od granic canvasu. Nie oznacza to,
ze kazdy pojedynczy rog lezy jednoczesnie na skrajnej krawedzi obrazu.
Mnoznik 0.8165 dla alternatywnej fizycznej kamery jest przyblizeniem sqrt(2/3).
Tu shader stosuje macierz dokladnie i nie wymaga korekty Z w grze.
Opisowe 2.6 m dachu widocznego za murem zaklada stale z=3; przy dachu jednospadowym
stosuje sie nierownosc widocznosci punkt po punkcie.

Po akceptacji Piotra FINAL wymaga ponownego sprawdzenia bajtow wzgledem zatwierdzonego
ZIP-a PODGLAD oraz wszystkich pozycji `checksums.sha256`.
