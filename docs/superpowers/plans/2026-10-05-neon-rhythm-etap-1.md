# Neon Rhythm — Etap 1: plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** Grywalna gra rytmiczna bez muzyki: nutki spadają w rytm metronomu, gracz trafia je klawiszami `D F J K`, są menu, pauza i ekran wyniku.

**Architektura:** Zasady gry (ocena trafienia, punkty, combo, ocena S–D, wybór nuty do trafienia) to czyste funkcje w `rules.js`, testowane w `tests.html`. `game.js` zawiera zegar, pętlę gry, klawiaturę, rysowanie na canvas i przełączanie ekranów. Menu, pauza i wynik to elementy HTML nałożone na canvas. Wszystkie skrypty są zwykłymi skryptami (bez `type="module"`), bo moduły nie działają przez `file://`.

**Technologie:** HTML, CSS, JavaScript (bez bibliotek), Canvas 2D, Web Audio API (metronom), `localStorage`.

**Spec:** `docs/superpowers/specs/2026-10-05-neon-rhythm-design.md`

## Global Constraints

- Brak bibliotek, brak kroku budowania. Gra działa przez dwuklik na `index.html` (`file://`).
- Bez `type="module"` i bez `fetch` — wszystko przez `<script src>`.
- Klawisze: `D` `F` `J` `K` = ścieżki 0–3. Sprawdzane przez `event.code` (`KeyD`, `KeyF`, `KeyJ`, `KeyK`).
- `NOTE_TRAVEL_TIME = 1.5` s (od pojawienia się u góry do linii trafienia).
- PERFECT ≤ 0,050 s → 300 pkt; GOOD ≤ 0,100 s → 100 pkt; nuta minęła linię o > 0,100 s → MISS, 0 pkt.
- Mnożnik `min(4, 1 + floor(combo / 10))`, liczony z combo **przed** danym trafieniem.
- Celność `(perfect + 0.5 * good) / (perfect + good + miss)`; ocena S ≥ 0,95, A ≥ 0,85, B ≥ 0,70, C ≥ 0,50, poniżej D.
- Rekord w `localStorage` pod kluczem `neon-rhythm:best:<id poziomu>`. Każdy odczyt i zapis w `try/catch`.
- Komunikaty widoczne dla gracza po polsku; nazwy w kodzie po angielsku.
- Commit po każdym zadaniu, opis po polsku, zakończony linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Przytrzymany klawisz** (auto-powtarzanie) nie może trafiać kolejnych nut — ignorujemy `event.repeat` (Zadanie 3).
2. **Dwie nuty blisko siebie na jednej ścieżce** — jedno wciśnięcie trafia tylko najwcześniejszą (test w Zadaniu 1).
3. **Przełączenie karty / okna w trakcie gry** — gra sama się pauzuje, zamiast zaliczyć wszystkie nuty jako MISS (Zadanie 4).
4. **Caps Lock, polski układ klawiatury** — `event.code` nie zależy od wielkości liter (Zadanie 3).
5. **Poziom bez nut / zablokowany `localStorage`** — celność 0 bez `NaN`, gra działa bez rekordów (test w Zadaniu 1, `try/catch` w Zadaniu 4).

## Uruchamianie testów

Ręcznie: dwuklik na `tests.html`.
Automatycznie (Chrome bez okna):

```
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --dump-dom "file:///D:/projekty/demo/tests.html" | Select-String 'id="summary"'
```

Wynik zaliczony: linia zawiera `PASS` i żadnego `FAIL`.

---

### Zadanie 1: Zasady gry i strona testów

**Pliki:**
- Utwórz: `rules.js`
- Utwórz: `tests.html` (mini-biblioteka testów + wyświetlanie wyników)
- Utwórz: `tests.js` (same testy)

**Interfejsy:**
- Produkuje (globalny obiekt `Rules` w `rules.js`):
  - `Rules.PERFECT_WINDOW = 0.05`, `Rules.GOOD_WINDOW = 0.1`
  - `Rules.POINTS = { PERFECT: 300, GOOD: 100, MISS: 0 }`
  - `Rules.judgeOffset(offsetSec: number) -> "PERFECT" | "GOOD" | null` — `null` gdy `|offset| > GOOD_WINDOW`
  - `Rules.multiplier(combo: number) -> 1|2|3|4`
  - `Rules.createScore() -> { score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0 }`
  - `Rules.applyJudgement(state, judgement: "PERFECT"|"GOOD"|"MISS") -> nowy state` (nie zmienia przekazanego obiektu)
  - `Rules.accuracy(state) -> number 0..1` (0 gdy brak nut)
  - `Rules.grade(accuracy: number) -> "S"|"A"|"B"|"C"|"D"`
  - `Rules.findHittableNote(notes, lane, time) -> index | -1` — najwcześniejsza nuta z `!note.judged`, `note.lane === lane`, `|time - note.time| <= GOOD_WINDOW`
  - `Rules.findMissedNotes(notes, time) -> index[]` — nuty z `!note.judged` i `time - note.time > GOOD_WINDOW`
  - Nuta: `{ time: number, lane: 0..3, judged: boolean }`
