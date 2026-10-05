// Postać obok ścieżek: wybór pozy i podskok. Same obliczenia — rysowanie jest w game.js.

const Character = {
  POSES: ["d", "f", "j", "k"], // poza dla klawiszy D F J K
  MIN_POSE_TIME: 0.15, // nawet krótkie stuknięcie pokazuje pozę przez tyle sekund
  BOUNCE_TIME: 0.15, // jak długo trwa podskok (s)
  BOUNCE_HEIGHT: 10, // jak wysoko podskakuje (px)

  // held: które klawisze są trzymane, pressedAt: kiedy każdy był ostatnio wciśnięty (s).
  // Wygrywa ostatnio wciśnięty klawisz spośród trzymanych albo świeżo stukniętych.
  pose(held, pressedAt, now) {
    let best = -1;
    for (let lane = 0; lane < held.length; lane++) {
      const active = held[lane] || now - pressedAt[lane] < Character.MIN_POSE_TIME;
      if (active && (best === -1 || pressedAt[lane] > pressedAt[best])) best = lane;
    }
    return best === -1 ? "stoi" : Character.POSES[best];
  },

  // Wysokość podskoku (px) po upływie t sekund od wciśnięcia: łuk w górę i z powrotem.
  bounce(t) {
    if (t < 0 || t > Character.BOUNCE_TIME) return 0;
    return Character.BOUNCE_HEIGHT * Math.sin((Math.PI * t) / Character.BOUNCE_TIME);
  },
};
