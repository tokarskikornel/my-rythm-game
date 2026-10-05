// Generator poziomów: szuka w muzyce uderzeń i zamienia je na nuty.
// Piosenka jest wcześniej rozdzielona na trzy pasma: niskie (stopa, bas),
// środkowe (werbel, wokal) i wysokie (hi-hat, talerze).

const Generator = {
  HOP: 0.01, // co ile sekund mierzymy głośność
  WINDOW: 0.02, // z jak długiego kawałka liczymy głośność
  PEAK_RADIUS: 3, // uderzenie musi być najmocniejsze w ±3 pomiarach
  MIN_STRENGTH: 0.2, // słabsze skoki głośności ignorujemy
  AVERAGE_RADIUS: 0.5, // porównujemy z otoczeniem ±0,5 s...
  AVERAGE_FACTOR: 1.5, // ...i uderzenie musi być 1,5 raza mocniejsze od średniej
  SAME_EVENT: 0.03, // uderzenia w różnych pasmach bliżej niż 30 ms to jedno zdarzenie
  MIN_GAP: 0.25, // najmniejszy odstęp między nutami = maks. 4 nuty na sekundę
  BAND_LANES: { low: [0, 1], mid: [1, 2], high: [2, 3] },

  // Głośność (RMS) w krótkich oknach, co HOP sekund.
  frameEnergies(samples, sampleRate) {
    const hop = Math.round(Generator.HOP * sampleRate);
    const win = Math.round(Generator.WINDOW * sampleRate);
    const energies = [];
    for (let start = 0; start < samples.length; start += hop) {
      const end = Math.min(start + win, samples.length);
      let sum = 0;
      for (let i = start; i < end; i++) sum += samples[i] * samples[i];
      energies.push(Math.sqrt(sum / (end - start)));
    }
    return energies;
  },

  // Jak mocno głośność skoczyła w górę względem poprzedniego pomiaru (spadki = 0).
  onsetStrength(energies) {
    return energies.map((e, i) => {
      if (i === 0) return 0;
      return Math.max(0, Math.log(e + 0.001) - Math.log(energies[i - 1] + 0.001));
    });
  },

  // Wybiera wyraźne uderzenia: lokalne maksima, mocne i wyraźnie powyżej otoczenia.
  pickPeaks(strength) {
    const radius = Generator.PEAK_RADIUS;
    const avgRadius = Math.round(Generator.AVERAGE_RADIUS / Generator.HOP);
    // Sumy prefiksowe — szybkie liczenie średniej z dowolnego okna.
    const prefix = [0];
    for (const s of strength) prefix.push(prefix[prefix.length - 1] + s);

    const peaks = [];
    for (let i = 0; i < strength.length; i++) {
      const s = strength[i];
      if (s <= Generator.MIN_STRENGTH) continue;
      let isMax = true;
      for (let j = Math.max(0, i - radius); j <= Math.min(strength.length - 1, i + radius); j++) {
        if ((j < i && strength[j] >= s) || (j > i && strength[j] > s)) isMax = false;
      }
      if (!isMax) continue;
      const from = Math.max(0, i - avgRadius);
      const to = Math.min(strength.length, i + avgRadius + 1);
      const average = (prefix[to] - prefix[from]) / (to - from);
      if (s <= Generator.AVERAGE_FACTOR * average) continue;
      // Czas = środek okna pomiaru.
      peaks.push({ time: i * Generator.HOP + Generator.WINDOW / 2, strength: s });
    }
    return peaks;
  },

  // Zamienia uderzenia z trzech pasm na nuty: łączy, przerzedza i rozdziela na ścieżki.
  buildNotes(bandPeaks) {
    // 1. Uderzenia ze wszystkich pasm po kolei; bliskie łączymy w jedno zdarzenie.
    const all = [];
    for (const band of ["low", "mid", "high"]) {
      for (const p of bandPeaks[band]) all.push({ time: p.time, strength: p.strength, band });
    }
    all.sort((a, b) => a.time - b.time);
    const events = [];
    for (const p of all) {
      const last = events[events.length - 1];
      if (last && p.time - last.time <= Generator.SAME_EVENT) {
        last.bands[p.band] = Math.max(last.bands[p.band] || 0, p.strength);
        last.strength = Math.max(last.strength, p.strength);
      } else {
        events.push({ time: p.time, strength: p.strength, bands: { [p.band]: p.strength } });
      }
    }

    // 2. Przerzedzanie: najpierw najmocniejsze, odrzucamy te za blisko już wybranych.
    const chosen = [];
    for (const e of [...events].sort((a, b) => b.strength - a.strength)) {
      if (chosen.every((c) => Math.abs(c.time - e.time) >= Generator.MIN_GAP - 1e-9)) chosen.push(e);
    }
    chosen.sort((a, b) => a.time - b.time);

    // 3. Ścieżki: każde pasmo ma dwie, wybieramy inną niż poprzednia nuta (na zmianę).
    let previous = -1;
    let toggle = 0;
    const pickLane = (candidates) => {
      const options = candidates.filter((lane) => lane !== previous);
      if (options.length === 1) return options[0];
      return options[toggle++ % 2];
    };

    const notes = [];
    for (const e of chosen) {
      const time = Math.round(e.time * 1000) / 1000;
      if (e.bands.low !== undefined && e.bands.high !== undefined) {
        // 4. Stopa i talerz naraz = akord na dwóch ścieżkach.
        const low = pickLane(Generator.BAND_LANES.low);
        const high = pickLane(Generator.BAND_LANES.high);
        notes.push({ time, lane: low }, { time, lane: high });
        previous = e.bands.low >= e.bands.high ? low : high;
      } else {
        const main = Object.keys(e.bands).reduce((a, b) => (e.bands[a] >= e.bands[b] ? a : b));
        previous = pickLane(Generator.BAND_LANES[main]);
        notes.push({ time, lane: previous });
      }
    }
    return notes;
  },

  // Całość: trzy pasma dźwięku → nuty.
  generateNotes(bands, sampleRate) {
    const peaks = {};
    for (const band of ["low", "mid", "high"]) {
      const energies = Generator.frameEnergies(bands[band], sampleRate);
      peaks[band] = Generator.pickPeaks(Generator.onsetStrength(energies));
    }
    return Generator.buildNotes(peaks);
  },
};
