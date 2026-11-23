// VEHICLES page: a Master Systems Display per Tesla (Tesla Fleet integration).
// The page is drawn on a fixed 1092x640 stage and scaled to fit, so the leader lines stay on the cutaway.
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { ent, call, pending, LS, getDevice, ready } from './ha.js';
import { sfx } from './sfx.js';
import { VEHICLES, VEH_DETAIL } from './rooms.js';
import raichuImg from './img/raichu.webp';
import tessieImg from './img/tessie.webp';

const IMG = { raichu: raichuImg, tessie: tessieImg };
const W = 1092, H = 640;
const SEL_KEY = 'bridgeline.vehicle';
const sel = signal(LS.get(SEL_KEY));
const armed = signal(null);
let armTimer;

const NA = new Set(['unknown', 'unavailable']);
const val = (id) => { const s = ent(id).value; return s && !NA.has(s.state) ? s.state : null; };
// Ticks every 30 s so relative "check-in" ages stay current without new HA data.
const tick = signal(Date.now());
if (typeof window !== 'undefined') setInterval(() => (tick.value = Date.now()), 30000);
const span = (min) => (min < 1 ? 'UNDER 1 MIN' : min < 60 ? `${min} MIN` : min < 1440 ? `${Math.floor(min / 60)}H ${min % 60}M` : `${Math.floor(min / 1440)}D ${Math.floor((min % 1440) / 60)}H`);
/** Last Tesla Fleet poll (sensor.<car>_last_check_in): awake = last poll, asleep = when it fell asleep. */
function checkInMin(p) {
  const t = Date.parse(val(`sensor.${p}_last_check_in`) ?? '');
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((tick.value - t) / 60000));
}
function checkIn(p, asleep) {
  const min = checkInMin(p);
  if (min == null) return null;
  // Fleet polls an awake car about every 10 min; past 25 min awake data is overdue
  return asleep ? `DATA FROM ${span(min)} AGO` : `CHECK-IN ${span(min)}${min >= 1 ? ' AGO' : ''}${min >= 25 ? ' (OVERDUE)' : ''}`;
}
const num = (id) => { const v = val(id); return v == null || Number.isNaN(+v) ? null : +v; };
const busy = (id) => !!pending.value[id];
const UP = (s) => String(s ?? '').replace(/_/g, ' ').toUpperCase();
const LINE = { off: '#37A6D1', on: '#9AC6C4', heat: '#9AC6C4', charge: '#66E0F0', alert: '#E7442A', na: '#1C3C55', flash: '#D2D5DF' };

/** First tap arms (4 s), second tap fires: same sounds as the garage door. */
function twoTap(key, fire) {
  if (armed.peek() !== key) {
    armed.value = key; sfx('arm'); clearTimeout(armTimer);
    armTimer = setTimeout(() => { if (armed.peek() === key) armed.value = null; }, 4000);
    return;
  }
  armed.value = null; clearTimeout(armTimer); sfx('dooralarm'); fire();
}

function useFit() {
  const ref = useRef(null);
  const [fit, setFit] = useState({ k: 1, auto: false });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      const auto = h < 120; // page not height-constrained (narrow layout): size by width
      setFit({ k: auto ? w / W : Math.min(w / W, h / H), auto });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, fit];
}

/* Heat level picker: tapping a heater button opens a row of levels beside it; one tap sends ONE command.
   Steering wheel HIGH is left out: Tesla Fleet sends level 2, which the cars reject (they accept 0, 1, 3). */
const picker = signal(null); // { key, y, opts: [[label, value]], current, pick(value) }
let pickTimer;
function openPicker(cfg) {
  if (picker.peek()?.key === cfg.key) { picker.value = null; return; }
  picker.value = cfg; clearTimeout(pickTimer);
  pickTimer = setTimeout(() => (picker.value = null), 8000);
}
function heatPick(p, kind) {
  const sel = `select.${p}_${kind === 'seat' ? 'seat_heater_front_left' : 'steering_wheel_heater'}`;
  const auto = `switch.${p}_${kind === 'seat' ? 'auto_seat_climate_left' : 'auto_steering_wheel_heater'}`;
  return async (v) => {
    picker.value = null;
    const autoOn = ent(auto).peek()?.state === 'on';
    if (v === 'auto') { call('switch', autoOn ? 'turn_off' : 'turn_on', {}, auto); return; } // tap the lit AUTO again to switch it off
    if (autoOn) await call('switch', 'turn_off', {}, auto); // a manual level takes the heater out of AUTO first
    call('select', 'select_option', { option: v }, sel);
  };
}
function Picker() {
  const P = picker.value;
  if (!P) return null;
  return (
    <>
      <button class="vpick-bg" aria-label="Close level picker" data-sfx="none" onClick={() => (picker.value = null)} />
      <div class="vpick" style={{ top: `${P.y - 24}px` }} role="group" aria-label={`${P.title} level`}>
        <span class="vpick-t">{P.title}</span>
        {P.opts.map(([l, v]) => <button class="vpick-o" data-sel={P.current === v ? '' : undefined} onClick={() => P.pick(v)}>{l}</button>)}
      </div>
    </>
  );
}

function VBtn({ side, y, tone, label, sub, id, onPress, disabled, sound }) {
  return (
    <button class="vb" data-side={side} data-tone={tone} data-busy={id && busy(id) ? '' : undefined} data-sfx={sound}
      style={{ left: side === 'l' ? '0px' : '912px', top: `${y - 24}px` }} disabled={disabled} onClick={onPress}>
      <small>{sub}</small><b>{label}</b>
    </button>
  );
}

function Readout({ x, w, label, value, tone, onPress }) {
  const st = { left: `${x}px`, width: `${w}px` };
  return onPress
    ? <button class="vr vr-btn" data-tone={tone} data-sfx="nav" style={st} onClick={onPress}><span>{label}</span><b>{value}</b></button>
    : <div class="vr" data-tone={tone} style={st}><span>{label}</span><b>{value}</b></div>;
}

