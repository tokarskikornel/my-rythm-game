# Neon Rhythm — projekt gry

Data: 2026-10-05

## Cel

Gra rytmiczna w stylu Guitar Hero działająca w przeglądarce. Projekt służy nauce
Claude Code, Gita i GitHuba. Sukces: znajomy otwiera link (GitHub Pages) i gra w grę.

## Założenia

- Przeglądarka na komputerze, sterowanie klawiaturą.
- Czysty HTML + CSS + JavaScript + Canvas. Bez bibliotek, bez instalowania czegokolwiek.
- Gra uruchamia się przez dwuklik na `index.html` (protokół `file://`) oraz z GitHub Pages.
- Muzyka tylko na darmowej licencji pozwalającej na publikację (np. Pixabay, Free Music Archive).
  Autor i licencja zapisane w pliku poziomu i widoczne w menu.
- Styl: neon / cyberpunk — ciemne tło, świecące nutki, błyski przy trafieniu.

## Etapy

1. **Rozgrywka bez muzyki** — nutki spadają według poziomu testowego, czas liczy własny zegar,
   słychać metronom ("tyk" wygenerowany przez Web Audio). Pełne ekrany: menu, gra, wynik.
2. **Muzyka** — prawdziwa piosenka, nuty zgrane z jej czasem.
3. **Tryb nagrywania** — gracz puszcza piosenkę, wystukuje rytm klawiszami `D F J K`,
   gra zapisuje to jako nowy poziom (do skopiowania jako plik `levels/*.js`).

Każdy etap kończy się działającą grą, commitem i wysłaniem na GitHuba.

## Rozgrywka

- 4 ścieżki, klawisze `D` `F` `J` `K`, każda ścieżka ma własny neonowy kolor.
- Nutka pojawia się u góry i dociera do linii trafienia po 1,5 s (`NOTE_TRAVEL_TIME`).
- Wciśnięty klawisz podświetla swoją ścieżkę.
- Ocena trafienia według różnicy czasu między wciśnięciem a czasem nuty:

  | Ocena   | Różnica      | Punkty bazowe |
  |---------|--------------|---------------|
  | PERFECT | ≤ 50 ms      | 300           |
  | GOOD    | ≤ 100 ms     | 100           |
  | MISS    | nuta minęła linię o > 100 ms | 0 |

- Wciśnięcie klawisza, gdy na danej ścieżce nie ma nuty w oknie ±100 ms, nic nie robi
  (nie karze gracza).
- Jedno wciśnięcie trafia najwyżej jedną nutę — najwcześniejszą nietrafioną na tej ścieżce.
- Combo rośnie przy PERFECT i GOOD, zeruje się przy MISS.
- Mnożnik: `1 + floor(combo / 10)`, maksymalnie 4. Punkty za trafienie = punkty bazowe × mnożnik.
- Efekty: błysk w kolorze ścieżki przy trafieniu; napis PERFECT/GOOD/MISS znikający po chwili;
  aktualne combo i wynik na ekranie.
- Poza zakresem na start: pasek życia, przegrywanie w trakcie, długie (przytrzymywane) nuty.

## Ekrany

```
[ MENU ] → [ GRA ] → [ WYNIK ]
   ↑                    │
   └── Zagraj jeszcze ──┘
```

- **Menu**: tytuł gry, lista piosenek (tytuł, autor), najlepszy wynik przy każdej.
- **Gra**: ścieżki, nutki, wynik, combo, mnożnik. `Esc` = pauza (wznowienie / wyjście do menu).
- **Wynik**: punkty, liczba PERFECT / GOOD / MISS, najdłuższe combo, ocena, przyciski
  "Zagraj jeszcze" i "Menu".
- Ocena według celności `(PERFECT × 1 + GOOD × 0,5) / liczba nut`:
  S ≥ 95%, A ≥ 85%, B ≥ 70%, C ≥ 50%, D poniżej.
- Najlepszy wynik każdej piosenki zapisany w `localStorage` przeglądarki. Jeśli `localStorage`
  nie działa, gra działa dalej, tylko bez zapisanych rekordów.

## Poziomy

Plik `levels/<nazwa>.js` dopisuje poziom do globalnej listy (zamiast JSON, bo `file://`
blokuje wczytywanie plików przez `fetch`):

```js
window.LEVELS = window.LEVELS || [];
window.LEVELS.push({
  id: "neon-drive",
  title: "Neon Drive",
  artist: "Autor",
  license: "Pixabay Content License",
  music: "music/neon-drive.mp3", // brak = tryb metronomu (etap 1)
  bpm: 120,                       // używane przez metronom
  notes: [
    { time: 1.50, lane: 0 },      // czas w sekundach, lane 0–3 = D F J K
    { time: 2.00, lane: 2 }
  ]
});
```

Poziomy są dołączane w `index.html` przez `<script src="levels/...">`.

## Czas i synchronizacja

- Cała gra pyta jeden zegar o "aktualny czas piosenki" w sekundach.
- Etap 1: zegar oparty o `performance.now()` z uwzględnieniem pauzy.
- Etap 2: zegar oparty o `audio.currentTime` — nuty nie rozjeżdżają się z muzyką nawet
  przy przycięciu animacji.
- Pozycja nutki liczona z czasu: `y = hitLineY - (note.time - now) / NOTE_TRAVEL_TIME * hitLineY`.
- Ocena trafienia używa czasu z momentu zdarzenia klawisza, nie czasu klatki.

## Pliki

| Plik | Odpowiedzialność |
|------|------------------|
| `index.html` | Strona, canvas, dołączenie skryptów i poziomów |
| `style.css` | Wygląd strony, menu, ekranu wyniku |
| `rules.js` | Czyste zasady: ocena trafienia, punkty, mnożnik, combo, ocena S–D. Bez grafiki i DOM. |
| `game.js` | Pętla gry, zegar, klawiatura, rysowanie na canvas, ekrany |
| `levels/*.js` | Poziomy |
| `music/` | Pliki muzyki (etap 2) |
| `tests.html` | Automatyczne testy `rules.js` w przeglądarce (✅ / ❌) |

Jeśli `game.js` urośnie zbyt mocno, dzielimy go (np. `render.js`, `input.js`).

## Testowanie

- `tests.html` sprawdza `rules.js`: granice okien czasowych (50 ms, 100 ms, wartości ujemne),
  punkty z mnożnikiem, maksymalny mnożnik, zerowanie combo, progi ocen S–D.
- Wygląd i odczucia sprawdza gracz, grając.

## Git i GitHub

- Commit po każdym działającym kroku, z opisem po polsku.
- Repozytorium na GitHubie zakładane ręcznie przez stronę, połączenie przez `git remote`,
  logowanie przez przeglądarkę (Git Credential Manager).
- GitHub Pages publikuje grę z gałęzi `main`.
