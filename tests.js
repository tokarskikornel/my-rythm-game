// Testy zasad gry z rules.js. Otwórz tests.html, żeby je uruchomić.

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

// --- Zegar (clock.js) ---
// Czas sterujemy ręcznie przez zmienną ms, zamiast czekać naprawdę.

test("zegar startuje od podanego czasu", () => {
  let ms = 0;
  const c = Clock.create(() => ms);
  c.start(-2);
  assertEqual(c.now(), -2);
  ms = 500;
  assertEqual(c.now(), -1.5);
});

test("pauza zatrzymuje zegar", () => {
  let ms = 0;
  const c = Clock.create(() => ms);
  c.start();
  ms = 1000;
  c.pause();
  ms = 5000;
  assertEqual([c.now(), c.isPaused()], [1, true]);
});

test("wznowienie kontynuuje bez skoku", () => {
  let ms = 0;
  const c = Clock.create(() => ms);
  c.start();
  ms = 1000;
  c.pause();
  ms = 5000;
  c.resume();
  assertEqual(c.now(), 1);
  ms = 5500;
  assertEqual(c.now(), 1.5);
});

test("seek w trakcie gry", () => {
  let ms = 0;
  const c = Clock.create(() => ms);
  c.start();
  ms = 1000;
  c.seek(10);
  assertEqual(c.now(), 10);
  ms = 2000;
  assertEqual(c.now(), 11);
});

test("seek w pauzie", () => {
  let ms = 0;
  const c = Clock.create(() => ms);
  c.start();
  c.pause();
  c.seek(3);
  ms = 9000;
  assertEqual(c.now(), 3);
  c.resume();
  ms = 10000;
  assertEqual(c.now(), 4);
});

// --- Generator nut (generator.js) ---

// Sztuczna "piosenka": cisza z krótkimi (30 ms) zanikającymi impulsami w podanych chwilach.
function makeSignal(seconds, rate, times) {
  const s = new Float32Array(Math.round(seconds * rate));
  for (const t of times) {
    const start = Math.round(t * rate);
    const len = Math.round(0.03 * rate);
    for (let i = 0; i < len && start + i < s.length; i++) s[start + i] = Math.sin(i * 0.7) * (1 - i / len);
  }
  return s;
}
const RATE = 8000;
const silence = (sec) => new Float32Array(sec * RATE);
const near = (a, b) => Math.abs(a - b) <= 0.02;

test("siła uderzenia rośnie tylko przy skoku energii", () => {
  const s = Generator.onsetStrength([0, 0, 1, 1]);
  assertEqual([s[0], s[1], Math.abs(s[2] - Math.log(1.001 / 0.001)) < 1e-9, s[3]], [0, 0, true, 0]);
});

test("impulsy co 0,5 s → nuty co 0,5 s na ścieżkach niskich", () => {
  const times = [1, 1.5, 2, 2.5, 3, 3.5];
  const notes = Generator.generateNotes({ low: makeSignal(5, RATE, times), mid: silence(5), high: silence(5) }, RATE);
  assertEqual(notes.length, 6);
  assertEqual(notes.every((n, i) => near(n.time, times[i]) && (n.lane === 0 || n.lane === 1)), true);
});

test("ta sama ścieżka nie dostaje dwóch nut z rzędu", () => {
  const times = [1, 1.5, 2, 2.5, 3, 3.5];
  const notes = Generator.generateNotes({ low: makeSignal(5, RATE, times), mid: silence(5), high: silence(5) }, RATE);
  assertEqual(notes.every((n, i) => i === 0 || n.lane !== notes[i - 1].lane), true);
});

test("cisza → 0 nut", () => {
  assertEqual(Generator.generateNotes({ low: silence(3), mid: silence(3), high: silence(3) }, RATE), []);
});

test("stały dźwięk bez uderzeń → najwyżej 1 nuta", () => {
  const tone = new Float32Array(3 * RATE).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 200 * i) / RATE));
  const notes = Generator.generateNotes({ low: tone, mid: silence(3), high: silence(3) }, RATE);
  assertEqual(notes.length <= 1, true);
});

test("najwyżej 4 nuty na sekundę", () => {
  const times = [];
  for (let t = 1; t < 3; t += 0.1) times.push(t);
  const notes = Generator.generateNotes({ low: makeSignal(4, RATE, times), mid: silence(4), high: silence(4) }, RATE);
  const perSecond = [1, 1.5, 2].map((t) => notes.filter((n) => n.time >= t && n.time < t + 1).length);
  assertEqual(perSecond.every((count) => count > 0 && count <= 4), true);
  const gapsOk = notes.every((n, i) => i === 0 || n.time === notes[i - 1].time || n.time - notes[i - 1].time >= 0.249);
  assertEqual(gapsOk, true);
});

test("niski i wysoki naraz → akord", () => {
  const notes = Generator.generateNotes(
    { low: makeSignal(3, RATE, [1, 2]), mid: silence(3), high: makeSignal(3, RATE, [1, 2]) }, RATE);
  assertEqual(notes.length, 4);
  for (const t of [1, 2]) {
    const pair = notes.filter((n) => near(n.time, t)).map((n) => n.lane).sort();
    assertEqual([pair.length, pair[0] <= 1, pair[1] >= 2], [2, true, true]);
  }
});

// --- Postać (character.js) ---
// held = które klawisze (D F J K) są trzymane, pressedAt = kiedy (s) każdy był ostatnio wciśnięty.

const NEVER = -Infinity;

test("nic nie wciśnięte → postać stoi", () => {
  assertEqual(Character.pose([false, false, false, false], [NEVER, NEVER, NEVER, NEVER], 10), "stoi");
});

test("trzymany klawisz → jego poza", () => {
  assertEqual(Character.pose([false, false, true, false], [NEVER, NEVER, 5, NEVER], 10), "j");
});

test("krótkie stuknięcie trwa co najmniej 0,15 s", () => {
  const pressedAt = [9.9, NEVER, NEVER, NEVER];
  assertEqual(Character.pose([false, false, false, false], pressedAt, 10), "d");
  assertEqual(Character.pose([false, false, false, false], pressedAt, 10.1), "stoi");
});

test("akord → poza ostatnio wciśniętego klawisza", () => {
  assertEqual(Character.pose([true, false, false, true], [9, NEVER, NEVER, 9.5], 10), "k");
});

test("po puszczeniu ostatniego wraca do wcześniej trzymanego", () => {
  assertEqual(Character.pose([true, true, false, false], [8, 9.5, NEVER, NEVER], 10), "f");
  assertEqual(Character.pose([true, false, false, false], [8, 9.5, NEVER, NEVER], 10), "d");
});

test("podskok: start z ziemi, najwyżej w połowie, potem z powrotem na ziemi", () => {
  const top = Character.bounce(Character.BOUNCE_TIME / 2);
  assertEqual([Character.bounce(0), top === Character.BOUNCE_HEIGHT, Character.bounce(1), Character.bounce(-1)], [0, true, 0, 0]);
});