/* ---------- LOCATION ---------- */
const mapOpen = signal(false);
const R_MI = 3958.8;
function miles(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.sqrt(h));
}
const ll = (s) => (s && s.attributes?.latitude != null && s.attributes?.longitude != null ? [+s.attributes.latitude, +s.attributes.longitude] : null);
const miTxt = (m) => (m < 10 ? `${Math.round(m * 10) / 10}` : `${Math.round(m)}`);
/** Everything the location tile and map need for one car. */
function whereIs(p) {
  const tr = ent(`device_tracker.${p}_location`).value;
  const pos = ll(tr);
  const home = ll(ent('zone.home').value);
  const zoneName = tr && !NA.has(tr.state) && tr.state !== 'not_home' ? UP(tr.state === 'home' ? 'home' : tr.state) : null;
  const fromHome = pos && home ? miles(home, pos) : null;
  const speed = num(`sensor.${p}_speed`);
  const gear = val(`sensor.${p}_shift_state`);
  const moving = (gear === 'd' || gear === 'r') || (speed != null && speed > 0);
  const destName = val(`sensor.${p}_destination`);
  const dest = ll(ent(`device_tracker.${p}_route`).value);
  const toGo = num(`sensor.${p}_distance_to_arrival`);
  const eta = val(`sensor.${p}_time_to_arrival`);
  const place = zoneName ?? (fromHome != null ? `${miTxt(fromHome)} MI FROM HOME` : pos ? 'AWAY' : 'UNKNOWN');
  return { pos, home, place, zoneName, fromHome, speed, gear, moving, destName, dest, toGo, eta };
}
// OpenStreetMap standard tiles, darkened and tinted in CSS (.mm-t). Free with attribution under the OSM
// tile usage policy for light use; only loaded while a map is open. (CARTO dark tiles now need an API key.)
// OSM refuses tile requests without a Referer, and HA's frontend sets a same-origin referrer policy, so each
// tile overrides it to send just the origin (strict-origin-when-cross-origin). Without this: 403 'Access blocked'.
const TILE = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const proj = (lat, lon, z) => {
  const n = 256 * 2 ** z, s = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
};
/** Minimal slippy map: tiles + markers, zoom buttons, drag to pan. Sized in stage pixels. */
function MiniMap({ w, h, pts, fit }) {
  const zoom = useSignalLocal(null);
  const pan = useSignalLocal([0, 0]);
  const drag = useRef(null);
  const all = pts.filter((q) => q.at);
  const auto = () => {
    if (!all.length) return 4;
    const fitPts = fit.filter(Boolean);
    if (fitPts.length < 2) return 14;
    for (let z = 15; z > 3; z--) {
      const a = fitPts.map((q) => proj(q[0], q[1], z));
      const dx = Math.abs(a[0][0] - a[1][0]), dy = Math.abs(a[0][1] - a[1][1]);
      if (dx < w - 120 && dy < h - 120) return z;
    }
    return 4;
  };
  const z = zoom.v ?? auto();
  const ctr = (() => {
    const f = fit.filter(Boolean);
    if (!f.length) return proj(45, -93, z); // nothing reported: show the region instead of 0,0
    const a = f.map((q) => proj(q[0], q[1], z));
    return [a.reduce((s, q) => s + q[0], 0) / a.length, a.reduce((s, q) => s + q[1], 0) / a.length];
  })();
  const cx = ctr[0] - pan.v[0], cy = ctr[1] - pan.v[1];
  const x0 = cx - w / 2, y0 = cy - h / 2;
  const tiles = [];
  const max = 2 ** z;
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + w) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + h) / 256); ty++)
      if (ty >= 0 && ty < max) tiles.push(<img class="mm-t" src={TILE(z, ((tx % max) + max) % max, ty)} alt="" draggable={false} referrerPolicy="strict-origin-when-cross-origin"
        style={{ left: `${tx * 256 - x0}px`, top: `${ty * 256 - y0}px` }} onError={(ev) => (ev.currentTarget.style.visibility = 'hidden')} />);
  const setZ = (d) => { zoom.v = Math.max(3, Math.min(18, z + d)); pan.v = [0, 0]; };
  const down = (ev) => { drag.current = [ev.clientX, ev.clientY, pan.v]; ev.currentTarget.setPointerCapture?.(ev.pointerId); };
  const move = (ev) => {
    if (!drag.current) return;
    const k = ev.currentTarget.getBoundingClientRect().width / w || 1;
    const [sx, sy, p0] = drag.current;
    pan.v = [p0[0] + (ev.clientX - sx) / k, p0[1] + (ev.clientY - sy) / k];
  };
  const up = () => { drag.current = null; };
  return (
    <div class="mm" style={{ width: `${w}px`, height: `${h}px` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div class="mm-grid" />
      {tiles}
      <svg class="mm-over" viewBox={`0 0 ${w} ${h}`}>
        {pts.filter((q) => q.line && q.at).map((q) => {
          const a = proj(q.line[0], q.line[1], z), b = proj(q.at[0], q.at[1], z);
          return <line x1={a[0] - x0} y1={a[1] - y0} x2={b[0] - x0} y2={b[1] - y0} stroke="#FF9C33" stroke-width="3" stroke-dasharray="10 7" />;
        })}
        {all.map((q) => {
          const [px, py] = proj(q.at[0], q.at[1], z);
          return (
            <g transform={`translate(${px - x0},${py - y0})`}>
              {q.kind === 'car' && <circle class="mm-ping" r="16" fill="none" stroke="#66E0F0" stroke-width="3" />}
              <circle r={q.kind === 'car' ? 9 : 7} fill={q.kind === 'car' ? '#66E0F0' : q.kind === 'dest' ? '#FF9C33' : '#CC99CC'} stroke="#000" stroke-width="2" />
              <text x="14" y="5" class="mm-l" data-k={q.kind}>{q.label}</text>
            </g>
          );
        })}
      </svg>
      <div class="mm-ctl">
        <button data-sfx="tap" onClick={(ev) => { ev.stopPropagation(); setZ(1); }} onPointerDown={(ev) => ev.stopPropagation()}>+</button>
        <button data-sfx="tap" onClick={(ev) => { ev.stopPropagation(); setZ(-1); }} onPointerDown={(ev) => ev.stopPropagation()}>−</button>
        <button data-sfx="tap" onClick={(ev) => { ev.stopPropagation(); zoom.v = null; pan.v = [0, 0]; }} onPointerDown={(ev) => ev.stopPropagation()}>FIT</button>
      </div>
      {!all.length && <div class="mm-none">NO POSITION REPORTED</div>}
      <div class="mm-attr">© OPENSTREETMAP CONTRIBUTORS</div>
    </div>
  );
}
/** useState wrapper with a .v accessor, so MiniMap reads like the signal code around it. */
function useSignalLocal(init) {
  const [v, set] = useState(init);
  return { get v() { return v; }, set v(n) { set(n); } };
}
function useSize() {
  const ref = useRef(null);
  const [sz, set] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = () => set({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, sz];
}
function LocationMap({ p, compact }) {
  const [mref, msz] = useSize();
  const V = VEHICLES[p];
  const online = val(`binary_sensor.${p}_status`);
  const asleep = online === 'off';
  const L = whereIs(p);
  const navigating = !!(L.destName || L.dest) && L.destName !== 'unknown';
  const etaT = L.eta ? Date.parse(L.eta) : NaN;
  const etaMin = Number.isNaN(etaT) ? null : Math.max(0, Math.round((etaT - tick.value) / 60000));
  const gearTxt = { p: 'PARK', d: 'DRIVE', r: 'REVERSE', n: 'NEUTRAL' }[L.gear] ?? '--';
  const ago = (() => { const m = checkInMin(p); return m == null ? '--' : m < 1 ? 'NOW' : `${span(m)} AGO`; })();
  const secPos = [
    [asleep ? 'LAST KNOWN' : 'CURRENT', L.place, L.zoneName ? 'on' : undefined],
    // distance only adds information when the car sits in a zone other than home
    ...(L.fromHome != null && L.zoneName && L.zoneName !== 'HOME' ? [['FROM HOME', `${miTxt(L.fromHome)} MI`]] : []),
    ['COORDINATES', L.pos ? `${L.pos[0].toFixed(4)}, ${L.pos[1].toFixed(4)}` : '--'],
  ];
  const secMove = L.moving ? [['SPEED', `${L.speed != null ? Math.round(L.speed) : '--'} MPH`, 'on'], ['GEAR', gearTxt]] : [['GEAR', gearTxt]];
  const secNav = navigating ? [
    ['DESTINATION', UP(L.destName ?? 'ROUTE SET'), 'on'],
    ['TO GO', L.toGo != null ? `${miTxt(L.toGo)} MI` : '--'],
    ['ARRIVAL', etaMin == null ? '--' : `${new Date(etaT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} • ${etaMin < 1 ? 'NOW' : `IN ${span(etaMin)}`}`],
  ] : [];
  const secTel = [[asleep ? 'DATA FROM' : 'CHECK-IN', ago, asleep ? 'dim' : undefined]];
  const pts = [
    ...(L.home && L.zoneName !== 'HOME' ? [{ kind: 'home', at: L.home, label: 'HOME' }] : []),
    ...(L.dest && navigating ? [{ kind: 'dest', at: L.dest, label: UP(L.destName ?? 'DESTINATION'), line: L.pos }] : []),
    { kind: 'car', at: L.pos, label: V.name },
  ];
  return (
    <div class={compact ? 'vd vm vd-c' : 'vd vm'} role="dialog" aria-label={`${V.name} location`}>
      <div class="vd-head">
        <span class="vhead-cap" />
        <span class="vhead-t">{V.name} • {asleep ? 'LAST KNOWN LOCATION' : 'LOCATION'}</span>
        <span class="vd-code">{compact ? '' : null}{L.moving ? `${L.speed != null ? Math.round(L.speed) : '--'} MPH • ${gearTxt}` : gearTxt}{navigating ? ` • TO ${UP(L.destName ?? 'DESTINATION')}` : ''}</span>
        <button class="vd-close" data-sfx="nav" onClick={() => (mapOpen.value = false)}>CLOSE</button>
      </div>
      <div class="vm-body">
        {compact
          ? <div class="vm-mapbox" ref={mref}>{msz.w > 0 && <MiniMap w={msz.w} h={msz.h} pts={pts} fit={[L.pos, navigating ? L.dest : null]} />}</div>
          : <MiniMap w={760} h={590} pts={pts} fit={[L.pos, navigating ? L.dest : null]} />}
        <div class="vm-info">
          {[['POSITION', secPos], [L.moving ? 'UNDERWAY' : 'MOTION', secMove], ['NAVIGATION', secNav], ['TELEMETRY', secTel]].filter(([, r]) => r.length).map(([t, r]) => (
            <DSec title={t}>{r.map(([k, v, tone]) => <DRow k={k} v={v} tone={tone} />)}</DSec>
          ))}
        </div>
      </div>
    </div>
  );
}

function Msd({ p, list }) {
  const V = VEHICLES[p];
  const A = V.anchors;
  const e = (d, s) => `${d}.${p}_${s}`;
  const online = val(e('binary_sensor', 'status'));
  const known = online != null;
  const asleep = online === 'off';
  const nd = (x) => (known ? x : 'NO DATA');

  // ---- state ----
  const seat = val(e('select', 'seat_heater_front_left'));
  const wheel = val(e('select', 'steering_wheel_heater'));
  const seatAuto = val(e('switch', 'auto_seat_climate_left')) === 'on';
  const wheelAuto = val(e('switch', 'auto_steering_wheel_heater')) === 'on';
  const heatSub = (lvl, auto) => `${auto ? 'AUTO • ' : ''}${lvl && lvl !== 'off' ? `HEAT ${UP(lvl)}` : 'OFF'}`;
  const defrost = val(e('switch', 'defrost'));
  const clim = ent(e('climate', 'climate')).value;
  const climOn = clim && !NA.has(clim.state) && clim.state !== 'off';
  const cabin = num(e('sensor', 'inside_temperature'));
  const outside = num(e('sensor', 'outside_temperature'));
  const frunk = val(e('cover', 'frunk'));
  const trunk = val(e('cover', 'trunk'));
  const lock = val(e('lock', 'lock'));
  const doorNames = { front_driver: 'FRONT L', front_passenger: 'FRONT R', rear_driver: 'REAR L', rear_passenger: 'REAR R' };
  const openDoors = Object.keys(doorNames).filter((d) => val(e('binary_sensor', `${d}_door`)) === 'on');
  const openWins = Object.keys(doorNames).filter((d) => val(e('binary_sensor', `${d}_window`)) === 'on');
  const winCover = val(e('cover', 'windows'));
  const port = val(e('cover', 'charge_port_door'));
  const cable = val(e('binary_sensor', 'charge_cable'));
  const charging = val(e('sensor', 'charging'));
  const isCharging = charging === 'charging' || charging === 'starting';
  const sentry = val(e('switch', 'sentry_mode'));
  const level = num(e('sensor', 'battery_level'));
  const range = num(e('sensor', 'battery_range'));
  const power = num(e('sensor', 'charger_power'));
  const added = num(e('sensor', 'charge_energy_added'));
  const limitId = e('number', 'charge_limit');
  const limit = num(limitId);
  const full = val(e('sensor', 'time_to_full_charge'));
  const loc = val(e('device_tracker', 'location'));
  const upd = ent(e('update', 'update')).value;
  const W$ = whereIs(p);
  const tireWarn = ['front_left', 'front_right', 'rear_left', 'rear_right'].some((x) => val(e('binary_sensor', `tire_pressure_warning_${x}`)) === 'on');

  const armKey = (k) => `${p}:${k}`;
  const isArmed = (k) => armed.value === armKey(k);

  // ---- controls: [side, lane y, anchor, tone, label, sub, id, onPress, opts] ----
  const L = [
    { y: 66, a: A.seat, tone: !known ? 'na' : (seat && seat !== 'off') || seatAuto ? 'heat' : 'off', label: 'DRIVER SEAT', sub: nd(heatSub(seat, seatAuto)), id: e('select', 'seat_heater_front_left'),
      press: () => openPicker({ key: `${p}:seat`, y: 66, title: 'DRIVER SEAT', current: seatAuto ? 'auto' : seat, opts: [['OFF', 'off'], ['LOW', 'low'], ['MED', 'medium'], ['HIGH', 'high'], ['AUTO', 'auto']], pick: heatPick(p, 'seat') }) },
    { y: 120, a: A.wheel, tone: !known ? 'na' : (wheel && wheel !== 'off') || wheelAuto ? 'heat' : 'off', label: 'STEERING WHEEL', sub: nd(heatSub(wheel, wheelAuto)), id: e('select', 'steering_wheel_heater'),
      press: () => openPicker({ key: `${p}:wheel`, y: 120, title: 'STEERING WHEEL', current: wheelAuto ? 'auto' : wheel, opts: [['OFF', 'off'], ['LOW', 'low'], ['AUTO', 'auto']], pick: heatPick(p, 'wheel') }) },
    { y: 174, a: A.defrost, tone: !known ? 'na' : defrost === 'on' ? 'on' : 'off', label: 'DEFROST', sub: nd(defrost === 'on' ? 'ON' : 'OFF'), id: e('switch', 'defrost'), press: () => call('switch', 'toggle', {}, e('switch', 'defrost')) },
    { y: 228, a: A.climate, tone: !known ? 'na' : climOn ? 'on' : 'off', label: 'CLIMATE', sub: nd(`${climOn ? `ON • ${clim.attributes.temperature ?? '--'}°` : 'OFF'} • CABIN ${cabin != null ? Math.round(cabin) : '--'}°`), id: e('climate', 'climate'), press: () => call('climate', climOn ? 'turn_off' : 'turn_on', {}, e('climate', 'climate')) },
    { y: 282, a: A.frunk, tone: !known ? 'na' : isArmed('frunk') ? 'flash' : frunk === 'open' ? 'alert' : 'off', label: isArmed('frunk') ? 'CONFIRM OPEN' : 'FRUNK', sub: nd(frunk === 'open' ? 'OPEN • CLOSE BY HAND' : isArmed('frunk') ? 'TAP AGAIN' : 'CLOSED • TAP TWICE TO OPEN'), id: e('cover', 'frunk'), sound: 'none', disabled: frunk === 'open', press: () => twoTap(armKey('frunk'), () => call('cover', 'open_cover', {}, e('cover', 'frunk'))) },
  ];
  const trunkAct = trunk === 'open' ? 'CLOSE' : 'OPEN';
  const R = [
    { y: 90, a: A.locks, tone: !known ? 'na' : openDoors.length ? 'alert' : lock === 'locked' ? 'on' : 'off', label: 'LOCKS', sub: nd(`${lock === 'locked' ? 'LOCKED' : 'UNLOCKED'} • ${openDoors.length ? `${openDoors.map((d) => doorNames[d]).join(', ')} OPEN` : '4 DOORS SHUT'}`), id: e('lock', 'lock'), press: () => call('lock', lock === 'locked' ? 'unlock' : 'lock', {}, e('lock', 'lock')) },
    { y: 144, a: A.windows, tone: !known ? 'na' : openWins.length || winCover === 'open' ? 'alert' : 'off', label: 'WINDOWS', sub: nd(openWins.length ? `${openWins.map((d) => doorNames[d]).join(', ')} OPEN • TAP TO CLOSE` : winCover === 'open' ? 'VENTED • TAP TO CLOSE' : 'ALL CLOSED • TAP TO VENT'), id: e('cover', 'windows'), press: () => call('cover', openWins.length || winCover === 'open' ? 'close_cover' : 'open_cover', {}, e('cover', 'windows')) },
    { y: 198, a: A.trunk, tone: !known ? 'na' : isArmed('trunk') ? 'flash' : trunk === 'open' ? 'alert' : 'off', label: isArmed('trunk') ? `CONFIRM ${trunkAct}` : 'TRUNK', sub: nd(isArmed('trunk') ? 'TAP AGAIN' : `${trunk === 'open' ? 'OPEN' : 'CLOSED'} • TAP TWICE TO ${trunkAct}`), id: e('cover', 'trunk'), sound: 'none', press: () => twoTap(armKey('trunk'), () => call('cover', trunk === 'open' ? 'close_cover' : 'open_cover', {}, e('cover', 'trunk'))) },
    { y: 252, a: A.port, tone: !known ? 'na' : isCharging ? 'charge' : port === 'open' ? 'on' : 'off', label: 'CHARGE PORT', sub: nd(`${port === 'open' ? 'OPEN' : 'CLOSED'} • ${cable === 'on' ? 'PLUGGED IN' : 'UNPLUGGED'}`), id: e('cover', 'charge_port_door'), press: () => call('cover', port === 'open' ? 'close_cover' : 'open_cover', {}, e('cover', 'charge_port_door')) },
    { y: 306, a: null, tone: !known ? 'na' : sentry === 'on' ? 'on' : 'off', label: 'SENTRY', sub: nd(sentry === 'on' ? 'ARMED' : 'OFF'), id: e('switch', 'sentry_mode'), press: () => call('switch', 'toggle', {}, e('switch', 'sentry_mode')) },
  ];

  const lp = (c) => `M180,${c.y} H${c.a[0] - 16} Q${c.a[0]},${c.y} ${c.a[0]},${c.y + 16} V${c.a[1]}`;
  const rp = (c) => `M912,${c.y} H${c.a[0] + 16} Q${c.a[0]},${c.y} ${c.a[0]},${c.y + 16} V${c.a[1]}`;
  const battTone = isCharging ? 'charge' : known ? 'off' : 'na';

  // ---- readouts ----
  const pair = (a, b) => (a == null && b == null ? '--' : `${a != null ? Math.round(a) : '--'} / ${b != null ? Math.round(b) : '--'} PSI`);
  const mins = full ? Math.max(0, Math.round((Date.parse(full) - Date.now()) / 60000)) : null;
  const eta = mins == null ? '--' : mins >= 60 ? `${Math.floor(mins / 60)}H ${mins % 60}M` : `${mins}M`;

  const status = !known ? `${V.model} • NO DATA FROM VEHICLE` : [
    V.model,
    asleep ? 'ASLEEP' : 'ONLINE',
    checkIn(p, asleep) ?? (asleep ? 'LAST KNOWN' : null),
    tireWarn ? 'TIRE PRESSURE WARNING' : null,
    isCharging ? 'CHARGING' : null,
    upd?.state === 'on' ? `UPDATE ${upd.attributes.latest_version ?? ''}` : upd?.state === 'off' ? 'SOFTWARE CURRENT' : null,
  ].filter(Boolean).join(' • ');

  const charge = e('switch', 'charge');
  return (
    <>
      <img class="veh-img" src={IMG[p]} alt={`${V.name} cutaway`} data-asleep={asleep || !known ? '' : undefined}
        style={{ left: `${V.img.x}px`, top: `${V.img.y}px`, width: `${V.img.w}px`, height: `${V.img.h}px` }} />
      <svg class="veh-lines" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <defs>
          <filter id={`vglow-${p}`} x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {isCharging && <rect class="veh-pack" x={V.pack[0]} y={V.pack[1]} width={V.pack[2]} height={V.pack[3]} fill="none" stroke="#66E0F0" stroke-width="3" filter={`url(#vglow-${p})`} />}
        {L.map((c) => <path d={lp(c)} fill="none" stroke={LINE[c.tone]} stroke-width={c.tone === 'off' ? 2 : 2.5} />)}
        {R.filter((c) => c.a).map((c) => <path d={rp(c)} fill="none" stroke={LINE[c.tone]} stroke-width={c.tone === 'off' ? 2 : 2.5} />)}
        <path d={`M${A.battery[0]},${A.battery[1]} V518`} fill="none" stroke={LINE[battTone]} stroke-width="2" />
        {[...L, ...R].filter((c) => c.a).map((c) => (
          <g>
            <circle cx={c.a[0]} cy={c.a[1]} r={c.tone === 'alert' ? 3 : 5} fill={LINE[c.tone]} />
            {c.tone === 'alert' && <circle class="veh-ring" cx={c.a[0]} cy={c.a[1]} r="8" fill="none" stroke={LINE.alert} stroke-width="2.5" />}
          </g>
        ))}
        <circle cx={A.battery[0]} cy={A.battery[1]} r="5" fill={LINE[battTone]} />
      </svg>
      {L.map((c) => <VBtn side="l" {...c} onPress={c.press} />)}
      {R.map((c) => <VBtn side="r" {...c} onPress={c.press} />)}

      <Readout x={0} w={226} label="TEMPERATURE • CABIN / OUTSIDE" value={known ? `${cabin != null ? Math.round(cabin) : '--'}° / ${outside != null ? Math.round(outside) : '--'}°` : '--'} />
      <Readout x={238} w={210} label={`${asleep ? 'LAST KNOWN LOCATION' : W$.moving ? `LOCATION • ${W$.speed != null ? Math.round(W$.speed) : '--'} MPH` : 'LOCATION'} • TAP FOR MAP`}
        value={known ? W$.place : '--'} tone={W$.moving ? 'charge' : undefined}
        onPress={() => { picker.value = null; ctrl.value = false; keypad.value = null; mapOpen.value = true; }} />
      <Readout x={460} w={208} label={isCharging ? `HV BATTERY • CHARGING ${power ?? '--'} KW` : 'HV BATTERY • RANGE'} value={level != null ? `${Math.round(level)}% • ${range != null ? Math.round(range) : '--'} MI` : '--'} tone={isCharging ? 'charge' : undefined} />
      <Readout x={680} w={412} label={isCharging ? `TO LIMIT ${limit ?? '--'}% • ADDED` : 'CHARGE LIMIT • CABLE'}
        value={isCharging ? `${eta} • ${added != null ? Math.round(added) : '--'} KWH` : `${limit != null ? Math.round(limit) : '--'}% • ${cable === 'on' ? 'PLUGGED' : cable === 'off' ? 'UNPLUGGED' : '--'}`} />

      <div class="vcmd">
        <button class="vc" data-tone={ctrl.value ? 'open' : 'ctrl'} data-sfx="nav" onClick={() => { picker.value = null; keypad.value = null; ctrl.value = !ctrl.peek(); }}>{ctrl.value ? 'CLOSE CONTROLS' : 'CONTROLS'}</button>
        <button class="vc" data-tone="details" data-sfx="nav" onClick={() => { picker.value = null; ctrl.value = false; keypad.value = null; details.value = true; }}>SYSTEM DETAILS</button>
      </div>
      {ctrl.value && <Controls p={p} known={known} isCharging={isCharging} cable={cable} limit={limit} limitId={limitId} />}
      {keypad.value && <Keypad limitId={limitId} />}
      <Picker />
      <div class="vhead-status" data-tone={!known ? 'na' : asleep ? 'asleep' : undefined}>{status}</div>
    </>
  );
}

/* ---------- CONTROLS panel (lower half; the car stays visible above) ---------- */
const ctrl = signal(false);
const keypad = signal(null); // { entry: '' } while the custom charge-limit keypad is open
function setLimit(limitId, v) { call('number', 'set_value', { value: v }, limitId); }
function Controls({ p, known, isCharging, cable, limit, limitId }) {
  const e = (d, s) => `${d}.${p}_${s}`;
  const charge = e('switch', 'charge');
  const press = (b) => call('button', 'press', {}, e('button', b));
  const lim = limit != null ? Math.round(limit) : null;
  const custom = lim != null && lim !== 80 && lim !== 100;
  const Btn = ({ label, onPress, tone, id, disabled, sel, sound }) => (
    <button class="vk" data-tone={tone} data-sel={sel ? '' : undefined} data-busy={id && busy(id) ? '' : undefined} data-sfx={sound} disabled={disabled} onClick={onPress}>{label}</button>
  );
  return (
    <div class="vctl" role="dialog" aria-label="Vehicle controls">
      <div class="vctl-row">
        <span class="vctl-l">CHARGE<small>{lim != null ? `LIMIT ${lim}%` : 'LIMIT --'}</small></span>
        <Btn label={isCharging ? 'STOP CHARGE' : 'START CHARGE'} tone={isCharging ? 'charge' : 'go'} id={charge} disabled={!known || (!isCharging && cable !== 'on')}
          onPress={() => call('switch', isCharging ? 'turn_off' : 'turn_on', {}, charge)} />
        <Btn label="LIMIT 80%" sel={lim === 80} id={limitId} disabled={limit == null} onPress={() => setLimit(limitId, 80)} />
        <Btn label="LIMIT 100%" sel={lim === 100} id={limitId} disabled={limit == null} onPress={() => setLimit(limitId, 100)} />
        <Btn label={custom ? `CUSTOM • ${lim}%` : 'CUSTOM'} sel={custom} disabled={limit == null} sound="nav" onPress={() => (keypad.value = { entry: '' })} />
      </div>
      <div class="vctl-row">
        <span class="vctl-l">VEHICLE<small>{cable === 'on' ? 'PLUGGED IN' : 'UNPLUGGED'}</small></span>
        <Btn label="HONK" id={e('button', 'honk_horn')} onPress={() => press('honk_horn')} />
        <Btn label="FLASH LIGHTS" id={e('button', 'flash_lights')} onPress={() => press('flash_lights')} />
        <Btn label="HOMELINK" tone="link" id={e('button', 'homelink')} onPress={() => press('homelink')} />
        <Btn label="WAKE" tone="wake" id={e('button', 'wake')} onPress={() => press('wake')} />
      </div>
    </div>
  );
}
/** Custom charge limit: type a value, SET sends one command. */
function Keypad({ limitId }) {
  const k = keypad.value;
  const a = ent(limitId).value?.attributes ?? {};
  const min = a.min ?? 50, max = a.max ?? 100;
  const n = k.entry === '' ? null : +k.entry;
  const ok = n != null && n >= min && n <= max;
  const key = (d) => { if (k.entry.length < 3) keypad.value = { entry: (k.entry + d).replace(/^0+(?=\d)/, '') }; };
  return (
    <div class="vkp" role="dialog" aria-label="Custom charge limit">
      <div class="vkp-h">CUSTOM LIMIT<small>{min}–{max}%</small></div>
      <div class="vkp-d" data-bad={n != null && !ok ? '' : undefined}>{k.entry === '' ? '--' : k.entry}<span>%</span></div>
      <div class="vkp-g">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button class="vkp-k" onClick={() => key(d)}>{d}</button>)}
        <button class="vkp-k" data-tone="clr" onClick={() => (keypad.value = { entry: '' })}>CLR</button>
        <button class="vkp-k" onClick={() => key('0')}>0</button>
        <button class="vkp-k" data-tone="back" onClick={() => (keypad.value = { entry: k.entry.slice(0, -1) })}>DEL</button>
      </div>
      <div class="vkp-a">
        <button class="vkp-x" data-sfx="nav" onClick={() => (keypad.value = null)}>CANCEL</button>
        <button class="vkp-s" disabled={!ok} onClick={() => { keypad.value = null; setLimit(limitId, n); }}>{ok ? `SET ${n}%` : 'SET'}</button>
      </div>
    </div>
  );
}

