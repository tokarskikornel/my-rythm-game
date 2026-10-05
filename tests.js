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