- `tests.html` udostępnia `test(name, fn)` i `assertEqual(actual, expected)` (porównanie przez `JSON.stringify`); wypisuje każdy test jako ✅/❌ oraz `<p id="summary">` z tekstem `PASS n/n` albo `FAIL k/n`.

- [ ] **Krok 1: Napisz `tests.html` i `tests.js` z testami**

`tests.html` ładuje `rules.js`, potem `tests.js`. Błąd rzucony w teście (np. brak `Rules`) liczy się jako ❌, nie przerywa reszty. Ciemne tło, zielony/czerwony tekst.

Testy (`tests.js`):
```js
test("idealne trafienie to PERFECT", () => assertEqual(Rules.judgeOffset(0), "PERFECT"));
test("50 ms za wcześnie i za późno to PERFECT", () => {
  assertEqual(Rules.judgeOffset(-0.05), "PERFECT");
  assertEqual(Rules.judgeOffset(0.05), "PERFECT");
});
test("51–100 ms to GOOD", () => {
  assertEqual(Rules.judgeOffset(0.051), "GOOD");
  assertEqual(Rules.judgeOffset(-0.1), "GOOD");
});
test("ponad 100 ms poza oknem", () => {
  assertEqual(Rules.judgeOffset(0.101), null);
  assertEqual(Rules.judgeOffset(-0.2), null);
});
test("mnożnik rośnie co 10 combo, maks. x4", () => {
  assertEqual([0, 9, 10, 19, 20, 30, 99].map(Rules.multiplier), [1, 1, 2, 2, 3, 4, 4]);
});
test("PERFECT przy combo 0 daje 300 i combo 1", () => {
  const s = Rules.applyJudgement(Rules.createScore(), "PERFECT");
  assertEqual([s.score, s.combo, s.maxCombo, s.perfect], [300, 1, 1, 1]);
});
test("GOOD przy combo 10 daje 100 x2", () => {
  const s = Rules.applyJudgement({ ...Rules.createScore(), combo: 10 }, "GOOD");
  assertEqual([s.score, s.combo, s.good], [200, 11, 1]);
});
test("MISS zeruje combo, zostawia maxCombo", () => {
  const s = Rules.applyJudgement({ ...Rules.createScore(), combo: 15, maxCombo: 15 }, "MISS");
  assertEqual([s.combo, s.maxCombo, s.miss, s.score], [0, 15, 1, 0]);
});
test("applyJudgement nie zmienia starego stanu", () => {
  const before = Rules.createScore();
  Rules.applyJudgement(before, "PERFECT");
  assertEqual(before.score, 0);
});
test("celność liczy GOOD za pół", () => {
  assertEqual(Rules.accuracy({ ...Rules.createScore(), perfect: 2, good: 2, miss: 0 }), 0.75);
});
test("celność bez nut to 0, nie NaN", () => assertEqual(Rules.accuracy(Rules.createScore()), 0));
test("progi ocen", () => {
  assertEqual([1, 0.95, 0.949, 0.85, 0.7, 0.5, 0.49, 0].map(Rules.grade),
              ["S", "S", "A", "A", "B", "C", "D", "D"]);
});
test("findHittableNote wybiera najwcześniejszą nutę w oknie", () => {
  const notes = [{ time: 1.0, lane: 0, judged: false }, { time: 1.05, lane: 0, judged: false }];
  assertEqual(Rules.findHittableNote(notes, 0, 1.04), 0);
});
test("findHittableNote pomija trafione i inne ścieżki", () => {
  const notes = [{ time: 1.0, lane: 0, judged: true }, { time: 1.0, lane: 1, judged: false },
                 { time: 1.05, lane: 0, judged: false }];
  assertEqual(Rules.findHittableNote(notes, 0, 1.0), 2);
});
test("findHittableNote zwraca -1 poza oknem", () => {
  const notes = [{ time: 2.0, lane: 0, judged: false }];
  assertEqual(Rules.findHittableNote(notes, 0, 1.5), -1);
});
test("findMissedNotes zwraca przegapione, nie trafione", () => {
  const notes = [{ time: 1.0, lane: 0, judged: false }, { time: 1.0, lane: 1, judged: true },
                 { time: 1.95, lane: 2, judged: false }];
  assertEqual(Rules.findMissedNotes(notes, 2.0), [0]);
});
```

