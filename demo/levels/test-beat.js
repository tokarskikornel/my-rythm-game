// Poziom testowy do etapu 1: bez muzyki, rytm wybija metronom (120 BPM = uderzenie co 0,5 s).
(function () {
  const pattern = [0, 1, 2, 3, 2, 1];
  const notes = [];
  for (let i = 0; i < 64; i++) {
    const time = 2.0 + i * 0.5;
    const lane = pattern[i % pattern.length];
    notes.push({ time, lane });
    // Co 8. nuta to akord: druga nuta na lustrzanej ścieżce.
    if (i % 8 === 7) notes.push({ time, lane: 3 - lane });
  }

  window.LEVELS = window.LEVELS || [];
  window.LEVELS.push({
    id: "test-beat",
    title: "Test Beat",
    artist: "Metronom",
    license: "—",
    bpm: 120,
    notes,
  });
})();
