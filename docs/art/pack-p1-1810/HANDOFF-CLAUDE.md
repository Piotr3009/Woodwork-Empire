# P1: przekazanie grafiki Claude'owi

Copyright (c) 2026 Skylon Development Ltd. All rights reserved.

Etap PODGLAD, do zatwierdzenia przez Piotra. Ta paczka nie jest zgoda na wdrozenie.

1. Uzyj plikow `sprites-2x/0` i `sprites-2x/90` bez kadrowania, rozciagania ani korekty Z.
2. Zachowaj obwiednie, kotwice i macierze z `dimensions.json`.
3. Klucze gry to `glassShelter.standard` i `timberShelterLarge.standard`.
4. Widok 90 wynika z `(x,y,z) -> (y,w-x,z)`. Nie odwracaj PNG lustrzanie.
5. Tlo, szary mur i napisy wystepuja tylko na planszach. Gra rysuje wlasny mur, cien i tabliczke stanu.
6. W plikach gry nie ma tla, podlogi, rzucanego cienia, ludzi, napisow i tabliczek.
   Beton o wysokosci 0,15 m jest konstrukcyjna stopa wewnatrz obwiedni.

## Kamera

Rzut bez perspektywy: `sx=ox+48*(x-y)`, `sy=oy+24*(x+y)-48*z`.
Piony pozostaja pionowe; krawedzie poziome maja nachylenie +0,5 i -0,5.
Rzut zostal zastosowany w shaderze EGL bez dodatkowej korekty w grze.
Swiatla w obu orientacjach sa te same: klucz (-2.5,4.5,7), wypelnienie (5,-3,4), kontra (-3,-4,6).

## Widocznosc za murem

Plansza modeluje korone od Y=3,1 do Y=4,0 na Z=3,5. Front muru ma Y=4.
Dla pierwszego rzedu D=4-y: widoczne jest `z > 4.4-D`, czyli `z > y+0.4`.
Drugi rzad przesuwa model o -4 m w Y: widoczne jest `z > y-3.6`.
Zaslanianie wynika z bufora glebi rzeczywistej geometrii muru, bez arbitralnego prostokatnego kadru.

Dach jest jednospadowy. Dlatego opisowe 2,6 m widocznego dachu szkla jest przyblizeniem
dla stalej wysokosci 3 m. Tutaj stosujemy warunek widocznosci punkt po punkcie, tak jak w grze.

## Zawartosc modeli

- Szklo: 336 IGU, kazde ma 2 tafle 4 mm i ramke z dystansem 16 mm, lacznie 24 mm.
  Stojaki A maja gumowe podkladki; szyby maja przezroczysty material kind=5 i jasne krawedzie.
- Tarcica: 1536 osobnych desek, 16 pakietow, 4 poziomy, szare ramiona 2,2 m,
  tasmy i przekladki. Uslojenie jest liczone w przestrzeni modelu i obraca sie z modelem.
- `inventoryLiteral=false`. Nie zmieniaj pojemnosci ani cen w grze na podstawie liczby desek lub szyb w modelu.

## Ograniczenia i odstepstwa

Nie zmieniono zakresu zamowienia. Pojemnosci sa symbolizowane gestymi pakietami zgodnie z briefem.
Przezroczystosc wielu ulozonych szyb kumuluje sie, wiec pelny pakiet jest znacznie mniej przejrzysty
niz pojedyncza tafla. Zastosowano te same ustawienia szkla i shader co w rendererze S1/L3.

Przed FINAL potrzebne sa slowa akceptacji Piotra, wpis approval.json i niezalezny test
zgodnosci bajtowej z zatwierdzonym ZIP-em PODGLAD. Na tym etapie nie ma approval.json.
