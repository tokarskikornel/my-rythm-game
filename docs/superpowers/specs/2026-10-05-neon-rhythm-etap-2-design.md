# Neon Rhythm — Etap 2: muzyka i generator poziomów

Data: 2026-10-05
Poprzedni projekt: `2026-10-05-neon-rhythm-design.md` (etap 1, gotowy).

## Cel

Gra z prawdziwą muzyką. Wbudowana piosenka "Garage Baker" (1000 Handz, CC BY) dla wszystkich
oraz wczytywanie dowolnej piosenki z komputera gracza, do której gra sama generuje poziom.
Działa przez dwuklik na `index.html` i online (GitHub Pages).

## Założenia

- Pliki muzyki gracza nigdy nie opuszczają jego komputera — są czytane tylko w przeglądarce.
- Wczytane piosenki **nie są zapamiętywane** po zamknięciu strony. Rekordy są (po `id`, patrz niżej).
- Jedna trudność, bez wyboru.
- W repozytorium tylko muzyka na licencji pozwalającej na udostępnianie (CC BY / CC0).
  Autor i licencja widoczne w menu (zaległość z etapu 1).
- Bez bibliotek, bez `fetch` dla plików lokalnych (blokowane przez `file://`).

## Dla gracza

1. Menu: lista poziomów (tytuł; autor · licencja · rekord) i przycisk
   **"🎵 Wczytaj piosenkę z komputera"** (`<input type="file" accept="audio/*">`).
2. Po wyborze pliku: napis **"Analizuję piosenkę…"**, potem piosenka pojawia się na liście
   (tytuł = nazwa pliku bez rozszerzenia, autor = "Twój plik").
3. Błąd dekodowania → komunikat **"Nie udało się wczytać tej piosenki"**.
   Brak znalezionych nut → **"Nie znaleziono rytmu w tej piosence"**. Gracz zostaje w menu.
4. Start poziomu z muzyką: **2 s rozbiegu** (`LEAD_IN = 2`), czas gry biegnie od −2 do 0,
   w chwili 0 startuje muzyka.
5. Koniec poziomu z muzyką: zdarzenie `ended` elementu audio. Poziom bez muzyki (Test Beat):
   jak w etapie 1 (ostatnia nuta + 1 s), z metronomem.
6. Pauza (`Esc`, `blur`, ukrycie karty) zatrzymuje muzykę; wznowienie ją wznawia
   (o ile czas gry ≥ 0). Wyjście do menu zatrzymuje muzykę.
7. `id` poziomu z pliku: `"file:" + nazwa pliku + ":" + długość w pełnych sekundach` —
   ten sam plik wczytany ponownie pokazuje ten sam rekord.

## Zegar (`clock.js`)

Wydzielony z `game.js`, testowany. Źródło czasu wstrzykiwane (domyślnie `performance.now`),
żeby testy mogły sterować czasem.

- `Clock.create(nowMs = () => performance.now())` →
  `{ start(fromSec), now(), pause(), resume(), isPaused(), seek(sec) }`.
  - `start(fromSec)` — czas gry zaczyna się od `fromSec` (np. −2).
  - `seek(sec)` — ustawia aktualny czas na `sec` (także w pauzie).
- Synchronizacja z muzyką (w `game.js`): co klatkę, gdy muzyka gra, jeśli
  `|audio.currentTime − clock.now()| > 0,05 s` → `clock.seek(audio.currentTime)`.
  Między korektami zegar płynie sam, więc nutki nie drgają.

## Generator (`generator.js`)

Część czysta (testowana) i część z Web Audio (nietestowana automatycznie).

### Część z Web Audio

`Generator.analyzeAudio(arrayBuffer) → Promise<{ notes, duration }>`:
1. `decodeAudioData`.
2. `OfflineAudioContext(3 kanały, 22050 Hz)`: źródło → trzy filtry → `ChannelMerger`:
   - niskie: `lowpass` 150 Hz,
   - środkowe: `bandpass` 1000 Hz, Q = 0,7,
   - wysokie: `highpass` 4000 Hz.
3. Kanały trafiają do `Generator.generateNotes({ low, mid, high }, sampleRate)`.

