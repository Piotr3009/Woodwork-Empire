# Woodwork Empire Tycoon: L3 / FINAL

**Status: FINAL, zatwierdzone przez Piotra 11.10.2026.** Paczka zawiera dokładnie te grafiki i animacje, które zostały zaakceptowane wiadomością „akceptajca jest”. Repozytorium ani kod gry nie zostały zmienione.

## Zawartość

| Folder lub plik | Zawartość |
|---|---|
| `approved-previews/` | Plansza statyczna, osiem GIF-ów kierunkowych i dwa porównania czterech kierunków. |
| `sprites-2x/0/`, `sprites-2x/90/` | Paleta 10 okien w dwóch widokach; PNG 160 × 172 px, RGBA. |
| `sheets/` | Dwa arkusze wózka: pustego i z ładunkiem, wraz z JSON-ami. |
| `frames/` | Wszystkie 48 klatek wózka; pojazd pozostaje w tym samym miejscu komórki. |
| `masters/` | Rendery w sześciokrotnej rozdzielczości, przed zmniejszeniem do skali gry. |
| `models/` | Siatki 3D poszczególnych faz, ich normale i materiały. |
| `source/` | Kod modeli, ruchu, renderowania, podglądów i walidacji. |
| `reports/`, `dimensions.json`, `validation.json`, `camera-QA.md` | Wymiary, kotwice i wyniki kontroli. |
| `reference/` | Brief, wygląd wcześniejszego wózka oraz źródła L2 potrzebne do porównania okien. |

Okna, szkło, folia i kartonowe narożniki pochodzą bez skalowania z zatwierdzonej nakładki L2 `stack10`. Dodano drewnianą paletę. Wózek z ładunkiem przewozi ten sam zestaw.

Wcześniejsza referencja standardowego wózka była obrazem rastrowym. Nowy model 3D odtwarza jej zielony korpus, ciemny maszt i otwartą osłonę kierowcy. Dodano kierowcę w kamizelce odblaskowej, obrót kół i delikatny ruch ciała.

Obrazy do gry mają przezroczyste tło, bez tekstu, podłogi i rzucanego cienia. Podpisy oraz tło występują wyłącznie na podglądach. Szczegóły użycia arkuszy znajdują się w `HANDOFF-CLAUDE.md`.

## Odtworzenie

Wymagania: Python 3.12, działający OpenGL/EGL (np. Mesa) oraz pakiety z `source/requirements.txt`. Poniższe polecenia uruchom z głównego katalogu rozpakowanego ZIP-a:

```bash
python -m pip install -r source/requirements.txt
python source/build_l3.py --output l3-output
python source/make_previews_l3.py --output l3-output
python source/validate_l3.py --output l3-output --reference-l2 reference/l2-source --brief reference/brief-1110/zamowienie-gpt-l3-s1-1110.md
```

Animacja ma 6 klatek i działa z prędkością 8 fps, czyli jej pętla trwa 0,75 s. GIF zapisuje czas w setnych sekundy, dlatego podglądy używają naprzemiennie 120 i 130 ms na klatkę. JSON-y do gry deklarują 8 fps.

Folder `approved-previews/` zachowuje zaakceptowane plansze i GIF-y bez zmiany bajtów; widoczny na nich dawny napis o zatwierdzeniu oznacza etap ich wykonania. Akceptację zapisano w `approval.json`. Ponowne wygenerowanie grafik tworzy nowy podgląd wymagający osobnej oceny; skrypty nie przenoszą automatycznie akceptacji na nowe rendery. Następnym etapem jest S1. Opcjonalne L2b wymaga osobnego potwierdzenia Piotra i nie zostało rozpoczęte.
