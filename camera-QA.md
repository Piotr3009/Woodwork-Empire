# Kamera — paczka 1

Wszystkie 13 plików: `exactProjectionVerified: true`. Obrazy po zatwierdzeniu pozostały identyczne bajtowo.

Kamera wynika z geometrii modeli 3D i wzoru `sx = ox + 48*(X-Y)`, `sy = oy + 24*(X+Y) - 48*Z`. Nie stosowano transformacji bitmap ani dodatkowego ściskania Z.

Widok 90 obraca model: `(x,y,z) → (y,w-x,z)`. Kamera i światło pozostają stałe. Kotwica jest rzutem najbliższego narożnika podłogowego, a nie najniższego widocznego piksela.

| Plik | Oś X po rzucie | Oś Y po rzucie | Kotwica px | exactProjectionVerified |
|---|---:|---:|---|---|
| `sprites-2x/0/sander.used.png` | +0.5 | -0.5 | 104, 128 | true |
| `sprites-2x/90/sander.used.png` | -0.5 | +0.5 | 56, 128 | true |
| `sprites-2x/0/sander.budget.png` | +0.5 | -0.5 | 104, 140 | true |
| `sprites-2x/90/sander.budget.png` | -0.5 | +0.5 | 56, 140 | true |
| `sprites-2x/0/sander.standard.png` | +0.5 | -0.5 | 104, 152 | true |
| `sprites-2x/90/sander.standard.png` | -0.5 | +0.5 | 56, 152 | true |
| `sprites-2x/0/sander.pro.png` | +0.5 | -0.5 | 152, 212 | true |
| `sprites-2x/90/sander.pro.png` | -0.5 | +0.5 | 104, 212 | true |
| `sprites-2x/0/sander.industrial.png` | +0.5 | -0.5 | 296, 296 | true |
| `sprites-2x/90/sander.industrial.png` | -0.5 | +0.5 | 104, 296 | true |
| `sprites-2x/0/cuttersSash.standard.png` | +0.5 | -0.5 | 56, 104 | true |
| `sprites-2x/0/cuttersCasement.standard.png` | +0.5 | -0.5 | 56, 104 | true |
| `sprites-2x/0/cuttersDoor.standard.png` | +0.5 | -0.5 | 56, 104 | true |

Sprawdzenie niezależne:

- 3445 prób faktycznego vertex shadera na GPU; maksymalny błąd rzutu: 0.00003719 px.
- Krawędzie osiowe mają nachylenie ±0,5; piony pozostają pionowe.
- Wszystkie obrazy: RGBA, 8 bitów na kanał, przezroczyste tło, margines co najmniej 8 px.
- Wszystkie szlifierki mieszczą się w obwiedniach; przemysłowa osiąga 6 × 2 × 2 m.
- Walizki katalogowe zachowują wspólne kadrowanie, z obwiednią alfy x=23…86, y=27…86; obwiednia prawa/dolna wyłączna: 87.

Szczegóły pomiarów: `validation.json`, `qa/independent-validation.json` i `qa/render-reports/`.
