#!/bin/sh
# Rysuje 5 póz postaci (chibi Haimiya Mio, fan art) jako pliki SVG w images/postac/.
# Uruchom z głównego folderu projektu w Git Bash: sh tools/draw-character.sh
out=images/postac
SKIN="#f6dccd"; HAIR="#c4cad6"; HAIR_BACK="#a9b0c0"; TOP="#22222e"; LINE="#55557a"

arm() { # arm "x1 y1 x2 y2 x3 y3" — rękaw (obrys + kolor) i dłoń na końcu
  set -- $1
  echo "<path d=\"M$1 $2 L$3 $4 L$5 $6\" fill=\"none\" stroke=\"$LINE\" stroke-width=\"15\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
  echo "<path d=\"M$1 $2 L$3 $4 L$5 $6\" fill=\"none\" stroke=\"$TOP\" stroke-width=\"11\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
  echo "<circle cx=\"$5\" cy=\"$6\" r=\"6.5\" fill=\"$SKIN\" stroke=\"$LINE\" stroke-width=\"1.5\"/>"
}

eye() { # eye x — oko patrzące spod półprzymkniętej powieki
  x=$1
  echo "<ellipse cx=\"$x\" cy=\"103\" rx=\"10\" ry=\"11\" fill=\"#fff\"/>"
  echo "<ellipse cx=\"$((x + 1))\" cy=\"105\" rx=\"7.5\" ry=\"9\" fill=\"#5f7fe0\"/>"
  echo "<ellipse cx=\"$((x + 1))\" cy=\"107\" rx=\"3.5\" ry=\"4.5\" fill=\"#1d2550\"/>"
  echo "<circle cx=\"$((x - 2))\" cy=\"101\" r=\"2.5\" fill=\"#fff\"/>"
  echo "<path d=\"M$((x - 14)) 90 H$((x + 14)) V98 Q$x 93 $((x - 14)) 98 Z\" fill=\"$SKIN\"/>"
  echo "<path d=\"M$((x - 13)) 98 Q$x 92 $((x + 13)) 98\" fill=\"none\" stroke=\"#2a2a3a\" stroke-width=\"3.5\" stroke-linecap=\"round\"/>"
}

