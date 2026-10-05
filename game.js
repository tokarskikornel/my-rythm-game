// Neon Rhythm — pętla gry, zegar, dźwięk i rysowanie.

const NOTE_TRAVEL_TIME = 1.5; // ile sekund nuta leci od góry do linii trafienia
const LANE_KEYS = ["KeyD", "KeyF", "KeyJ", "KeyK"];
const LANE_COLORS = ["#ff2bd6", "#2bd9ff", "#3dff7a", "#ffe32b"];
const LANE_LABELS = ["D", "F", "J", "K"];
const JUDGEMENT_COLORS = { PERFECT: "#2bd9ff", GOOD: "#3dff7a", MISS: "#ff4d6d" };
const FLASH_TIME = 0.3; // jak długo trwa błysk po trafieniu (s)
const TEXT_TIME = 0.5; // jak długo widać napis PERFECT/GOOD/MISS (s)
const LANE_WIDTH = 90;
const HIT_LINE = 0.85; // linia trafienia na 85% wysokości ekranu
const LEVEL_END_DELAY = 1.0; // ile sekund po ostatniej nucie kończy się poziom (bez muzyki)
const LEAD_IN = 2; // sekundy rozbiegu przed startem muzyki
const SYNC_TOLERANCE = 0.05; // większy rozjazd zegara i muzyki (s) = zegar dogania muzykę

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let width = 0;
let height = 0;

// Dopasowanie canvasa do okna. devicePixelRatio = ostry obraz na ekranach z powiększeniem.
function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// Dźwięk metronomu generowany przez Web Audio — bez plików z muzyką.
let audioCtx = null;

function playClick(accent) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = accent ? 1000 : 700;
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

const game = {
  screen: "menu", // "menu" | "playing" | "paused" | "results"
  level: null,
  notes: [],
  score: Rules.createScore(),
  clock: Clock.create(),
  nextBeat: 0,
  endTime: 0,
  pressed: [false, false, false, false], // które klawisze są teraz wciśnięte
  flashes: [], // błyski po trafieniach: { lane, at }
  lastJudgement: null, // ostatni napis: { judgement, at }
};

function startLevel(level) {
  // Przeglądarka pozwala włączyć dźwięk dopiero po kliknięciu lub klawiszu gracza.
  if (!audioCtx) audioCtx = new AudioContext();
  audioCtx.resume();

  game.level = level;
  game.notes = level.notes
    .map((n) => ({ time: n.time, lane: n.lane, judged: false }))
    .sort((a, b) => a.time - b.time);
  game.score = Rules.createScore();
  game.nextBeat = 0;
  game.flashes = [];
  game.lastJudgement = null;

  stopMusic();
  if (level.music) {
    // Z muzyką: poziom kończy się razem z piosenką (zdarzenie "ended"), czas startuje od -2.
    if (music.getAttribute("src") !== level.music) music.src = level.music;
    game.endTime = Infinity;
    game.clock.start(-LEAD_IN);
  } else {
    game.endTime = lastNoteTime() + LEVEL_END_DELAY;
    game.clock.start(0);
  }
  showScreen("playing");
}

function lastNoteTime() {
  return game.notes.length ? game.notes[game.notes.length - 1].time : 0;
}

// --- Muzyka ---

const music = document.getElementById("music");

function stopMusic() {
  music.pause();
  if (music.currentTime > 0) music.currentTime = 0;
}

// Startuje muzykę, gdy skończy się rozbieg, i pilnuje, żeby zegar gry nie odjechał od piosenki.
function syncMusic(now) {
  if (now >= 0 && music.paused && !music.ended) {
    music.play().catch(() => {}); // błąd odtwarzania obsługuje zdarzenie "error"
  }
  if (!music.paused && Math.abs(music.currentTime - now) > SYNC_TOLERANCE) {
    game.clock.seek(music.currentTime);
  }
}

music.addEventListener("ended", () => {
  if (game.screen === "playing" && game.level && game.level.music) endLevel();
});

// Gdy piosenki nie da się odtworzyć, gramy dalej bez niej i kończymy po ostatniej nucie.
music.addEventListener("error", () => {
  if (game.level && game.level.music) game.endTime = lastNoteTime() + LEVEL_END_DELAY;
});

function endLevel() {
  const { score } = game.score;
  const isNewBest = score > loadBest(game.level.id);
  if (isNewBest) saveBest(game.level.id, score);

  const accuracy = Rules.accuracy(game.score);
  document.getElementById("result-grade").textContent = Rules.grade(accuracy);
  document.getElementById("result-new-best").classList.toggle("hidden", !isNewBest);
  document.getElementById("result-score").textContent = score;
  document.getElementById("result-perfect").textContent = game.score.perfect;
  document.getElementById("result-good").textContent = game.score.good;
  document.getElementById("result-miss").textContent = game.score.miss;
  document.getElementById("result-max-combo").textContent = game.score.maxCombo;
  document.getElementById("result-accuracy").textContent = Math.round(accuracy * 100) + "%";
  showScreen("results");
}

