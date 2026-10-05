// Neon Rhythm — pętla gry, zegar, dźwięk i rysowanie.

const NOTE_TRAVEL_TIME = 1.5; // ile sekund nuta leci od góry do linii trafienia
const LANE_KEYS = ["KeyD", "KeyF", "KeyJ", "KeyK"];
const LANE_COLORS = ["#ff2bd6", "#2bd9ff", "#3dff7a", "#ffe32b"];
const LANE_WIDTH = 90;
const HIT_LINE = 0.85; // linia trafienia na 85% wysokości ekranu
const LEVEL_END_DELAY = 1.0; // ile sekund po ostatniej nucie kończy się poziom

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

// Zegar gry w sekundach. W pauzie czas stoi w miejscu.
function createClock() {
  let startedAt = 0;
  let pausedAt = null;
  return {
    start() {
      startedAt = performance.now();
      pausedAt = null;
    },
    now() {
      const t = pausedAt === null ? performance.now() : pausedAt;
      return (t - startedAt) / 1000;
    },
    pause() {
      if (pausedAt === null) pausedAt = performance.now();
    },
    resume() {
      if (pausedAt === null) return;
      startedAt += performance.now() - pausedAt;
      pausedAt = null;
    },
    isPaused() {
      return pausedAt !== null;
    },
  };
}

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
  clock: createClock(),
  nextBeat: 0,
  endTime: 0,
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
  const lastNote = game.notes.length ? game.notes[game.notes.length - 1].time : 0;
  game.endTime = lastNote + LEVEL_END_DELAY;
  game.clock.start();
  game.screen = "playing";
}

function endLevel() {
  game.screen = "results";
}

function update() {
  const now = game.clock.now();

  // Metronom: "tyk" na każde uderzenie, mocniejszy co 4.
  const beatLength = 60 / game.level.bpm;
  while (now >= game.nextBeat * beatLength) {
    playClick(game.nextBeat % 4 === 0);
    game.nextBeat++;
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
    ctx.strokeStyle = "rgba(120, 120, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, -1, LANE_WIDTH, height + 2);
  }

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

function draw() {
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, width, height);
  const hitY = height * HIT_LINE;
  drawLanes(hitY);
  if (game.level) drawNotes(game.clock.now(), hitY);
}

function frame() {
  if (game.screen === "playing") update();
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Tymczasowo: kliknięcie startuje pierwszy poziom (menu pojawi się w zadaniu 4).
window.addEventListener("click", () => {
  if (game.screen !== "playing") startLevel(window.LEVELS[0]);
});