pose() { # pose nazwa kąt "lewa ręka" "prawa ręka"
  name=$1; angle=$2; left=$3; right=$4
  {
    echo '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" width="400" height="600">'
    echo '<defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#2bd9ff" flood-opacity="0.7"/></filter></defs>'
    echo "<g filter=\"url(#glow)\" transform=\"rotate($angle 100 276)\">"
    # włosy z tyłu — długie, do pasa
    echo "<path d=\"M42 86 Q36 26 100 22 Q164 26 158 86 L164 196 Q152 206 140 192 L134 128 L66 128 L60 192 Q48 206 36 196 Z\" fill=\"$HAIR_BACK\"/>"
    # szerokie, podarte jeansy i buty
    echo '<path d="M72 196 L100 196 L100 270 L58 270 Q62 230 72 196 Z" fill="#46658e"/>'
    echo '<path d="M100 196 L128 196 Q138 230 142 270 L100 270 Z" fill="#4f709b"/>'
    echo '<rect x="71" y="193" width="58" height="8" rx="2" fill="#5b7aa3"/>'
    echo '<path d="M68 226 L90 219 L92 226 L70 234 Z" fill="#c9d3e3"/>'
    echo '<rect x="108" y="236" width="20" height="10" rx="2" fill="#c9d3e3"/>'
    echo '<rect x="113" y="252" width="16" height="6" rx="1" fill="#d7dfec"/>'
    echo "<ellipse cx=\"78\" cy=\"274\" rx=\"21\" ry=\"7\" fill=\"#151520\" stroke=\"$LINE\" stroke-width=\"2\"/>"
    echo "<ellipse cx=\"122\" cy=\"274\" rx=\"21\" ry=\"7\" fill=\"#151520\" stroke=\"$LINE\" stroke-width=\"2\"/>"
    # brzuch i czarny crop top z wiązaniem przy dekolcie
    echo "<rect x=\"78\" y=\"184\" width=\"44\" height=\"12\" fill=\"$SKIN\"/>"
    echo "<path d=\"M74 146 Q100 138 126 146 L130 188 Q100 194 70 188 Z\" fill=\"$TOP\" stroke=\"$LINE\" stroke-width=\"2\"/>"
    echo "<path d=\"M92 136 L108 136 L106 150 Q100 154 94 150 Z\" fill=\"$SKIN\"/>"
    echo '<path d="M97 152 L100 159 L103 152 M100 152 L100 164" fill="none" stroke="#9a9ac0" stroke-width="1.5"/>'
    # mała czarna torebka na ramię
    echo '<path d="M122 148 L133 176" stroke="#15151f" stroke-width="2.5"/>'
    echo "<rect x=\"125\" y=\"175\" width=\"17\" height=\"14\" rx=\"3\" fill=\"#15151f\" stroke=\"$LINE\" stroke-width=\"2\"/>"
    # twarz
    echo "<ellipse cx=\"100\" cy=\"88\" rx=\"48\" ry=\"46\" fill=\"$SKIN\"/>"
    eye 80
    eye 120
    echo '<ellipse cx="70" cy="119" rx="8" ry="4" fill="#ff8fb0" opacity="0.45"/>'
    echo '<ellipse cx="130" cy="119" rx="8" ry="4" fill="#ff8fb0" opacity="0.45"/>'
    echo '<path d="M96 125 Q100 127 104 125" fill="none" stroke="#a0505a" stroke-width="2" stroke-linecap="round"/>'
    # pasma włosów przy twarzy i grzywka zaczesana na bok
    echo "<path d=\"M52 80 Q44 122 58 170 Q67 150 64 118 Q62 96 62 84 Z\" fill=\"$HAIR\"/>"
    echo "<path d=\"M148 80 Q156 122 142 170 Q133 150 136 118 Q138 96 138 84 Z\" fill=\"$HAIR\"/>"
    echo "<path d=\"M50 90 Q46 34 100 32 Q154 34 150 90 Q144 66 128 58 Q128 76 118 92 Q114 70 100 62 Q92 78 76 90 Q80 72 84 62 Q66 70 58 94 Z\" fill=\"$HAIR\"/>"
    echo '<path d="M70 46 Q100 38 130 46" fill="none" stroke="#eef1f7" stroke-width="3" opacity="0.8"/>'
    # okulary na głowie i kolczyki-kółka
    echo '<g fill="rgba(200,230,255,0.25)" stroke="#111" stroke-width="4"><rect x="66" y="33" width="28" height="15" rx="3"/><rect x="106" y="33" width="28" height="15" rx="3"/></g>'
    echo '<path d="M94 39 L106 39" stroke="#111" stroke-width="4"/>'
    echo '<circle cx="54" cy="116" r="5" fill="none" stroke="#e8ecf5" stroke-width="2"/>'
    echo '<circle cx="146" cy="116" r="5" fill="none" stroke="#e8ecf5" stroke-width="2"/>'
    # ręce na samym wierzchu, żeby było widać taniec
    arm "$left"
    arm "$right"
    echo '</g></svg>'
  } > "$out/$name.svg"
}

#     nazwa kąt  lewa ręka                    prawa ręka
pose  stoi   0   "78 150 70 172 68 190"       "122 150 136 170 128 152"
pose  d     -7   "78 150 50 124 34 90 "       "122 150 130 172 132 190"
pose  f     -3   "78 150 56 150 52 116"       "122 150 138 166 128 184"
pose  j      3   "78 150 62 166 72 184"       "122 150 144 150 148 116"
pose  k      7   "78 150 70 172 68 190"       "122 150 150 124 166 90 "
