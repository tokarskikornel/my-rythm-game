# Neon Rhythm — Etap 2: plan wykonania

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Cel:** Muzyka w grze: wbudowana piosenka Garage Baker z nutami z generatora oraz wczytywanie piosenki z komputera gracza z automatycznie generowanym poziomem.

**Architektura:** Zegar wydzielony do `clock.js` (wstrzykiwane źródło czasu, testowalny). Generator w `generator.js`: czyste funkcje (energia → siła uderzeń → szczyty → nuty) testowane na sztucznych sygnałach plus `analyzeAudio` (Web Audio: dekodowanie, trzy pasma przez `OfflineAudioContext`). `game.js` odtwarza muzykę przez `<audio>`, zegar startuje od −2 s i koryguje się do `audio.currentTime`.

**Technologie:** HTML, CSS, JavaScript bez bibliotek, Canvas 2D, Web Audio API (`decodeAudioData`, `OfflineAudioContext`, `BiquadFilterNode`, `ChannelMergerNode`), `<audio>`, `localStorage`.

**Spec:** `docs/superpowers/specs/2026-10-05-neon-rhythm-etap-2-design.md` (oraz etap 1: `docs/superpowers/specs/2026-10-05-neon-rhythm-design.md`)

## Global Constraints

- Brak bibliotek, brak `type="module"`, brak `fetch` w grze (działa przez `file://`). Skrypty przez `<script src>`, globalne obiekty `Clock`, `Generator`, `Rules`.
- `LEAD_IN = 2` s. Korekta zegara, gdy `|audio.currentTime − clock.now()| > 0.05`.
- Generator: `HOP = 0.01` s, okno RMS 20 ms, `ln(e + 0.001)`, szczyt: maksimum ±3 ramki, `> 0.2`, `> 1.5 ×` średnia z ±0,5 s; zdarzenie = uderzenia w ≤ 0,03 s; odstęp zdarzeń ≥ 0,25 s; pasma: niskie lowpass 150 Hz → ścieżki [0, 1], środkowe bandpass 1000 Hz Q 0,7 → [1, 2], wysokie highpass 4000 Hz → [2, 3]; analiza 3 kanały, 22050 Hz; czasy zaokrąglone do 0,001.
- `id` poziomu z pliku: `"file:" + file.name + ":" + Math.floor(duration)`.
- Teksty dla gracza dokładnie: „🎵 Wczytaj piosenkę z komputera”, „Analizuję piosenkę…”, „Nie udało się wczytać tej piosenki”, „Nie znaleziono rytmu w tej piosence”, autor wczytanej piosenki „Twój plik”.
- Garage Baker: 1000 Handz, licencja „CC BY 4.0”, źródło https://freemusicarchive.org/music/1000-handz/cc-by-free-to-use-drum-bass-instrumentals/garage-baker/ , plik https://files.freemusicarchive.org/storage-freemusicarchive-org/tracks/O3g8AeMzugB9eLeDgH5quGn16Ls9DBaXwP8APGn0.mp3
- Polskie komentarze, angielskie nazwy. Commit po każdym zadaniu, opis po polsku + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Testy: `sh .superpowers/run-tests.sh` → `PASS n/n`.

## Review Focus

1. **Pauza przed startem muzyki (w rozbiegu)** — wznowienie nie może odpalić muzyki przed czasem 0 ani jej pominąć po przekroczeniu 0 (Task 4).
2. **Wyjście do menu / „Zagraj jeszcze” w trakcie piosenki** — poprzednia muzyka musi się zatrzymać i przewinąć na początek, nigdy dwie naraz (Task 4).
3. **Wczytanie tego samego pliku dwa razy** — nie dubluje pozycji w menu (Task 5).
4. **Bardzo długi plik albo nie-muzyka (np. zdjęcie przemianowane na .mp3)** — komunikat błędu, gra nie zawiesza się w stanie „Analizuję…” (Task 5).
5. **Test Beat po zmianach** — nadal działa jak w etapie 1 (metronom, koniec po ostatniej nucie) (Task 4).

---

### Task 1: Zegar w `clock.js`

**Files:**
- Create: `clock.js`
- Modify: `game.js` (usuń `createClock`, użyj `Clock.create()`), `index.html` (`<script src="clock.js">` przed `game.js`), `tests.html` (dołącz `clock.js`), `tests.js`