// --- Ekrany ---

function showScreen(name) {
  game.screen = name;
  document.getElementById("menu").classList.toggle("hidden", name !== "menu");
  document.getElementById("pause").classList.toggle("hidden", name !== "paused");
  document.getElementById("results").classList.toggle("hidden", name !== "results");
}

function pauseGame() {
  if (game.screen !== "playing") return;
  game.clock.pause();
  music.pause();
  game.pressed.fill(false);
  showScreen("paused");
}

// Muzykę wznowi syncMusic() w następnej klatce — także gdy pauza była jeszcze w rozbiegu.
function resumeGame() {
  if (game.screen !== "paused") return;
  game.clock.resume();
  showScreen("playing");
}

function showMenu() {
  stopMusic();
  game.level = null; // pusta plansza za menu
  renderLevelList();
  showScreen("menu");
}

function renderLevelList() {
  const list = document.getElementById("level-list");
  list.replaceChildren();
  for (const level of window.LEVELS) {
    const button = document.createElement("button");
    const title = document.createElement("span");
    title.className = "level-title";
    title.textContent = level.title;
    const info = document.createElement("span");
    info.className = "level-info";
    const hasLicense = level.license && level.license !== "—";
    const parts = [level.artist, hasLicense ? level.license : null, "Rekord: " + loadBest(level.id)];
    info.textContent = parts.filter(Boolean).join(" · ");
    button.append(title, info);
    button.addEventListener("click", () => {
      button.blur();
      startLevel(level);
    });
    const item = document.createElement("li");
    item.append(button);
    list.append(item);
  }
}

// --- Rekordy ---
// localStorage może być zablokowany (np. tryb prywatny) — wtedy gra działa bez rekordów.