- [ ] **Krok 2: Uruchom testy — wszystkie mają nie przejść**

Uruchom komendę z sekcji „Uruchamianie testów”. Oczekiwane: `FAIL 16/16` (brak `rules.js`).

- [ ] **Krok 3: Napisz `rules.js` z interfejsem powyżej**

`const Rules = { ... }` na poziomie globalnym. Komentarze po polsku, krótkie.

- [ ] **Krok 4: Uruchom testy — wszystkie przechodzą**

Oczekiwane: `PASS 16/16`.

- [ ] **Krok 5: Commit** — `git add rules.js tests.html tests.js`, opis „Dodaj zasady gry i testy”.

---

### Zadanie 2: Strona gry i spadające nutki

**Pliki:**
- Utwórz: `index.html` — canvas na cały ekran, warstwy `#menu`, `#pause`, `#results` (na razie puste i ukryte), skrypty w kolejności: `rules.js`, `levels/test-beat.js`, `game.js`
- Utwórz: `style.css` — ciemne tło `#0a0a14`, font monospace, canvas bez marginesów
- Utwórz: `levels/test-beat.js`
- Utwórz: `game.js`

**Interfejsy:**
- Konsumuje: `window.LEVELS` (format ze specyfikacji), `Rules`
- Produkuje (w `game.js`, używane w Zadaniach 3–4):
  - `NOTE_TRAVEL_TIME = 1.5`, `LANE_KEYS = ["KeyD", "KeyF", "KeyJ", "KeyK"]`, `LANE_COLORS = ["#ff2bd6", "#2bd9ff", "#3dff7a", "#ffe32b"]`
  - `createClock() -> { start(), now() -> s, pause(), resume(), isPaused() }` oparty o `performance.now()`, czas stoi w pauzie
  - `startLevel(level)` — kopiuje nuty z `judged: false`, tworzy `Rules.createScore()`, startuje zegar i metronom
  - `game` — obiekt stanu: `{ screen: "menu"|"playing"|"paused"|"results", level, notes, score, clock }`
  - `playClick(accent: boolean)` — krótki dźwięk Web Audio (np. 1000 Hz akcent, 700 Hz zwykły, ~40 ms)
  - `endLevel()` — na razie tylko ustawia `game.screen = "results"`; Zadanie 4 dodaje ekran

- [ ] **Krok 1: `levels/test-beat.js`**

`id: "test-beat"`, `title: "Test Beat"`, `artist: "Metronom"`, `license: "—"`, bez `music`, `bpm: 120`. Nuty: 64 nuty co 0,5 s od `time: 2.0`; ścieżki według wzoru `[0, 1, 2, 3, 2, 1]` powtarzanego w kółko; co 8. nuta dodatkowo druga nuta na ścieżce `3 - lane` w tym samym czasie (akord). Może być wygenerowane pętlą w pliku.

- [ ] **Krok 2: Pętla gry i rysowanie w `game.js`**

- Canvas dopasowany do okna (także po `resize`, z uwzględnieniem `devicePixelRatio`).
- 4 ścieżki o szerokości 90 px, wyśrodkowane; linia trafienia na 85% wysokości, świecąca (`shadowBlur`).
- Pozycja nuty: `y = hitY - (note.time - now) / NOTE_TRAVEL_TIME * hitY`; rysujemy tylko nuty `!judged` widoczne na ekranie. Nuta: zaokrąglony prostokąt w kolorze ścieżki z poświatą.
- Metronom: przy każdym przekroczeniu kolejnego uderzenia (`60 / bpm`) `playClick`, akcent co 4 uderzenia. `AudioContext` tworzony przy pierwszym starcie poziomu (wymaga gestu gracza).
- Koniec poziomu: `now > ostatnia nuta + 1.0` → `endLevel()`.
- Tymczasowo: na końcu pliku `startLevel(LEVELS[0])` po kliknięciu w stronę (menu przyjdzie w Zadaniu 4).

