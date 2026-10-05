// Zasady gry: ocena trafień, punkty, combo i ocena końcowa.
// Same obliczenia — bez rysowania i bez strony — dzięki temu łatwo je testować (tests.html).

const Rules = {
  // Okna czasowe w sekundach: jak daleko od idealnego momentu można wcisnąć klawisz.
  PERFECT_WINDOW: 0.05,
  GOOD_WINDOW: 0.1,

  POINTS: { PERFECT: 300, GOOD: 100, MISS: 0 },

  // Ocena trafienia na podstawie różnicy czasu (ujemna = za wcześnie).
  // null = za daleko od nuty, wciśnięcie się nie liczy.
  judgeOffset(offsetSec) {
    const distance = Math.abs(offsetSec);
    if (distance <= Rules.PERFECT_WINDOW) return "PERFECT";
    if (distance <= Rules.GOOD_WINDOW) return "GOOD";
    return null;
  },

  // Co 10 trafień z rzędu mnożnik rośnie o 1, maksymalnie do x4.
  multiplier(combo) {
    return Math.min(4, 1 + Math.floor(combo / 10));
  },

  createScore() {
    return { score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0 };
  },

  // Zwraca nowy stan wyniku po ocenie — stary stan zostaje bez zmian.
  applyJudgement(state, judgement) {
    const next = { ...state };
    if (judgement === "MISS") {
      next.combo = 0;
      next.miss++;
      return next;
    }
    next.score += Rules.POINTS[judgement] * Rules.multiplier(state.combo);
    next.combo++;
    next.maxCombo = Math.max(next.maxCombo, next.combo);
    if (judgement === "PERFECT") next.perfect++;
    else next.good++;
    return next;
  },

  // Celność 0..1: PERFECT liczy się w całości, GOOD w połowie.
  accuracy(state) {
    const total = state.perfect + state.good + state.miss;
    if (total === 0) return 0;
    return (state.perfect + 0.5 * state.good) / total;
  },

  grade(accuracy) {
    if (accuracy >= 0.95) return "S";
    if (accuracy >= 0.85) return "A";
    if (accuracy >= 0.7) return "B";
    if (accuracy >= 0.5) return "C";
    return "D";
  },

  // Indeks najwcześniejszej nietrafionej nuty na ścieżce, którą można teraz trafić, albo -1.
  findHittableNote(notes, lane, time) {
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note.judged || note.lane !== lane) continue;
      if (Math.abs(time - note.time) <= Rules.GOOD_WINDOW) return i;
    }
    return -1;
  },

  // Indeksy nut, które minęły linię trafienia i nie zostały trafione.
  findMissedNotes(notes, time) {
    const missed = [];
    for (let i = 0; i < notes.length; i++) {
      if (!notes[i].judged && time - notes[i].time > Rules.GOOD_WINDOW) missed.push(i);
    }
    return missed;
  },
};