**Interfaces:**
- Produces: `Clock.create(nowMs = () => performance.now()) -> { start(fromSec = 0), now() -> s, pause(), resume(), isPaused() -> bool, seek(sec) }`

- [ ] **Step 1: Testy w `tests.js`** (sterowany czas: `let ms = 0; const c = Clock.create(() => ms);`)

```js
test("zegar startuje od podanego czasu", () => { let ms = 0; const c = Clock.create(() => ms); c.start(-2); assertEqual(c.now(), -2); ms = 500; assertEqual(c.now(), -1.5); });
test("pauza zatrzymuje zegar", () => { let ms = 0; const c = Clock.create(() => ms); c.start(); ms = 1000; c.pause(); ms = 5000; assertEqual([c.now(), c.isPaused()], [1, true]); });
test("wznowienie kontynuuje bez skoku", () => { let ms = 0; const c = Clock.create(() => ms); c.start(); ms = 1000; c.pause(); ms = 5000; c.resume(); assertEqual(c.now(), 1); ms = 5500; assertEqual(c.now(), 1.5); });
test("seek w trakcie gry", () => { let ms = 0; const c = Clock.create(() => ms); c.start(); ms = 1000; c.seek(10); assertEqual(c.now(), 10); ms = 2000; assertEqual(c.now(), 11); });
test("seek w pauzie", () => { let ms = 0; const c = Clock.create(() => ms); c.start(); c.pause(); c.seek(3); ms = 9000; assertEqual(c.now(), 3); c.resume(); ms = 10000; assertEqual(c.now(), 4); });
```

- [ ] **Step 2: Uruchom testy** — Expected: 5 nowych ❌ (`Clock is not defined`), `FAIL 5/21`.
- [ ] **Step 3: `clock.js`** wg interfejsu; `game.js` używa `Clock.create()` (zachowanie etapu 1 bez zmian: `game.clock.start()`).
- [ ] **Step 4: Testy** — Expected: `PASS 21/21`. Ręcznie (zrzut z headless lub gra): Test Beat działa jak wcześniej.
- [ ] **Step 5: Commit** — „Wydziel zegar do clock.js z testami”.

---

### Task 2: Generator — część czysta

**Files:**
- Create: `generator.js`
- Modify: `tests.html` (dołącz `generator.js`), `tests.js`

**Interfaces:**
- Produces (`Generator`):
  - `HOP = 0.01`
  - `frameEnergies(samples: Float32Array|number[], sampleRate) -> number[]`
  - `onsetStrength(energies) -> number[]`
  - `pickPeaks(strength) -> { time, strength }[]`
  - `buildNotes({ low, mid, high }: peaks[]) -> { time, lane }[]` (posortowane po czasie)
  - `generateNotes({ low, mid, high }: samples, sampleRate) -> { time, lane }[]`

- [ ] **Step 1: Testy w `tests.js`**

Pomocnik w `tests.js`:
```js
// Sztuczna "piosenka": cisza z krótkimi (30 ms) zanikającymi impulsami w podanych chwilach.
function makeSignal(seconds, rate, times) {
  const s = new Float32Array(Math.round(seconds * rate));
  for (const t of times) {
    const start = Math.round(t * rate), len = Math.round(0.03 * rate);
    for (let i = 0; i < len && start + i < s.length; i++) s[start + i] = Math.sin(i * 0.7) * (1 - i / len);
  }
  return s;
}
const RATE = 8000;
const silence = (sec) => new Float32Array(sec * RATE);
const near = (a, b) => Math.abs(a - b) <= 0.02;
```

