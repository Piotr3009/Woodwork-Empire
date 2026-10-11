# Przekazanie L1: linia produkcyjna

Piotr zaakceptował podglądy słowem „super” 11.10.2026 (Europe/London). Paczka obejmuje wyłącznie L1: sześć modułów, każdy w widokach 0° i 90°. Nie wprowadzono zmian w repozytorium.

## Pliki i osadzenie

W katalogach [sprites-2x/0/](sprites-2x/0/) i [sprites-2x/90/](sprites-2x/90/) znajduje się po sześć plików: `windowLine1.standard.png` do `windowLine6.standard.png`, łącznie 12 PNG. Każdy ma 448 × 376 px, RGBA8 i przezroczyste tło. Logiczna obwiednia każdego modułu: 6 × 3 × 3 m.

| Widok | Kotwica w PNG | Przesunięcie kolejnego modułu |
|---|---|---|
| 0° | (296, 368) px | (+288, +144) px |
| 90° | (152, 368) px | (−288, +144) px |

Nie przycinać płótna ani nie przesuwać grafiki względem kotwicy. Widok 90° powstał przez fizyczny dodatni obrót tego samego modelu: `X = 3 − y`, `Y = x`, `Z = z`, przy stałej kamerze i oświetleniu. To konwencja tej nowej linii; nie zastępować jej odbiciem ani wcześniejszą konwencją obrotu innych maszyn.

## Styki modułów

| Transport | Punkty lokalne wejście → wyjście [m] | Widok 0° [px] | Widok 90° [px] |
|---|---|---|---|
| Rolki, M1 do M6 | (0; 1,5; 0,9) → (6; 1,5; 0,9) | (80; 144,8) → (368; 288,8) | (368; 144,8) → (80; 288,8) |
| Szyna podwieszana, M5 i M6 | (0; 1,5; 2,8) → (6; 1,5; 2,8) | (80; 53,6) → (368; 197,6) | (368; 53,6) → (80; 197,6) |

Stosować przesunięcia z tabeli kotwic. Końce rzeczywistej geometrii i zgodność przekrojów połączeń zostały sprawdzone. `exactProjectionVerified: true`; wszystkie 12 widoków przeszło niezależną kontrolę projekcji, kotwic i fizycznego obrotu. Minimalny zmierzony margines wynosi 12 px przy wymaganych 8 px.

## Ustalenia wizualne i zakres

- M6: pusta paleta stoi na podłodze obok zwężonego końcowego odcinka rolek; ciągłość transportu pozostaje zachowana.
- M5: panel dachu jest przezroczysty i zamknięty, dzięki czemu robot pozostaje widoczny.
- Zachować zaakceptowane odbicia materiałów oraz ustawienie maszyn.
- Katalogi `sheets/` i `overlays/` są celowo puste. L2 i L3 stanowią osobne zamówienia i nie należą do tej paczki.

Integrację należy wykonać w istniejącym projekcie według jego faktycznej struktury; ta paczka nie narzuca ścieżek repozytorium.