### Część czysta

- `frameEnergies(samples, sampleRate) → number[]` — RMS w oknach 20 ms co 10 ms (`HOP = 0.01`).
- `onsetStrength(energies) → number[]` — `max(0, ln(e[i] + 0.001) − ln(e[i−1] + 0.001))`, pierwszy = 0.
- `pickPeaks(strength) → [{ time, strength }]` — ramka jest uderzeniem, gdy:
  - jest maksimum w oknie ±3 ramki,
  - `strength > 0.2`,
  - `strength > 1.5 × średnia z okna ±0,5 s`.
  `time = indeks × HOP`.
- `buildNotes({ low, mid, high }) → notes`:
  1. Połącz uderzenia trzech pasm; uderzenia odległe o ≤ 0,03 s to jedno **zdarzenie**
     (siła = maksimum, pasma = zbiór).
  2. Przerzedzanie: wybieraj zdarzenia od najsilniejszego, odrzucaj te bliżej niż 0,25 s
     od już wybranych (maks. 4 nuty/s). Posortuj po czasie.
  3. Ścieżki: pasmo → kandydaci: niskie [0, 1], środkowe [1, 2], wysokie [2, 3].
     Pasmo główne = najsilniejsze w zdarzeniu; spośród kandydatów wybierz inną ścieżkę niż
     poprzednia nuta (gdy obie inne — na zmianę).
  4. Akord: zdarzenie zawiera pasmo niskie i wysokie → dwie nuty: jedna z kandydatów niskich,
     jedna z wysokich.
  5. Czasy zaokrąglone do 0,001 s.
- `generateNotes(bands, sampleRate)` = powyższe po kolei dla każdego pasma.

## Wbudowana piosenka

- `music/garage-baker.mp3` — "Garage Baker", 1000 Handz, Free Music Archive, CC BY.
- `levels/garage-baker.js` — nuty z generatora, `artist: "1000 Handz"`,
  `license: "CC BY"` (dokładna wersja z FMA), `music: "music/garage-baker.mp3"`.
- Podziękowanie / licencja także w `README.md`.
- `tools/generate-level.html` — wybierasz plik audio, dostajesz tekst gotowego pliku
  `levels/<id>.js` do skopiowania (do dodawania kolejnych darmowych piosenek na stałe).

## Pliki

| Plik | Zmiana |
|------|--------|
| `clock.js` | nowy — zegar (przeniesiony z `game.js`) |
| `generator.js` | nowy — generator nut |
| `game.js` | muzyka, rozbieg, synchronizacja, wczytywanie pliku, komunikaty |
| `index.html`, `style.css` | przycisk wczytywania, komunikaty, licencja w menu |
| `levels/garage-baker.js`, `music/garage-baker.mp3` | nowe |
| `tools/generate-level.html` | nowy |
| `tests.html`, `tests.js` | testy zegara i generatora |
| `README.md` | opis gry, link, licencje |

## Testowanie

- Zegar: start od −2; upływ czasu; pauza zatrzymuje; wznowienie kontynuuje bez skoku;
  `seek` w trakcie i w pauzie.
- Generator na sztucznych sygnałach (krótkie impulsy szumu w znanych chwilach, 8000 Hz):
  - impulsy co 0,5 s w paśmie niskim → nuty co 0,5 s (± 0,02 s) na ścieżkach 0–1,
  - cisza → 0 nut,
  - stały dźwięk bez uderzeń → najwyżej 1 nuta,
  - impulsy co 0,1 s → nie więcej niż 4 nuty na sekundę,
  - jednoczesne impulsy niski + wysoki → akord (2 nuty w tym samym czasie, różne ścieżki),
  - kolejne nuty z jednego pasma nie trafiają w tę samą ścieżkę dwa razy z rzędu.
- Ręcznie: Garage Baker gra w rytm; wczytanie własnego MP3; zły plik → komunikat;
  pauza zatrzymuje muzykę.

## Poza zakresem

Zapamiętywanie piosenek, wybór trudności, tryb nagrywania, postać (osobny projekt),
kalibracja opóźnienia dźwięku.