Testy:
- „impulsy co 0,5 s → nuty co 0,5 s”: `low = makeSignal(5, RATE, [1, 1.5, 2, 2.5, 3, 3.5])`, `mid`/`high` = `silence(5)`; `generateNotes` → 6 nut, każda `near(note.time, oczekiwany)`, każda `lane` w `[0, 1]`.
- „cisza → 0 nut”: wszystkie pasma `silence(3)` → `[]`.
- „stały dźwięk → najwyżej 1 nuta”: `low` = sinus o stałej amplitudzie 0,5 przez 3 s → `length <= 1`.
- „najwyżej 4 nuty na sekundę”: `low` impulsy co 0,1 s od 1 do 3 s → w każdym oknie `[t, t+1)` dla t = 1, 1.5, 2: ≤ 4 nuty; sąsiednie nuty (różne czasy) oddalone o ≥ 0,25 − 0,001.
- „niski + wysoki naraz → akord”: `low` i `high` impulsy w `[1, 2]` → dwie nuty z `time` near 1 o różnych ścieżkach, jedna w `[0,1]`, druga w `[2,3]`; to samo dla 2.
- „to samo pasmo nie trafia w tę samą ścieżkę dwa razy z rzędu”: z testu „co 0,5 s” — `notes[i].lane !== notes[i-1].lane` dla wszystkich i.
- `onsetStrength([0, 0, 1, 1])` → pierwszy 0, trzeci ≈ `ln(1.001/0.001)` (porównanie z dokładnością 1e-9), czwarty 0.

- [ ] **Step 2: Testy** — Expected: nowe testy ❌ (`Generator is not defined`).
- [ ] **Step 3: `generator.js`** — czyste funkcje wg spec (sekcja „Część czysta”) i Global Constraints. Remisy w szczycie: ramka jest szczytem, gdy jest `>` wcześniejszych i `>=` późniejszych w oknie ±3.
- [ ] **Step 4: Testy** — Expected: `PASS` wszystkie.
- [ ] **Step 5: Commit** — „Dodaj generator nut z testami”.

---

### Task 3: Analiza audio, narzędzie i poziom Garage Baker

**Files:**
- Modify: `generator.js` (dodaj `analyzeAudio`)
- Create: `tools/generate-level.html`, `music/garage-baker.mp3`, `levels/garage-baker.js`, `README.md` (zastąp obecny)
- Modify: `index.html` (`<script src="generator.js">`, `<script src="levels/garage-baker.js">`)

**Interfaces:**
- Consumes: `Generator.generateNotes`
- Produces: `Generator.analyzeAudio(arrayBuffer) -> Promise<{ notes, duration }>` (rzuca błąd, gdy dekodowanie się nie uda); poziom `{ id: "garage-baker", title: "Garage Baker", artist: "1000 Handz", license: "CC BY 4.0", music: "music/garage-baker.mp3", notes }` (bez `bpm`)

- [ ] **Step 1: `analyzeAudio`** — `decodeAudioData` na tymczasowym `AudioContext`/`OfflineAudioContext`; `OfflineAudioContext(3, ceil(duration × 22050), 22050)`: źródło → 3 filtry → `ChannelMerger(3)` (wejścia 0/1/2) → destination; `startRendering()` → `generateNotes({ low: ch0, mid: ch1, high: ch2 }, 22050)`.
- [ ] **Step 2: `tools/generate-level.html`** — ładuje `../generator.js`; `<input type="file" accept="audio/*">`, pola tytuł/autor/licencja/id, po analizie `<textarea>` z gotowym plikiem poziomu (format jak `levels/test-beat.js`, `notes` jako JSON) i liczbą nut. Ciemny styl.
- [ ] **Step 3: Pobierz muzykę** — `curl -L -o music/garage-baker.mp3 <plik z Global Constraints>`. Expected: plik > 1 MB, `file`/nagłówek = MP3 (ID3 lub 0xFFFB).
- [ ] **Step 4: Wygeneruj `levels/garage-baker.js`** — tymczasowa strona w scratchpadzie ładuje `generator.js`, czyta MP3 przez `XMLHttpRequest` (`responseType = "arraybuffer"`, Chrome z `--allow-file-access-from-files`), wypisuje JSON nut do DOM; `--dump-dom` → zapis pliku poziomu. Expected: ~2:01 → kilkaset nut, żadne dwie kolejne różne chwile bliżej niż 0,25 s, pierwsza nuta ≥ 0 s, ostatnia ≤ 121 s.
- [ ] **Step 5: `README.md`** — opis gry, link https://tokarskikornel.github.io/my-rythm-game/ , sterowanie, sekcja „Muzyka”: „Garage Baker” — 1000 Handz (1000Handz.com), CC BY 4.0, link do FMA i do licencji https://creativecommons.org/licenses/by/4.0/ .
- [ ] **Step 6: Testy** — Expected: `PASS` wszystkie.
- [ ] **Step 7: Commit** — „Dodaj analizę audio, narzędzie do poziomów i Garage Baker”.