/* ---------- SYSTEM DETAILS ---------- */
const details = signal(false);
const BIN = {
  door: ['OPEN', 'CLOSED'], window: ['OPEN', 'CLOSED'], opening: ['OPEN', 'CLOSED'], problem: ['WARNING', 'OK'], heat: ['ON', 'OFF'],
  running: ['RUNNING', 'OFF'], connectivity: ['ONLINE', 'ASLEEP'], presence: ['PRESENT', 'NOT PRESENT'],
};
const ALERT_ON = new Set(['door', 'window', 'opening', 'problem']);
function fmtNum(v) {
  const n = +v; if (Number.isNaN(n)) return UP(v);
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : `${Math.round(n * 10) / 10}`;
}
/** One entity as [value text, tone] for the details list; null when HA does not report it. */
function fmt(id) {
  const s = ent(id).value;
  if (!s) return null;
  const [d] = id.split('.');
  const a = s.attributes ?? {};
  if (s.state === 'unavailable') return ['UNAVAILABLE', 'na'];
  if (d === 'update') return [s.state === 'on' ? `${a.installed_version ?? '--'} → ${a.latest_version ?? '--'}` : `${a.installed_version ?? '--'} CURRENT`, s.state === 'on' ? 'warn' : undefined];
  if (s.state === 'unknown') return ['--', 'dim'];
  if (d === 'binary_sensor') {
    const w = BIN[a.device_class] ?? ['ON', 'OFF'];
    return [s.state === 'on' ? w[0] : w[1], s.state === 'on' && ALERT_ON.has(a.device_class) ? 'alert' : s.state === 'on' ? 'on' : undefined];
  }
  if (d === 'lock') return [UP(s.state), s.state === 'locked' ? 'on' : undefined];
  if (d === 'cover') return [UP(s.state), s.state === 'open' && !/charge_port|windows/.test(id) ? 'alert' : s.state === 'open' ? 'on' : undefined];
  if (d === 'climate') return [s.state === 'off' ? 'OFF' : `${UP(s.state)}${a.temperature != null ? ` • ${fmtNum(a.temperature)}°` : ''}`, s.state === 'off' ? undefined : 'on'];
  if (d === 'switch') return [UP(s.state), s.state === 'on' ? 'on' : undefined];
  if (d === 'device_tracker') return [s.state === 'not_home' ? 'AWAY' : UP(s.state), undefined];
  if (d === 'media_player') return [`${UP(s.state)}${a.source ? ` • ${UP(a.source)}` : ''}`, undefined];
  if (a.device_class === 'timestamp' || /^\d{4}-\d\d-\d\dT/.test(s.state)) {
    const t = Date.parse(s.state); if (Number.isNaN(t)) return [UP(s.state), undefined];
    const m = Math.round((t - Date.now()) / 60000);
    return [`${new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}${m > 0 ? ` • IN ${span(m)}` : m < 0 ? ` • ${span(-m)} AGO` : ''}`, undefined];
  }
  const unit = a.unit_of_measurement ? ` ${a.unit_of_measurement === '°F' || a.unit_of_measurement === '°C' ? a.unit_of_measurement : a.unit_of_measurement.toUpperCase()}` : '';
  return [`${fmtNum(s.state)}${unit}`, undefined];
}
function DRow({ k, v, tone }) {
  return <div class="vd-row" data-tone={tone}><span>{k}</span><b>{v}</b></div>;
}
function DSec({ title, children }) {
  return <section class="vd-sec"><h3><i />{title}</h3>{children}</section>;
}
function Details({ p, compact }) {
  const V = VEHICLES[p];
  const dev = useRef({});
  const [, force] = useState(0);
  useEffect(() => { let live = true; getDevice(V.name.charAt(0) + V.name.slice(1).toLowerCase()).then((d) => { if (live) { dev.current = d ?? {}; force((n) => n + 1); } }); return () => { live = false; }; }, [p]);
  const d = dev.current;
  const secs = [
    { title: 'IDENTITY', rows: [['NAME', V.name], ['VIN', d.serial_number ?? '--'], ['MANUFACTURER', UP(d.manufacturer ?? 'TESLA')], ['MODEL', UP(d.model ?? V.model)], ...(V.identity ?? [])] },
    ...VEH_DETAIL.map(([title, list]) => ({ title, rows: list.map(([k, id]) => [k, fmt(id.replace('{p}', p))]).filter(([, f]) => f).map(([k, f]) => [k, f[0], f[1]]) })).filter((x) => x.rows.length),
    { title: 'SPECIFICATIONS', rows: V.specs ?? [], note: 'PUBLISHED FIGURES FOR THIS MODEL AND TRIM WHEN NEW' },
  ];
  // balance sections over 4 columns (shortest column first); the panel scrolls if they still do not fit
  const n = compact ? 2 : 4;
  const cols = Array.from({ length: n }, () => []); const h = Array(n).fill(0);
  for (const sec of [...secs].sort((a, b) => b.rows.length - a.rows.length)) { const i = h.indexOf(Math.min(...h)); cols[i].push(sec); h[i] += sec.rows.length + 2; }
  return (
    <div class={compact ? 'vd vd-c' : 'vd'} role="dialog" aria-label={`${V.name} system details`}>
      <div class="vd-head">
        <span class="vhead-cap" />
        <span class="vhead-t">{V.name} • SYSTEM DETAILS</span>
        <span class="vd-code">{V.model} • {d.serial_number ?? 'VIN --'}</span>
        <button class="vd-close" data-sfx="nav" onClick={() => (details.value = false)}>CLOSE</button>
      </div>
      <div class="vd-body">
        {cols.map((col) => (
          <div class="vd-col">
            {col.map((sec) => (
              <DSec title={sec.title}>
                {sec.rows.map(([k, v, tone]) => <DRow k={k} v={v} tone={tone} />)}
                {sec.note && <div class="vd-note">{sec.note}</div>}
              </DSec>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function VehiclesPage({ vehicles, onClose }) {
  const [ref, fit] = useFit();
  const list = vehicles ?? [];
  const p = list.includes(sel.value) ? sel.value : list[0];
  if (!p) return <div class="page"><div class="fault-line">NO VEHICLES CONFIGURED</div></div>;
  const V = VEHICLES[p];
  return (
    <div class={onClose ? 'page page-veh veh-in-ov' : 'page page-veh'}>
      <div class="veh-fit" ref={ref} style={fit.auto ? { height: `${Math.round(H * fit.k)}px` } : undefined}>
        <div class="veh-stage" style={{ transform: `scale(${fit.k})` }}>
          <div class="vhead">
            <span class="vhead-cap" />
            <span class="vhead-t">{V.name} • MASTER SYSTEMS DISPLAY</span>
            {list.map((v, i) => (
              <button class="vtab" data-sfx="nav" data-sel={v === p ? '' : undefined} data-last={i === list.length - 1 ? '' : undefined}
                onClick={() => { sel.value = v; LS.set(SEL_KEY, v); armed.value = null; picker.value = null; keypad.value = null; }}>{VEHICLES[v].name}</button>
            ))}
            {onClose && <button class="vtab-x" data-sfx="nav" onClick={onClose}>CLOSE</button>}
          </div>
          <Msd p={p} list={list} />
          {details.value && <Details p={p} />}
          {mapOpen.value && <LocationMap p={p} />}
        </div>
      </div>
    </div>
  );
}

/* ---------- compact summary for other tablets (entry: departure, bedroom: night check) ---------- */
export const vehOpen = signal(false);
function resetPanels() { armed.value = null; picker.value = null; keypad.value = null; ctrl.value = false; details.value = false; mapOpen.value = false; }
function openFull(p) { sel.value = p; LS.set(SEL_KEY, p); resetPanels(); vehOpen.value = true; }

function SumBtn({ label, sub, tone, id, onPress, disabled, sound }) {
  return (
    <button class="vs-btn" data-tone={tone} data-busy={id && busy(id) ? '' : undefined} data-sfx={sound} disabled={disabled} onClick={onPress}>
      <small>{sub}</small><b>{label}</b>
    </button>
  );
}

function SumRow({ p, mode, compact }) {
  const V = VEHICLES[p];
  const e = (d, s) => `${d}.${p}_${s}`;
  const online = val(e('binary_sensor', 'status'));
  const known = online != null;
  const level = num(e('sensor', 'battery_level'));
  const range = num(e('sensor', 'battery_range'));
  const lock = val(e('lock', 'lock'));
  const charging = val(e('sensor', 'charging'));
  const isCharging = charging === 'charging' || charging === 'starting';
  const cable = val(e('binary_sensor', 'charge_cable'));
  const power = num(e('sensor', 'charger_power'));
  const limit = num(e('number', 'charge_limit'));
  const sentry = val(e('switch', 'sentry_mode'));
  const clim = ent(e('climate', 'climate')).value;
  const climOn = clim && !NA.has(clim.state) && clim.state !== 'off';
  const cabin = num(e('sensor', 'inside_temperature'));
  const names = { front_driver: 'FRONT L', front_passenger: 'FRONT R', rear_driver: 'REAR L', rear_passenger: 'REAR R' };
  const open = [
    ...Object.keys(names).filter((d) => val(e('binary_sensor', `${d}_door`)) === 'on').map((d) => `${names[d]} DOOR`),
    ...Object.keys(names).filter((d) => val(e('binary_sensor', `${d}_window`)) === 'on').map((d) => `${names[d]} WINDOW`),
    ...(val(e('cover', 'frunk')) === 'open' ? ['FRUNK'] : []),
    ...(val(e('cover', 'trunk')) === 'open' ? ['TRUNK'] : []),
  ];
  const lim = limit != null ? `${Math.round(limit)}%` : '--';
  const power$ = isCharging ? `CHARGING ${power ?? '--'} KW TO ${lim}` : cable === 'on' ? `PLUGGED IN • LIMIT ${lim}` : `UNPLUGGED • LIMIT ${lim}`;
  const line = !known ? 'NO DATA FROM VEHICLE' : [
    lock === 'locked' ? 'LOCKED' : 'UNLOCKED',
    power$,
    mode === 'night' ? (sentry === 'on' ? 'SENTRY ON' : 'SENTRY OFF') : null,
  ].filter(Boolean).join(' • ');
  const lowBatt = level != null && level < 20;
  // compact check-in age under the model: awake = last poll, asleep = time asleep
  const ciMin = checkInMin(p);
  const ciSpan = ciMin == null ? '--' : ciMin < 1 ? 'NOW' : span(ciMin).replace(' MIN', 'M');
  const age = online === 'off' ? `ASLEEP ${ciSpan}` : ciMin == null ? 'ONLINE' : `SEEN ${ciSpan}${ciMin >= 1 ? ' AGO' : ''}`;
  const ageLate = online === 'on' && ciMin != null && ciMin >= 25;
  const lockId = e('lock', 'lock');
  const lockBtn = <SumBtn label={lock === 'locked' ? 'UNLOCK' : 'LOCK'} sub={!known ? 'NO DATA' : lock === 'locked' ? 'LOCKED' : 'UNLOCKED'} tone={!known ? 'na' : lock === 'locked' ? 'on' : 'off'} id={lockId}
    disabled={!known} onPress={() => call('lock', lock === 'locked' ? 'unlock' : 'lock', {}, lockId)} />;
  const climId = e('climate', 'climate');
  const sentryId = e('switch', 'sentry_mode');
  return (
    <div class="vs-row" data-alert={open.length ? '' : undefined} data-tone={!known ? 'na' : isCharging ? 'charge' : undefined}>
      <button class="vs-info" data-sfx="nav" onClick={() => openFull(p)} aria-label={`${V.name} full display`}>
        <span class="vs-n">{V.name}<small>{V.model}</small>{known && <small data-late={ageLate ? '' : undefined}>{age}</small>}</span>
        <span class="vs-r">
          <b data-low={lowBatt ? '' : undefined}>{level != null ? `${Math.round(level)}%` : '--'}<i>{range != null ? ` • ${Math.round(range)} MI` : ''}</i></b>
          <small>{open.length ? `${open.join(', ')} OPEN` : line}</small>
        </span>
      </button>
      {mode === 'night'
        ? <>{lockBtn}<SumBtn label="SENTRY" sub={!known ? 'NO DATA' : sentry === 'on' ? 'ARMED' : 'OFF'} tone={!known ? 'na' : sentry === 'on' ? 'on' : 'off'} id={sentryId} disabled={!known} onPress={() => call('switch', 'toggle', {}, sentryId)} /></>
        : <><SumBtn label="CLIMATE" sub={!known ? 'NO DATA' : `${climOn ? 'ON' : 'OFF'} • CABIN ${cabin != null ? Math.round(cabin) : '--'}°`} tone={!known ? 'na' : climOn ? 'on' : 'off'} id={climId} disabled={!known}
            onPress={() => call('climate', climOn ? 'turn_off' : 'turn_on', {}, climId)} />{lockBtn}</>}
      <SumBtn label={compact ? 'VEHICLE' : 'FULL DISPLAY'} sub={compact ? 'STATUS • CONTROLS' : 'ALL SYSTEMS'} tone="open" sound="nav" onPress={() => openFull(p)} />
    </div>
  );
}

export function VehicleSummary({ vehicles, mode, compact }) {
  return <div class="vs-list">{(vehicles ?? []).map((p) => <SumRow p={p} mode={mode} compact={compact} />)}</div>;
}

/* ---------- COMPACT vehicle view (entry tablet): essentials and alerts, laid out for a small portrait screen ---------- */
const fullFromCompact = signal(false); // compact view's FULL DISPLAY button opens the master systems display
/** Map or System Details over the compact view, laid out for the small screen (not the scaled stage). */
function CompactModal({ p }) {
  return (
    <div class="cv-modal">
      {details.value && <Details p={p} compact />}
      {mapOpen.value && <LocationMap p={p} compact />}
    </div>
  );
}
function CvBtn({ label, sub, tone, id, onPress, disabled, sound, wide }) {
  return (
    <button class="cv-btn" data-tone={tone} data-wide={wide ? '' : undefined} data-busy={id && busy(id) ? '' : undefined} data-sfx={sound} disabled={disabled} onClick={onPress}>
      <small>{sub}</small><b>{label}</b>
    </button>
  );
}
function CompactVehicle({ p, list, onClose }) {
  const V = VEHICLES[p];
  const e = (d, s) => `${d}.${p}_${s}`;
  const online = val(e('binary_sensor', 'status'));
  const known = online != null;
  const asleep = online === 'off';
  const nd = (x) => (known ? x : 'NO DATA');
  const seat = val(e('select', 'seat_heater_front_left'));
  const seatAuto = val(e('switch', 'auto_seat_climate_left')) === 'on';
  const defrost = val(e('switch', 'defrost'));
  const clim = ent(e('climate', 'climate')).value;
  const climOn = clim && !NA.has(clim.state) && clim.state !== 'off';
  const cabin = num(e('sensor', 'inside_temperature'));
  const outside = num(e('sensor', 'outside_temperature'));
  const frunk = val(e('cover', 'frunk'));
  const trunk = val(e('cover', 'trunk'));
  const lock = val(e('lock', 'lock'));
  const names = { front_driver: 'FRONT L', front_passenger: 'FRONT R', rear_driver: 'REAR L', rear_passenger: 'REAR R' };
  const openDoors = Object.keys(names).filter((d) => val(e('binary_sensor', `${d}_door`)) === 'on');
  const openWins = Object.keys(names).filter((d) => val(e('binary_sensor', `${d}_window`)) === 'on');
  const winCover = val(e('cover', 'windows'));
  const cable = val(e('binary_sensor', 'charge_cable'));
  const charging = val(e('sensor', 'charging'));
  const isCharging = charging === 'charging' || charging === 'starting';
  const sentry = val(e('switch', 'sentry_mode'));
  const level = num(e('sensor', 'battery_level'));
  const range = num(e('sensor', 'battery_range'));
  const power = num(e('sensor', 'charger_power'));
  const limit = num(e('number', 'charge_limit'));
  const full = val(e('sensor', 'time_to_full_charge'));
  const tireWarn = ['front_left', 'front_right', 'rear_left', 'rear_right'].some((x) => val(e('binary_sensor', `tire_pressure_warning_${x}`)) === 'on');
  const W$ = whereIs(p);
  const ciMin = checkInMin(p);
  const armKey = (k) => `${p}:${k}`;
  const isArmed = (k) => armed.value === armKey(k);

  // ---- alerts: anything that needs attention before leaving ----
  const alerts = !known ? [['alert', 'NO DATA FROM VEHICLE']] : [
    ...openDoors.map((d) => ['alert', `${names[d]} DOOR OPEN`]),
    ...openWins.map((d) => ['alert', `${names[d]} WINDOW OPEN`]),
    ...(!openWins.length && winCover === 'open' ? [['alert', 'WINDOWS VENTED']] : []),
    ...(frunk === 'open' ? [['alert', 'FRUNK OPEN']] : []),
    ...(trunk === 'open' ? [['alert', 'TRUNK OPEN']] : []),
    ...(tireWarn ? [['alert', 'TIRE PRESSURE WARNING']] : []),
    ...(lock && lock !== 'locked' ? [['warn', 'UNLOCKED']] : []),
    ...(level != null && level < 20 ? [['warn', `LOW BATTERY • ${Math.round(level)}%`]] : []),
    ...(online === 'on' && ciMin != null && ciMin >= 25 ? [['warn', `NO CHECK-IN FOR ${span(ciMin)}`]] : []),
  ];
  const ago = ciMin == null ? '' : ciMin < 1 ? 'CHECK-IN NOW' : `${asleep ? 'DATA FROM' : 'CHECK-IN'} ${span(ciMin)} AGO`;
  const status = !known ? 'NO DATA' : [asleep ? 'ASLEEP' : 'ONLINE', ago, isCharging ? `CHARGING ${power ?? '--'} KW` : null].filter(Boolean).join(' • ');
  const mins = full ? Math.max(0, Math.round((Date.parse(full) - tick.value) / 60000)) : null;

  const P = picker.value?.key === `${p}:seat` ? picker.value : null;
  const trunkAct = trunk === 'open' ? 'CLOSE' : 'OPEN';
  return (
    <div class="cv">
      <div class="cv-head">
        <span class="vhead-cap" />
        <span class="cv-t">{V.name}</span>
        {list.map((v, i) => (
          <button class="vtab" data-sfx="nav" data-sel={v === p ? '' : undefined} data-last={i === list.length - 1 && !onClose ? '' : undefined}
            onClick={() => { sel.value = v; LS.set(SEL_KEY, v); armed.value = null; picker.value = null; }}>{VEHICLES[v].name}</button>
        ))}
        {onClose && <button class="vtab-x" data-sfx="nav" onClick={onClose}>CLOSE</button>}
      </div>
      <div class="cv-status" data-tone={!known ? 'na' : asleep ? 'asleep' : undefined}>{V.model} • {status}</div>

      <div class="cv-alerts" data-ok={alerts.length ? undefined : ''}>
        {alerts.length ? alerts.map(([t, msg]) => <span data-t={t}>{msg}</span>) : <span data-t="ok">ALL SECURE • NO ALERTS</span>}
      </div>

      <div class="cv-hero">
        <img class="cv-img" src={IMG[p]} alt={`${V.name} cutaway`} data-asleep={asleep || !known ? '' : undefined} data-charge={isCharging ? '' : undefined} />
        <div class="cv-batt" data-tone={isCharging ? 'charge' : level != null && level < 20 ? 'low' : undefined}>
          <b>{level != null ? `${Math.round(level)}%` : '--'}</b>
          <span>{range != null ? `${Math.round(range)} MI` : '--'}</span>
        </div>
      </div>

      <div class="cv-read">
        <div class="cv-r"><span>{isCharging ? `TO ${limit ?? '--'}%` : 'CHARGE'}</span><b>{isCharging ? (mins == null ? '--' : mins >= 60 ? `${Math.floor(mins / 60)}H ${mins % 60}M` : `${mins}M`) : `${limit != null ? Math.round(limit) : '--'}% • ${cable === 'on' ? 'PLUGGED' : cable === 'off' ? 'UNPLUGGED' : '--'}`}</b></div>
        <div class="cv-r"><span>CABIN / OUTSIDE</span><b>{known ? `${cabin != null ? Math.round(cabin) : '--'}° / ${outside != null ? Math.round(outside) : '--'}°` : '--'}</b></div>
        <button class="cv-r cv-loc" data-sfx="nav" data-tone={W$.moving ? 'charge' : undefined} onClick={() => { picker.value = null; mapOpen.value = true; }}>
          <span>{asleep ? 'LAST KNOWN LOCATION' : W$.moving ? `LOCATION • ${W$.speed != null ? Math.round(W$.speed) : '--'} MPH` : 'LOCATION'} • TAP FOR MAP</span><b>{known ? W$.place : '--'}</b>
        </button>
      </div>

      <div class="cv-grid">
        <CvBtn label={lock === 'locked' ? 'UNLOCK' : 'LOCK'} sub={nd(lock === 'locked' ? 'LOCKED' : 'UNLOCKED')} tone={!known ? 'na' : lock === 'locked' ? 'on' : 'off'} id={e('lock', 'lock')} disabled={!known}
          onPress={() => call('lock', lock === 'locked' ? 'unlock' : 'lock', {}, e('lock', 'lock'))} />
        <CvBtn label="CLIMATE" sub={nd(`${climOn ? 'ON' : 'OFF'} • CABIN ${cabin != null ? Math.round(cabin) : '--'}°`)} tone={!known ? 'na' : climOn ? 'on' : 'off'} id={e('climate', 'climate')} disabled={!known}
          onPress={() => call('climate', climOn ? 'turn_off' : 'turn_on', {}, e('climate', 'climate'))} />
        <CvBtn label="DEFROST" sub={nd(defrost === 'on' ? 'ON' : 'OFF')} tone={!known ? 'na' : defrost === 'on' ? 'on' : 'off'} id={e('switch', 'defrost')} disabled={!known}
          onPress={() => call('switch', 'toggle', {}, e('switch', 'defrost'))} />
        <CvBtn label="SEAT HEAT" sub={nd(`${seatAuto ? 'AUTO • ' : ''}${seat && seat !== 'off' ? UP(seat) : 'OFF'}`)} tone={!known ? 'na' : P ? 'open' : (seat && seat !== 'off') || seatAuto ? 'on' : 'off'} id={e('select', 'seat_heater_front_left')} disabled={!known}
          onPress={() => openPicker({ key: `${p}:seat`, y: 0, title: 'DRIVER SEAT', current: seatAuto ? 'auto' : seat, opts: [['OFF', 'off'], ['LOW', 'low'], ['MED', 'medium'], ['HIGH', 'high'], ['AUTO', 'auto']], pick: heatPick(p, 'seat') })} />
        <CvBtn label={isArmed('frunk') ? 'CONFIRM' : 'FRUNK'} sub={nd(frunk === 'open' ? 'OPEN • BY HAND' : isArmed('frunk') ? 'TAP AGAIN' : 'TAP TWICE')} sound="none" disabled={!known || frunk === 'open'}
          tone={!known ? 'na' : isArmed('frunk') ? 'flash' : frunk === 'open' ? 'alert' : 'off'} id={e('cover', 'frunk')} onPress={() => twoTap(armKey('frunk'), () => call('cover', 'open_cover', {}, e('cover', 'frunk')))} />
        <CvBtn label={isArmed('trunk') ? 'CONFIRM' : 'TRUNK'} sub={nd(isArmed('trunk') ? 'TAP AGAIN' : `${trunk === 'open' ? 'OPEN' : 'CLOSED'} • TWICE TO ${trunkAct}`)} sound="none" disabled={!known}
          tone={!known ? 'na' : isArmed('trunk') ? 'flash' : trunk === 'open' ? 'alert' : 'off'} id={e('cover', 'trunk')} onPress={() => twoTap(armKey('trunk'), () => call('cover', trunk === 'open' ? 'close_cover' : 'open_cover', {}, e('cover', 'trunk')))} />
        {P && (
          <div class="cv-pick" role="group" aria-label="Driver seat level">
            {P.opts.map(([l, v2]) => <button class="vpick-o" data-sel={P.current === v2 ? '' : undefined} onClick={() => P.pick(v2)}>{l}</button>)}
          </div>
        )}
        <CvBtn label="WINDOWS" sub={nd(openWins.length || winCover === 'open' ? 'OPEN • TAP TO CLOSE' : 'CLOSED • TAP TO VENT')} tone={!known ? 'na' : openWins.length || winCover === 'open' ? 'alert' : 'off'} id={e('cover', 'windows')} disabled={!known}
          onPress={() => call('cover', openWins.length || winCover === 'open' ? 'close_cover' : 'open_cover', {}, e('cover', 'windows'))} />
        <CvBtn label="SENTRY" sub={nd(sentry === 'on' ? 'ARMED' : 'OFF')} tone={!known ? 'na' : sentry === 'on' ? 'on' : 'off'} id={e('switch', 'sentry_mode')} disabled={!known}
          onPress={() => call('switch', 'toggle', {}, e('switch', 'sentry_mode'))} />
        <CvBtn label="WAKE" sub={asleep ? 'ASLEEP' : 'AWAKE'} tone={asleep ? 'off' : 'on'} id={e('button', 'wake')} onPress={() => call('button', 'press', {}, e('button', 'wake'))} />
      </div>

      <div class="cv-foot">
        <button class="vc" data-tone="details" data-sfx="nav" onClick={() => { picker.value = null; details.value = true; }}>SYSTEM DETAILS</button>
        <button class="vc" data-tone="ctrl" data-sfx="nav" onClick={() => { resetPanels(); fullFromCompact.value = true; }}>FULL DISPLAY</button>
      </div>
      {(details.value || mapOpen.value) && <CompactModal p={p} />}
    </div>
  );
}

/** VEHICLES nav page using the compact view (office tablet); its FULL DISPLAY swaps in the master systems display. */
export function CompactVehiclesPage({ vehicles }) {
  const list = vehicles ?? [];
  const p = list.includes(sel.value) ? sel.value : list[0];
  if (!p) return null;
  if (fullFromCompact.value) return <VehiclesPage vehicles={list} onClose={() => { resetPanels(); fullFromCompact.value = false; }} />;
  return <div class="page cv-page"><CompactVehicle p={p} list={list} onClose={null} /></div>;
}

/** Full master systems display over the current page (tablets without a VEHICLES page). */
export function VehicleOverlay({ vehicles, compact }) {
  if (!vehOpen.value) return null;
  const close = () => { resetPanels(); fullFromCompact.value = false; vehOpen.value = false; };
  if (compact && !fullFromCompact.value) {
    const list = vehicles ?? [];
    const p = list.includes(sel.value) ? sel.value : list[0];
    return <div class="veh-ov veh-ov-c">{p ? <CompactVehicle p={p} list={list} onClose={close} /> : null}</div>;
  }
  // FULL DISPLAY from the compact view: CLOSE returns to the compact view
  return <div class="veh-ov"><VehiclesPage vehicles={vehicles} onClose={compact ? () => { resetPanels(); fullFromCompact.value = false; } : close} /></div>;
}