function loadBest(levelId) {
  try {
    return Number(localStorage.getItem("neon-rhythm:best:" + levelId)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(levelId, score) {
  try {
    localStorage.setItem("neon-rhythm:best:" + levelId, String(score));
  } catch {
    // brak miejsca albo zablokowany localStorage — rekord po prostu się nie zapisze
  }
}

// Zalicza nutę jako PERFECT / GOOD / MISS: aktualizuje wynik i dodaje efekty.
function judge(noteIndex, judgement) {
  const note = game.notes[noteIndex];
  const now = game.clock.now();
  note.judged = true;
  game.score = Rules.applyJudgement(game.score, judgement);
  game.lastJudgement = { judgement, at: now };
  if (judgement !== "MISS") game.flashes.push({ lane: note.lane, at: now });
}

function update() {
  const now = game.clock.now();

  for (const index of Rules.findMissedNotes(game.notes, now)) judge(index, "MISS");
  game.flashes = game.flashes.filter((f) => now - f.at < FLASH_TIME);

  if (game.level.music) {
    syncMusic(now);
  } else {
    // Metronom: "tyk" na każde uderzenie, mocniejszy co 4.
    const beatLength = 60 / game.level.bpm;
    while (now >= game.nextBeat * beatLength) {
      playClick(game.nextBeat % 4 === 0);
      game.nextBeat++;
    }
  }

  if (now > game.endTime) endLevel();
}

// --- Rysowanie ---

function laneX(lane) {
  return (width - LANE_WIDTH * LANE_KEYS.length) / 2 + lane * LANE_WIDTH;
}

function drawLanes(hitY) {
  for (let lane = 0; lane < LANE_KEYS.length; lane++) {
    const x = laneX(lane);
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(x, 0, LANE_WIDTH, height);
    if (game.pressed[lane]) {
      // Wciśnięty klawisz: ścieżka jaśnieje w swoim kolorze.
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = LANE_COLORS[lane];
      ctx.fillRect(x, 0, LANE_WIDTH, height);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(120, 120, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, -1, LANE_WIDTH, height + 2);
  }

  // Klawisze pod linią trafienia — świecą, gdy są wciśnięte.
  ctx.save();
  ctx.font = "bold 20px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let lane = 0; lane < LANE_KEYS.length; lane++) {
    const x = laneX(lane);
    const color = LANE_COLORS[lane];
    const on = game.pressed[lane];
    ctx.shadowColor = color;
    ctx.shadowBlur = on ? 25 : 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillStyle = on ? color : "rgba(10, 10, 20, 0.9)";
    ctx.beginPath();
    ctx.roundRect(x + 12, hitY + 16, LANE_WIDTH - 24, 40, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = on ? "#0a0a14" : color;
    ctx.fillText(LANE_LABELS[lane], x + LANE_WIDTH / 2, hitY + 37);
  }
  ctx.restore();

  // Świecąca linia trafienia.
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(laneX(0), hitY - 2, LANE_WIDTH * LANE_KEYS.length, 4);
  ctx.restore();
}

function drawNotes(now, hitY) {
  ctx.save();
  ctx.shadowBlur = 20;
  for (const note of game.notes) {
    if (note.judged) continue;
    const y = hitY - ((note.time - now) / NOTE_TRAVEL_TIME) * hitY;
    if (y < -20 || y > height + 20) continue;
    const color = LANE_COLORS[note.lane];
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(laneX(note.lane) + 8, y - 9, LANE_WIDTH - 16, 18, 6);
    ctx.fill();
  }
  ctx.restore();
}

// Rozszerzający się, zanikający krąg w miejscu trafienia.
function drawFlashes(now, hitY) {
  ctx.save();
  ctx.lineWidth = 4;
  for (const flash of game.flashes) {
    const progress = (now - flash.at) / FLASH_TIME;
    if (progress < 0 || progress > 1) continue;
    const color = LANE_COLORS[flash.lane];
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(laneX(flash.lane) + LANE_WIDTH / 2, hitY, 20 + progress * 40, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Napis PERFECT / GOOD / MISS nad linią trafienia, unosi się i znika.
function drawJudgement(now, hitY) {
  const last = game.lastJudgement;
  if (!last) return;
  const progress = (now - last.at) / TEXT_TIME;
  if (progress < 0 || progress > 1) return;
  const color = JUDGEMENT_COLORS[last.judgement];
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.font = "bold 36px Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillText(last.judgement, width / 2, hitY - 80 - progress * 20);
  ctx.restore();
}

// Wynik, combo i mnożnik w lewym górnym rogu.
function drawHud() {
  const { score, combo } = game.score;
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = "#e6e6ff";
  ctx.shadowColor = "#2bd9ff";
  ctx.shadowBlur = 10;
  ctx.font = "16px Consolas, monospace";
  ctx.fillText("WYNIK", 20, 30);
  ctx.font = "bold 32px Consolas, monospace";
  ctx.fillText(String(score), 20, 64);
  if (combo > 1) {
    ctx.font = "bold 24px Consolas, monospace";
    ctx.fillText(combo + " COMBO", 20, 104);
  }
  const multiplier = Rules.multiplier(combo);
  if (multiplier > 1) {
    ctx.fillStyle = "#ffe32b";
    ctx.shadowColor = "#ffe32b";
    ctx.font = "bold 28px Consolas, monospace";
    ctx.fillText("x" + multiplier, 20, 140);
  }
  ctx.restore();
}

function draw() {
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, width, height);
  const hitY = height * HIT_LINE;
  drawLanes(hitY);
  if (!game.level) return;
  const now = game.clock.now();
  drawNotes(now, hitY);
  drawFlashes(now, hitY);
  drawJudgement(now, hitY);
  drawHud();
}

function frame() {
  if (game.screen === "playing") update();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Klawiatura ---
// event.code to fizyczny klawisz, więc Caps Lock ani układ klawiatury nie przeszkadzają.

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !event.repeat) {
    if (game.screen === "playing") pauseGame();
    else if (game.screen === "paused") resumeGame();
    return;
  }
  const lane = LANE_KEYS.indexOf(event.code);
  if (lane === -1) return;
  game.pressed[lane] = true;
  // Przytrzymany klawisz wysyła powtórzenia — nie mogą trafiać kolejnych nut.
  if (event.repeat || game.screen !== "playing") return;
  const now = game.clock.now();
  const index = Rules.findHittableNote(game.notes, lane, now);
  if (index === -1) return; // wciśnięcie "w pustkę" niczego nie psuje
  judge(index, Rules.judgeOffset(now - game.notes[index].time));
});

window.addEventListener("keyup", (event) => {
  const lane = LANE_KEYS.indexOf(event.code);
  if (lane !== -1) game.pressed[lane] = false;
});

// Przełączenie okna lub karty w trakcie gry = automatyczna pauza.
// Do tego przeglądarka nie wyśle wtedy keyup, więc gasimy wszystkie klawisze.
window.addEventListener("blur", () => {
  game.pressed.fill(false);
  pauseGame();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame();
});

// --- Przyciski ---
// blur() zdejmuje fokus z przycisku, żeby Spacja/Enter w grze go ponownie nie "klikały".

function onClick(id, action) {
  document.getElementById(id).addEventListener("click", (event) => {
    event.currentTarget.blur();
    action();
  });
}

onClick("resume-button", resumeGame);
onClick("pause-menu-button", showMenu);
onClick("retry-button", () => startLevel(game.level));
onClick("results-menu-button", showMenu);

showMenu();