---

### Task 4: Muzyka w grze

**Files:**
- Modify: `game.js`, `index.html` (element `<audio id="music" preload="auto">`), `style.css`

**Interfaces:**
- Consumes: `Clock`, poziom z `music` (ścieżka lub URL `blob:`)
- Produces: `LEAD_IN = 2`; `startLevel(level)` dla poziomów z `music` i bez; `stopMusic()` (pauza + `currentTime = 0`); w menu linia info: `artist · license · Rekord: N` (licencja pomijana, gdy pusta albo „—”)

- [ ] **Step 1:** `startLevel` z `level.music`: `stopMusic()`, `audio.src = level.music` (tylko gdy inny), `game.clock.start(-LEAD_IN)`, metronom wyłączony gdy brak `bpm`; `game.endTime = Infinity` dla poziomu z muzyką. Bez muzyki — jak w etapie 1 (`start(0)`, metronom, koniec po ostatniej nucie).
- [ ] **Step 2:** `update()`: gdy poziom ma muzykę, czas ≥ 0 i `audio.paused` i nie skończona → `audio.play()`; gdy gra — korekta `seek` przy rozjeździe > 0,05 s. Zdarzenie `ended` (tylko gdy `game.screen === "playing"` i poziom ma muzykę) → `endLevel()`.
- [ ] **Step 3:** `pauseGame` pauzuje `audio`; `resumeGame` wznawia tylko, gdy czas ≥ 0 (inaczej start nastąpi w `update`). `showMenu` i „Zagraj jeszcze” wołają `stopMusic()`.
- [ ] **Step 4:** Menu: licencja w linii info.
- [ ] **Step 5: Sprawdź** — symulacja w scratchpadzie (iframe + `--allow-file-access-from-files`, `--autoplay-policy=no-user-gesture-required`): start Garage Baker → czas −2, muzyka stoi; po przewinięciu zegara do ≥ 0 i `update()` → `audio.paused === false`; pauza → `audio.paused === true`; menu → `audio.currentTime === 0`; Test Beat → `endTime` = ostatnia nuta + 1, metronom. Zrzut menu z licencją. Testy `PASS`.
- [ ] **Step 6: Commit** — „Dodaj muzykę: rozbieg, synchronizację i pauzę”.

---

### Task 5: Wczytywanie piosenki z komputera

**Files:**
- Modify: `index.html` (przycisk + ukryty `<input type="file" accept="audio/*">`, `<p id="menu-message">`), `style.css`, `game.js`

**Interfaces:**
- Consumes: `Generator.analyzeAudio`, `startLevel`, `renderLevelList`
- Produces: `sessionLevels` (tablica poziomów z plików, tylko na czas otwarcia strony); lista w menu = `window.LEVELS` + `sessionLevels`

- [ ] **Step 1:** Przycisk „🎵 Wczytaj piosenkę z komputera” otwiera wybór pliku. Po wyborze: przycisk wyłączony, komunikat „Analizuję piosenkę…”; `file.arrayBuffer()` → `analyzeAudio`.
- [ ] **Step 2:** Sukces z nutami → poziom `{ id: "file:" + name + ":" + floor(duration), title: nazwa bez rozszerzenia, artist: "Twój plik", license: "", music: URL.createObjectURL(file), notes }`; jeśli `id` już jest w `sessionLevels` — zastąp, nie dubluj; komunikat znika; lista odświeżona. 0 nut → „Nie znaleziono rytmu w tej piosence”. Wyjątek → „Nie udało się wczytać tej piosenki”. W każdym przypadku przycisk znowu aktywny, a `input.value = ""` (żeby ten sam plik dało się wybrać ponownie).
- [ ] **Step 3: Sprawdź** — symulacja: wywołanie obsługi pliku z `File` zbudowanym z bajtów `music/garage-baker.mp3` (XHR) → pozycja w menu z „Twój plik”; ten sam plik drugi raz → nadal jedna pozycja; `File` z tekstem „to nie muzyka” → komunikat błędu, przycisk aktywny. Zrzut menu. Testy `PASS`.
- [ ] **Step 4: Commit** — „Dodaj wczytywanie piosenki z komputera”.
