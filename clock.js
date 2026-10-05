// Zegar gry w sekundach. W pauzie czas stoi w miejscu.
// Źródło czasu (nowMs) można podmienić — testy sterują nim ręcznie.

const Clock = {
  create(nowMs = () => performance.now()) {
    let startedAt = 0; // chwila (ms), w której zegar pokazywałby 0
    let pausedAt = null; // chwila (ms) wciśnięcia pauzy albo null

    return {
      // Start od podanego czasu, np. -2 = dwie sekundy rozbiegu.
      start(fromSec = 0) {
        startedAt = nowMs() - fromSec * 1000;
        pausedAt = null;
      },
      now() {
        const t = pausedAt === null ? nowMs() : pausedAt;
        return (t - startedAt) / 1000;
      },
      pause() {
        if (pausedAt === null) pausedAt = nowMs();
      },
      resume() {
        if (pausedAt === null) return;
        startedAt += nowMs() - pausedAt;
        pausedAt = null;
      },
      isPaused() {
        return pausedAt !== null;
      },
      // Przestawia zegar na podany czas — np. żeby dogonić muzykę.
      seek(sec) {
        const t = pausedAt === null ? nowMs() : pausedAt;
        startedAt = t - sec * 1000;
      },
    };
  },
};
