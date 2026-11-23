// Weather glyphs and value-to-colour scales.
// Glyphs are original flat geometric shapes (circles, capsules, bars) so they sit inside the
// console's block language; colours come from the console palette where possible.

/* ---------- colour scales (flat colour per value, rendered as stepped segments, never smooth fills) ---------- */
const TEMP_STOPS = [ // °F → colour
  [0, '#9999FF'], [20, '#66CCFF'], [35, '#66E0F0'], [50, '#4FB3BF'],
  [62, '#9AC6C4'], [72, '#FFC14D'], [82, '#F7A541'], [92, '#FF6753'], [100, '#E7442A'],
];
const HUM_STOPS = [ // %RH → colour: dry orange, comfortable teal, humid blue
  [0, '#F7A541'], [25, '#FFC14D'], [35, '#9AC6C4'], [55, '#9AC6C4'], [70, '#37A6D1'], [85, '#5588EE'], [100, '#7799DD'],
];
function lerpHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(' ')})`;
}
function scale(stops, v) {
  if (v == null || isNaN(v)) return null;
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    if (v <= x1) { const [x0, c0] = stops[i - 1]; return lerpHex(c0, c1, (v - x0) / (x1 - x0)); }
  }
  return stops[stops.length - 1][1];
}
export const tempColor = (f) => scale(TEMP_STOPS, +f);
export const humColor = (h) => scale(HUM_STOPS, +h);

/** Segmented meter: each lit segment takes the scale colour at its own position, so the bar reads as a stepped ramp. */
export function ScaleBar({ min, max, from, to, fn, segs = 16, label }) {
  const out = [];
  for (let i = 0; i < segs; i++) {
    const mid = min + ((i + 0.5) / segs) * (max - min);
    const lit = mid >= from && mid <= to;
    out.push(<span class="sb-seg" style={lit ? { background: fn(mid) } : undefined} data-lit={lit ? '' : undefined} />);
  }
  return <div class="sb" role="img" aria-label={label}>{out}</div>;
}

/* ---------- glyphs ---------- */
const C = {
  sun: 'var(--bl-sunflower)', moon: 'var(--bl-ice)', cloud: 'var(--bl-ice)', dark: '#9EA5BA',
  rain: 'var(--bl-sky)', snow: 'var(--bl-bone)', bolt: 'var(--bl-sunflower)', fog: 'var(--bl-tan)', alert: 'var(--bl-red)',
};
const Cloud = ({ fill = C.cloud, y = 0, x = 0, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
    <circle cx="19" cy="22" r="8" />
    <circle cx="29" cy="19" r="10" />
    <rect x="7" y="22" width="35" height="12" rx="6" />
  </g>
);
const Sun = ({ cx = 24, cy = 24, r = 9, rays = true }) => (
  <g fill={C.sun}>
    <circle cx={cx} cy={cy} r={r} />
    {rays && [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <rect x={cx - 1.6} y={cy - r - 7} width="3.2" height="5" rx="1.6" transform={`rotate(${a} ${cx} ${cy})`} />
    ))}
  </g>
);
const Moon = ({ cx = 24, cy = 24 }) => <path fill={C.moon} d={`M${cx + 2} ${cy - 13} A13 13 0 1 0 ${cx + 11} ${cy + 8} A10 10 0 1 1 ${cx + 2} ${cy - 13} Z`} />;
const Drops = ({ n = 3, fill = C.rain }) => (
  <g fill={fill}>{Array.from({ length: n }, (_, i) => <rect x={13 + i * (24 / n)} y="37" width="3.4" height="8" rx="1.7" transform={`rotate(18 ${14 + i * (24 / n)} 41)`} />)}</g>
);
const Flakes = () => <g fill={C.snow}>{[[14, 40], [22, 44], [30, 40], [38, 44]].map(([x, y]) => <circle cx={x} cy={y} r="2.4" />)}</g>;
const Bolt = () => <path fill={C.bolt} d="M25 30 L18 41 H23 L20 48 L30 36 H25 L28 30 Z" />;

const GLYPH = {
  sunny: () => <Sun />,
  'clear-night': () => <Moon />,
  partlycloudy: () => <><Sun cx={17} cy={17} r={7} /><Cloud x={4} y={6} s={0.95} /></>,
  cloudy: () => <><Cloud fill={C.dark} x={-4} y={-6} s={0.8} /><Cloud y={2} /></>,
  rainy: () => <><Cloud y={-4} /><Drops n={3} /></>,
  pouring: () => <><Cloud fill={C.dark} y={-4} /><Drops n={5} /></>,
  snowy: () => <><Cloud y={-4} /><Flakes /></>,
  'snowy-rainy': () => <><Cloud y={-4} /><Drops n={2} /><g fill={C.snow}><circle cx="22" cy="44" r="2.4" /><circle cx="36" cy="44" r="2.4" /></g></>,
  hail: () => <><Cloud fill={C.dark} y={-4} /><g fill={C.cloud}>{[[15, 40], [24, 44], [33, 40]].map(([x, y]) => <circle cx={x} cy={y} r="3" />)}</g></>,
  lightning: () => <><Cloud fill={C.dark} y={-6} /><Bolt /></>,
  'lightning-rainy': () => <><Cloud fill={C.dark} y={-6} /><Bolt /><g fill={C.rain}><rect x="10" y="36" width="3.4" height="8" rx="1.7" transform="rotate(18 11 40)" /><rect x="34" y="36" width="3.4" height="8" rx="1.7" transform="rotate(18 35 40)" /></g></>,
  fog: () => <g fill={C.fog}><rect x="6" y="14" width="36" height="5" rx="2.5" /><rect x="10" y="23" width="32" height="5" rx="2.5" /><rect x="6" y="32" width="30" height="5" rx="2.5" /></g>,
  windy: () => <g fill={C.cloud}><rect x="4" y="14" width="30" height="5" rx="2.5" /><rect x="12" y="23" width="32" height="5" rx="2.5" /><rect x="6" y="32" width="22" height="5" rx="2.5" /></g>,
  'windy-variant': () => <><Cloud y={-8} s={0.9} x={4} /><g fill={C.cloud}><rect x="4" y="34" width="28" height="4.5" rx="2.25" /><rect x="14" y="42" width="30" height="4.5" rx="2.25" /></g></>,
  exceptional: () => <g fill={C.alert}><path d="M24 6 L44 42 H4 Z" /><rect x="22" y="18" width="4" height="13" rx="2" fill="#000" /><circle cx="24" cy="36" r="2.4" fill="#000" /></g>,
};

GLYPH['partlycloudy-night'] = () => <><Moon cx={14} cy={18} /><Cloud x={4} y={6} s={0.95} /></>;
export function WxIcon({ cond, size = 48, night }) {
  const key = night && cond === 'sunny' ? 'clear-night' : night && cond === 'partlycloudy' ? 'partlycloudy-night' : cond;
  const G = GLYPH[key] ?? GLYPH.cloudy;
  return (
    <svg class="wx-ic" width={size} height={size} viewBox="0 0 48 50" role="img" aria-label={cond ?? 'unknown'}>
      <G />
    </svg>
  );
}