- [ ] **Krok 3: Sprawdź ręcznie** — dwuklik na `index.html`, klik: słychać metronom, nutki spadają i docierają do linii dokładnie w rytm „tyknięć”, akordy wyglądają dobrze, zmiana rozmiaru okna nie psuje obrazu. W konsoli (F12) brak błędów. Testy: nadal `PASS 16/16`.

- [ ] **Krok 4: Commit** — opis „Dodaj spadające nutki i metronom”.

---

### Zadanie 3: Trafianie nut, wynik i efekty

**Pliki:**
- Zmień: `game.js`

**Interfejsy:**
- Konsumuje: `Rules.findHittableNote`, `Rules.findMissedNotes`, `Rules.judgeOffset`, `Rules.applyJudgement`, `Rules.multiplier`, stan `game` z Zadania 2
- Produkuje: `judge(noteIndex, judgement)` — oznacza nutę `judged`, aktualizuje `game.score`, dodaje efekt

- [ ] **Krok 1: Klawiatura**

`keydown` na `window`: pomiń gdy `event.repeat` albo `game.screen !== "playing"`; `lane = LANE_KEYS.indexOf(event.code)`; czas = `game.clock.now()` w chwili zdarzenia; `findHittableNote` → jeśli indeks ≠ -1, `judgeOffset(now - note.time)` i `judge(...)`. Wciśnięcie bez nuty nic nie robi. `keydown`/`keyup` ustawiają podświetlenie ścieżki (jaśniejsze tło ścieżki + świecący prostokąt z literą przy linii trafienia).

- [ ] **Krok 2: MISS-y** — w każdej klatce `findMissedNotes(notes, now)` → `judge(i, "MISS")`.

- [ ] **Krok 3: Efekty i HUD**

- Trafienie: rozszerzający się, zanikający krąg/błysk w kolorze ścieżki (~0,3 s).
- Napis PERFECT (cyjan) / GOOD (zielony) / MISS (czerwony) nad linią trafienia, zanika w ~0,5 s.
- W rogu: `WYNIK`, `COMBO` (gdy > 1) i mnożnik `x2`…`x4`.

- [ ] **Krok 4: Sprawdź ręcznie** — trafianie w rytm daje PERFECT, wyraźnie za wcześnie GOOD, puszczone nuty MISS i reset combo; przytrzymany klawisz nie trafia kolejnych nut; działa z włączonym Caps Lockiem; po 10 trafieniach z rzędu pojawia się `x2`. Testy: `PASS 16/16`.

- [ ] **Krok 5: Commit** — opis „Dodaj trafianie nut, punkty i efekty”.

---

### Zadanie 4: Menu, pauza, ekran wyniku i rekordy

**Pliki:**
- Zmień: `index.html`, `style.css`, `game.js`

**Interfejsy:**
- Konsumuje: `startLevel`, `endLevel`, `game`, `Rules.accuracy`, `Rules.grade`
- Produkuje: `showScreen(name: "menu"|"playing"|"paused"|"results")`, `loadBest(levelId) -> number` (0 gdy brak lub błąd), `saveBest(levelId, score)`

- [ ] **Krok 1: Menu** — usuń tymczasowy start z Zadania 2. Tytuł „NEON RHYTHM” z neonową poświatą (CSS `text-shadow`), lista poziomów z `LEVELS` (tytuł, autor, „Rekord: N”), klik startuje poziom. Pod spodem podpowiedź „Klawisze: D F J K · Esc = pauza”.

- [ ] **Krok 2: Pauza** — `Esc` w grze: pauza zegara i warstwa „PAUZA” z przyciskami „Wznów” i „Menu”; `Esc` w pauzie wznawia. Gra pauzuje się sama na `blur` okna i `visibilitychange` (ukryta karta).

- [ ] **Krok 3: Wynik** — `endLevel()` pokazuje: duża ocena S–D, wynik, PERFECT/GOOD/MISS, najdłuższe combo, celność w %, napis „NOWY REKORD!” gdy pobity; przyciski „Zagraj jeszcze” i „Menu”. Rekord zapisany przez `saveBest` tylko gdy większy.

- [ ] **Krok 4: Sprawdź ręcznie** — pełna ścieżka menu → gra → pauza → wznowienie → wynik → zagraj jeszcze → menu (rekord widoczny w menu, zostaje po odświeżeniu strony); przełączenie karty w trakcie gry pauzuje grę. Testy: `PASS 16/16`.

- [ ] **Krok 5: Commit** — opis „Dodaj menu, pauzę, ekran wyniku i rekordy”.
