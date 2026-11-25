import { createContext } from 'preact';
import { useEffect, useRef, useContext } from 'preact/hooks';
import { useSignal, signal } from '@preact/signals';
import { ent, link, fault, pending, ready, call, openEntity, canMenu, toggleMenu, getHistory, hassUrl, startOAuth, saveLongLived, forgetLink, getEvents, getForecast, mediaApi, serviceResponse, LS } from './ha.js';
import { ROOMS, SHARED, ALL_IDS, MUSIC } from './rooms.js';
import { sfx, soundOn, toggleSound, SOUND_SLOTS, custom, soundSync, setCustomSound, clearCustomSound, previewSound, startSoundSync, refreshSounds, MAX_SECONDS } from './sfx.js';
import { WxIcon, ScaleBar, tempColor, humColor } from './wx.jsx';
import { VehiclesPage, VehicleSummary, VehicleOverlay, CompactVehiclesPage } from './vehicles.jsx';

export const dom = { root: document };

/* ---------- helpers ---------- */
const UNAVAIL = new Set(['unavailable', 'unknown']);
function code(id, len = 4) {
  let h = 2166136261; for (const c of id) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const n = String(Math.abs(h)).padStart(8, '0');
  return len === 4 ? `${n.slice(0, 2)}-${n.slice(2, 4)}` : `${n.slice(0, 2)}-${n.slice(2, len)}`;
}
const pad = (n) => String(n).padStart(2, '0');
function stamp(v) {
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  if (isNaN(d)) return '--';
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const has = (st, bit) => ((st?.attributes?.supported_features ?? 0) & bit) !== 0;
const isPending = (id) => !!pending.value[id];

/** Entity accessor with not-found/awaiting semantics. */
function useEnt(id) {
  const st = ent(id).value;
  if (st === undefined || st === null) return { st: null, missing: ready.value, offline: true };
  return { st, missing: false, offline: st.state === 'unavailable' || (st.state === 'unknown' && !/^(scene|input_button|button)\./.test(id)) };
}

/* momentary flash for stateless presses */
function useFlash() {
  const f = useSignal(false);
  return [f, () => { f.value = true; setTimeout(() => (f.value = false), 650); }];
}

/* ---------- primitives ---------- */
function Block({ label, sub, tag, tone = 'off', onPress, disabled, busy, size = 'md', flash, sound }) {
  return (
    <button
      class={`blk blk-${size}`}
      data-tone={flash ? 'flash' : tone}
      data-busy={busy ? '' : undefined}
      data-sfx={sound}
      disabled={disabled}
      onClick={onPress}
      aria-pressed={tone === 'on' ? 'true' : tone === 'off' ? 'false' : undefined}
    >
      {tag && <span class="blk-tag">{tag}</span>}
      <span class="blk-text">
        {sub && <span class="blk-sub">{sub}</span>}
        <span class="blk-label">{label}</span>
      </span>
    </button>
  );
}

function Pill({ label, onPress, selected, disabled, tone, busy, swatch, sound }) {
  return (
    <button class="pill" data-sfx={sound} data-sel={selected ? '' : undefined} data-tone={tone} data-busy={busy ? '' : undefined} disabled={disabled} onClick={onPress} style={swatch ? { '--sw': swatch } : undefined}>
      {swatch && <span class="pill-sw" />}
      <span>{label}</span>
    </button>
  );
}

function SecHead({ title, id, tone = 'tan' }) {
  return (
    <div class="sh" id={id}>
      <span class="sh-cap" style={{ background: `var(--bl-${tone})` }} />
      <span class="sh-bar" />
      <span class="sh-code">{code(title, 6)}</span>
      <h2 class="sh-t">{title}</h2>
      <span class="sh-end" style={{ background: `var(--bl-${tone})` }} />
    </div>
  );
}

const SEGMENTS = 24;
function Slider({ label, value, min = 0, max = 100, step = 1, fmt = (v) => v, onCommit, disabled, tone = 'tan' }) {
  const drag = useSignal(null);
  const hold = useSignal(null);
  const ref = useRef();
  useEffect(() => { hold.value = null; }, [value]);
  const empty = drag.value == null && hold.value == null && value == null;
  const v = drag.value ?? hold.value ?? value ?? min;
  const pct = Math.max(0, Math.min(1, (v - min) / (max - min)));
  const lit = empty ? 0 : Math.round(pct * SEGMENTS);
  const fromX = (x) => {
    const r = ref.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (x - r.left) / r.width));
    return Math.round((min + t * (max - min)) / step) * step;
  };
  const commit = (nv) => {
    hold.value = nv; drag.value = null; sfx('slide'); onCommit(nv);
    setTimeout(() => { if (hold.peek() === nv) hold.value = null; }, 4000);
  };
  const key = (e) => {
    const d = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: step * 10, PageDown: -step * 10 }[e.key];
    if (d == null) return; e.preventDefault();
    commit(Math.max(min, Math.min(max, (hold.peek() ?? value ?? min) + d)));
  };
  return (
    <div class="sl" data-off={disabled ? '' : undefined}>
      <span class="sl-l">{label}</span>
      <div
        ref={ref}
        class="sl-track"
        role="slider" tabIndex={disabled ? -1 : 0}
        aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={v} aria-valuetext={fmt(v)} aria-disabled={disabled}
        onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); drag.value = fromX(e.clientX); }}
        onPointerMove={(e) => { if (drag.peek() != null) drag.value = fromX(e.clientX); }}
        onPointerUp={() => { if (drag.peek() != null) commit(drag.peek()); }}
        onPointerCancel={() => { drag.value = null; }}
        onKeyDown={key}
        style={{ '--tone': `var(--bl-${tone})` }}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => <span class="sl-seg" data-lit={i < lit ? '' : undefined} />)}
      </div>
      <span class="sl-v">{empty ? '--' : fmt(v)}</span>
    </div>
  );
}

function Missing({ id, label }) {
  return (
    <div class="missing">
      <span class="missing-bar" />
      <div>
        <div class="missing-l">{label} · NO SIGNAL</div>
        <div class="missing-id">{id} NOT FOUND</div>
      </div>
    </div>
  );
}

/* ---------- room context ---------- */
const RoomCtx = createContext(ROOMS.bedroom);
const useRoom = () => useContext(RoomCtx);
const pages = {};
function pageSig(R) {
  if (!pages[R.key]) {
    const k = `cabinlcars.${R.key}.page`;
    let v = 'MAIN'; try { const s = localStorage.getItem(k); if (R.pages.includes(s)) v = s; } catch {}
    pages[R.key] = signal(v);
  }
  return pages[R.key];
}
function go(R, n) { pageSig(R).value = n; try { localStorage.setItem(`cabinlcars.${R.key}.page`, n); } catch {} }

/* ---------- chrono + calendar ---------- */
const clock = signal(new Date());
setInterval(() => (clock.value = new Date()), 1000);
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const agenda = signal({ at: 0, items: [], error: null });
let agendaBusy = false;
async function loadAgenda(C) {
  if (agendaBusy) return; agendaBusy = true;
  try {
    const start = new Date(); const end = new Date(start); end.setDate(end.getDate() + C.days); end.setHours(23, 59, 59, 0);
    const all = await Promise.all(C.cals.map(async ([label, eid, tone]) => {
      const evs = await getEvents(eid, start, end);
      return evs.map((e) => {
        const allDay = !e.start?.dateTime;
        const s = allDay ? new Date(`${e.start.date}T00:00:00`) : new Date(e.start.dateTime);
        const en = allDay ? new Date(`${e.end.date}T00:00:00`) : new Date(e.end.dateTime);
        return { label, tone, summary: e.summary ?? '', s, en, allDay };
      });
    }));
    const now = Date.now();
    const items = all.flat().filter((x) => !C.block.test(x.summary) && x.en.getTime() > now).sort((a, b) => a.s - b.s);
    agenda.value = { at: now, items, error: null };
  } catch (e) {
    agenda.value = { ...agenda.peek(), error: e?.message ?? 'CALENDAR FAULT' };
  } finally { agendaBusy = false; }
}
function useAgenda(C) {
  useEffect(() => {
    if (!C) return;
    if (Date.now() - agenda.peek().at > 60000) loadAgenda(C);
    const t = setInterval(() => loadAgenda(C), 300000);
    return () => clearInterval(t);
  }, [C, link.value.mode]);
  return agenda.value;
}
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayTag = (d) => { const t = new Date(); t.setHours(0, 0, 0, 0); const n = Math.round((new Date(d).setHours(0, 0, 0, 0) - t) / 864e5); return n === 0 ? 'TODAY' : n === 1 ? 'TOMORROW' : DAYS[d.getDay()]; };

function Chrono({ noNext }) {
  const R = useRoom();
  const d = clock.value;
  const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const ag = useAgenda(R.calendar);
  const next = R.calendar ? ag.items.find((x) => !x.allDay) : null;
  return (
    <section class="panel">
      <SecHead title="CHRONOMETER" tone="peach" />
      <div class="chrono">
        <div class="chrono-t">{pad(d.getHours())}<span class="chrono-c">:</span>{pad(d.getMinutes())}<span class="chrono-s">{pad(d.getSeconds())}</span></div>
        <div class="chrono-side">
          <div class="chrono-d">{DAYS[d.getDay()]}</div>
          <div class="chrono-m">{d.getDate()} {MONTHS[d.getMonth()]}</div>
          <div class="chrono-code">{d.getFullYear()} • {String(doy).padStart(3, '0')}</div>
        </div>
        {R.calendar && !noNext && (
          <div class="next-ev">
            <span class="next-k">NEXT</span>
            {next ? <><b>{dayTag(next.s) === 'TODAY' ? hm(next.s) : `${dayTag(next.s)} ${hm(next.s)}`}</b><span class="next-t">{next.summary}</span></> : <span class="next-t">NO EVENTS</span>}
          </div>
        )}
      </div>
    </section>
  );
}

const SOON_MS = 5 * 60 * 1000;
/** 'now' while an event is running, 'soon' in the 5 minutes before it starts. All-day events never flag. */
function evPhase(it, now) {
  if (it.allDay) return null;
  if (it.s <= now && now < it.en) return 'now';
  if (it.s > now && it.s - now <= SOON_MS) return 'soon';
  return null;
}

/* Start chirp: fires once per event when its start time passes while the console is open. */
let chirpTick = Date.now();
const chirped = new Set();
function checkEventStarts() {
  const now = Date.now();
  for (const it of agenda.peek().items) {
    if (it.allDay) continue;
    const t = it.s.getTime(); const key = `${it.summary}|${t}`;
    if (t > chirpTick && t <= now && !chirped.has(key)) { chirped.add(key); sfx('event'); }
  }
  chirpTick = now;
}
function EventChirp() {
  useEffect(() => { const t = setInterval(checkEventStarts, 1000); return () => clearInterval(t); }, []);
  return null;
}

function AgendaList({ todayOnly }) {
  const R = useRoom(); const C = R.calendar;
  const ag = useAgenda(C);
  const now = clock.value.getTime();
  const groups = [];
  const eod = new Date(); eod.setHours(23, 59, 59, 999);
  for (const it of ag.items) {
    if (todayOnly && it.s > eod) continue;
    const k = dayTag(it.s);
    let g = groups.find((x) => x.k === k); if (!g) groups.push((g = { k, items: [] }));
    g.items.push(it);
  }
  return (
    <div class="agenda">
      {ag.error && <div class="fault-line">FAULT • {ag.error}</div>}
      {groups.length === 0 && !ag.error && <div class="ag-empty">{todayOnly ? 'NOTHING ELSE TODAY' : 'NO UPCOMING EVENTS'}</div>}
      {groups.map((g) => (
        <div class="ag-day">
          <div class="ag-dh">{g.k}</div>
          {g.items.map((it) => (
            <div class="ag-row" data-phase={evPhase(it, now) ?? undefined} style={{ '--t': `var(--bl-${it.tone})` }}>
              <span class="ag-tm">{it.allDay ? 'ALL DAY' : `${hm(it.s)}–${hm(it.en)}`}</span>
              <span class="ag-sm">{it.summary}</span>
              <span class="ag-cal">{(() => {
                const ph = evPhase(it, now);
                if (ph === 'now') return `NOW • ${Math.ceil((it.en - now) / 60000)} MIN LEFT`;
                if (ph === 'soon') { const m = Math.max(0, Math.ceil((it.s - now) / 60000)); return `IN ${m} MIN`; }
                return it.label;
              })()}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SchedulePage() {
  const R = useRoom(); const C = R.calendar;
  const focus = ent(C.focus).value?.state === 'on';
  return (
    <div class="page page-sched">
      <section class="panel panel-scroll">
        <SecHead title="SCHEDULE" tone="peach" />
        <AgendaList />
      </section>
      <section class="panel">
        <SecHead title="STATUS" tone="violet" />
        <Block size="lg" label="FOCUS" sub={focus ? 'ACTIVE' : 'INACTIVE'} tag={code(C.focus)} tone={focus ? 'alert' : 'off'} disabled />
        {C.cals.map(([l, eid, tone]) => <div class="read-n"><b style={{ color: `var(--bl-${tone})` }}>{l}</b> {ent(eid).value?.attributes?.friendly_name ?? eid}</div>)}
        <Pill label="REFRESH" onPress={() => loadAgenda(C)} />
      </section>
    </div>
  );
}

/* ---------- weather ---------- */
const WX = { partlycloudy: 'PARTLY CLOUDY', 'clear-night': 'CLEAR', lightning: 'LIGHTNING', 'lightning-rainy': 'STORMS', pouring: 'POURING', 'snowy-rainy': 'SLEET', windy: 'WINDY', 'windy-variant': 'WINDY', exceptional: 'ALERT' };
const wxLabel = (c) => (c ? WX[c] ?? c.replace(/-/g, ' ').toUpperCase() : '--');
/* Some sources (NWS) offer hourly + twice_daily but no daily forecast (supported_features bit 1).
   Daily rows are then built from day/night pairs: high = daytime period, low = the night that follows,
   condition = daytime, rain chance = the higher of the two. */
async function loadForecast(eid, type) {
  const feat = ent(eid).peek()?.attributes?.supported_features ?? 1;
  if (type !== 'daily' || feat & 1 || !(feat & 4)) return getForecast(eid, type);
  const half = await getForecast(eid, 'twice_daily');
  const days = [];
  for (const p of half) {
    const key = new Date(p.datetime).toDateString();
    let d = days.find((x) => x.key === key);
    if (!d) { d = { key, datetime: p.datetime }; days.push(d); }
    if (p.is_daytime) { d.temperature = p.temperature; d.condition = p.condition; d.day = true; }
    else { d.templow = p.temperature; if (!d.day) { d.condition ??= p.condition; } }
    if (p.precipitation_probability != null) d.precipitation_probability = Math.max(d.precipitation_probability ?? 0, p.precipitation_probability);
  }
  // A night-only first entry (evening) has no high: show the night temperature as both ends.
  return days.map(({ key, day, ...d }) => ({ ...d, temperature: d.temperature ?? d.templow }));
}
const fcCache = {};
function useForecast(eid, type) {
  const key = `${eid}|${type}`;
  if (!fcCache[key]) fcCache[key] = signal({ at: 0, items: [], error: null });
  const sig = fcCache[key];
  useEffect(() => {
    if (!eid) return;
    const load = async () => {
      try { sig.value = { at: Date.now(), items: await loadForecast(eid, type), error: null }; }
      catch (e) { sig.value = { ...sig.peek(), at: Date.now(), error: e?.message ?? 'FORECAST FAULT' }; }
    };
    if (Date.now() - sig.peek().at > 600000) load();
    const t = setInterval(load, 1800000);
    return () => clearInterval(t);
  }, [eid, type, link.value.mode]);
  return sig.value;
}
function Stat({ k, v, na, color, meter }) {
  return (
    <div class="wx-stat" data-na={na ? '' : undefined}>
      <span>{k}</span>
      <b style={color ? { color } : undefined}>{v}</b>
      {meter}
    </div>
  );
}
const humMeter = (h) => (h == null ? null : <ScaleBar min={0} max={100} from={0} to={+h} fn={humColor} segs={12} label={`humidity ${h}%`} />);
const isNight = (W) => ent(W.sun).value?.state === 'below_horizon';
function WxBig({ W, a, cond, small }) {
  return (
    <div class={small ? 'wx-big wx-small' : 'wx-big'}>
      <WxIcon cond={cond} size={small ? 56 : 92} night={isNight(W)} />
      <span style={{ color: tempColor(a.temperature) ?? undefined }}>{a.temperature ?? '--'}<sup>°F</sup></span>
      <b>{wxLabel(cond)}</b>
    </div>
  );
}

function WeatherSummary({ compact }) {
  const R = useRoom(); const W = R.weather;
  const w = ent(W.entity).value; const a = w?.attributes ?? {};
  const fc = useForecast(W.entity, 'daily');
  const today = fc.items[0];
  const sun = ent(W.sun).value?.attributes ?? {};
  return (
    <section class="panel">
      <SecHead title="ATMOSPHERICS" tone="violet" />
      <WxBig W={W} a={a} cond={w?.state} small={compact} />
      <div class={compact ? 'wx-grid wx-compact' : 'wx-grid'}>
        <Stat k="HIGH / LOW" v={today ? <><i style={{ color: tempColor(today.temperature) }}>{Math.round(today.temperature)}°</i> / <i style={{ color: tempColor(today.templow) }}>{Math.round(today.templow)}°</i></> : '--'}
          meter={today ? <ScaleBar min={0} max={100} from={today.templow} to={today.temperature} fn={tempColor} segs={12} label="today's range" /> : null} />
        <Stat k="HUMIDITY" v={`${a.humidity ?? '--'}%`} color={humColor(a.humidity)} meter={humMeter(a.humidity)} />
        <Stat k="PRECIP" v={today?.precipitation_probability != null ? `${today.precipitation_probability}%` : '--'} />
        <Stat k={ent(W.sun).value?.state === 'above_horizon' ? 'SUNSET' : 'SUNRISE'} v={(() => { const t = ent(W.sun).value?.state === 'above_horizon' ? sun.next_setting : sun.next_rising; return t ? hm(new Date(t)) : '--'; })()} />
      </div>
    </section>
  );
}

/** Current dew point and rain chance, falling back to the first hourly period when the state lacks them. */
function useNow(W, a) {
  const hourly = useForecast(W.entity, 'hourly');
  const h0 = hourly.items[0];
  return { dew: a.dew_point ?? h0?.dew_point ?? null, rain: h0?.precipitation_probability ?? null };
}
function HourStrip({ W, n = 8 }) {
  const hourly = useForecast(W.entity, 'hourly');
  return (
    <div class="fc-hours">
      {hourly.items.slice(0, n).map((h) => (
        <div class="fc-h" style={{ '--tc': tempColor(h.temperature) }}>
          <span>{hm(new Date(h.datetime))}</span>
          <WxIcon cond={h.condition} size={30} night={(() => { const hr = new Date(h.datetime).getHours(); return hr < 7 || hr >= 19; })()} />
          <b>{Math.round(h.temperature)}°</b>
          <small>{h.precipitation_probability != null ? `${h.precipitation_probability}%` : ''}</small>
        </div>
      ))}
      {hourly.error && <div class="fault-line">FAULT • {hourly.error}</div>}
    </div>
  );
}
function DayList({ W, n = 6 }) {
  const daily = useForecast(W.entity, 'daily');
  return (
    <div class="fc-days">
      {(() => {
        const days = daily.items.slice(0, n);
        const lo = Math.min(...days.map((d) => d.templow ?? d.temperature)) - 2;
        const hi = Math.max(...days.map((d) => d.temperature)) + 2;
        return days.map((d, i) => (
          <div class="fc-d">
            <span class="fc-dn">{i === 0 ? 'TODAY' : DAYS[new Date(d.datetime).getDay()].slice(0, 3)}</span>
            <WxIcon cond={d.condition} size={36} />
            <span class="fc-dp">{d.precipitation_probability != null ? `${d.precipitation_probability}%` : ''}</span>
            <span class="fc-dl" style={{ color: tempColor(d.templow) }}>{d.templow != null ? `${Math.round(d.templow)}°` : ''}</span>
            <ScaleBar min={lo} max={hi} from={d.templow ?? d.temperature} to={d.temperature} fn={tempColor} segs={14} label={`${wxLabel(d.condition)} ${Math.round(d.templow)} to ${Math.round(d.temperature)}`} />
            <b style={{ color: tempColor(d.temperature) }}>{Math.round(d.temperature)}°</b>
          </div>
        ));
      })()}
      {daily.error && <div class="fault-line">FAULT • {daily.error}</div>}
    </div>
  );
}
function WeatherPage() {
  const R = useRoom(); const W = R.weather;
  const w = ent(W.entity).value; const a = w?.attributes ?? {};
  const { dew, rain } = useNow(W, a);
  const sun = ent(W.sun).value?.attributes ?? {};
  return (
    <div class="page page-wx">
      <section class="panel">
        <SecHead title="CURRENT" tone="violet" />
        <WxBig W={W} a={a} cond={w?.state} />
        <div class="wx-grid wx-grid-3">
          <Stat k="HUMIDITY" v={`${a.humidity ?? '--'}%`} color={humColor(a.humidity)} meter={humMeter(a.humidity)} />
          <Stat k="DEW POINT" v={`${dew ?? '--'}°`} color={tempColor(dew)} />
          {a.cloud_coverage != null
            ? <Stat k="CLOUD" v={`${Math.round(a.cloud_coverage)}%`} />
            : <Stat k="RAIN CHANCE" v={rain != null ? `${rain}%` : '--'} />}
          <Stat k="WIND" v={`${a.wind_speed != null ? Math.round(a.wind_speed) : '--'} ${a.wind_speed_unit ?? ''}`} />
          <Stat k="PRESSURE" v={`${a.pressure ?? '--'}`} />
          {a.uv_index != null
            ? <Stat k="UV INDEX" v={`${a.uv_index}`} />
            : <Stat k="VISIBILITY" v={a.visibility != null ? `${a.visibility} ${a.visibility_unit ?? ''}` : '--'} />}
          <Stat k="SUNRISE" v={sun.next_rising ? hm(new Date(sun.next_rising)) : '--'} />
          <Stat k="SUNSET" v={sun.next_setting ? hm(new Date(sun.next_setting)) : '--'} />
        </div>
        <SecHead title="NEXT HOURS" tone="peach" />
        <HourStrip W={W} />
      </section>
      <section class="panel">
        <SecHead title="FORECAST" tone="tan" />
        <DayList W={W} />
      </section>
    </div>
  );
}

function DoorsBlock({ size }) {
  const R = useRoom();
  const d = useEnt(R.quick.allDoors);
  const open = SHARED.doors.filter((x) => ent(x).value?.state === 'on').length;
  return <Block size={size} sound="nav" label="DOORS" sub={d.missing ? 'NOT FOUND' : d.offline ? 'OFFLINE' : open ? `${open} OPEN` : 'ALL SECURE'} tag={code(R.quick.allDoors)} tone={d.offline ? 'na' : open ? 'alert' : 'off'} onPress={() => go(R, 'SECURITY')} />;
}

function ZoneBlock({ label, id }) {
  const s = useEnt(id);
  const pct = s.st?.attributes?.brightness != null ? Math.round(s.st.attributes.brightness / 2.55) : null;
  return <Block label={label} sub={s.missing ? 'NOT FOUND' : s.offline ? 'OFFLINE' : s.st.state === 'on' ? (pct != null ? `ON • ${pct}%` : 'ON') : 'OFF'} tag={code(id)} tone={s.offline ? 'na' : s.st?.state === 'on' ? 'on' : 'off'} disabled={s.offline} busy={isPending(id)} onPress={() => call('light', 'toggle', {}, id)} />;
}

function MainPage() {
  const R = useRoom();
  if (R.mainLayout === 'house') {
    return (
      <div class="page page-main">
        <Chrono />
        <section class="panel">
          <SecHead title="MAIN FLOOR" tone="tan" />
          <LightCore L={useLights()} />
          <div class="grid4">{R.lightScenes.map(([l, sid]) => <PressBlock size="sm" id={sid} label={l} />)}</div>
        </section>
        <section class="panel span2">
          <SecHead title="ZONES" tone="peach" />
          <div class="grid4">
            {R.zones.slice(1).map(([l, id]) => <ZoneBlock label={l} id={id} />)}
            <ClimateBlock />
            <GarageBlock size="md" />
            <DoorsBlock />
            {(R.findMy ?? []).map(([l, id]) => <PressBlock id={id} label={l} prefix="FIND MY" tone="cool" />)}
            {Array.from({ length: Math.max(0, 6 - (R.findMy?.length ?? 0)) }, (_, i) => <SpareBlock n={i + 1} />)}
          </div>
        </section>
      </div>
    );
  }
  if (R.mainLayout === 'entry') {
    return (
      <div class="page page-main">
        <Chrono /><WeatherSummary compact />
        <LightCompact />
        <section class="panel">
          <SecHead title="QUICK ACCESS" tone="peach" />
          <div class="grid2 quick">
            <ToggleBlock id={R.quick.allLights} label="ALL LIGHTS" />
            <GoodbyeBlock id={R.quick.goodbye} away={R.quick.away} />
            <GarageBlock />
            <DoorsBlock />
          </div>
        </section>
        {R.vehicleMode && <section class="panel span2"><SecHead title="VEHICLES" tone="violet" /><VehicleSummary vehicles={R.vehicles} mode={R.vehicleMode} compact={R.vehicleCompact} /></section>}
        {R.vehicleMode && <VehicleOverlay vehicles={R.vehicles} compact={R.vehicleCompact} />}
      </div>
    );
  }
  if (R.mainLayout === 'agenda') {
    return (
      <div class="page page-main-ag">
        <Chrono noNext /><LightSummary />
        <section class="panel panel-scroll ag-today">
          <SecHead title="TODAY" tone="peach" />
          <AgendaList todayOnly />
        </section>
      </div>
    );
  }
  return <div class="page page-main"><Chrono /><LightSummary /><MediaSummary /><EnvSummary /></div>;
}

/* ---------- media ---------- */
function Media({ id, label, compact }) {
  const { st, missing, offline } = useEnt(id);
  if (missing) return <Missing id={id} label={label} />;
  if (!st) return <div class="media media-wait">{label} · AWAITING</div>;
  const s = st.state;
  const a = st.attributes;
  const on = !['off', 'unavailable', 'standby'].includes(s);
  const busy = isPending(id);
  const vol = a.volume_level;
  return (
    <div class="media" data-state={s}>
      <div class="media-hd">
        <span class="media-l">{label}</span>
        <span class="media-s" data-play={s === 'playing' ? '' : undefined}>{s.replace('_', ' ')}</span>
      </div>
      <div class="media-title">{a.media_title || (on ? 'NO MEDIA' : 'STANDBY')}</div>
      <div class="media-sub">{[a.media_artist, a.source, a.app_name].filter(Boolean).join(' • ') || code(id, 6)}</div>
      <div class="row">
        {has(st, 16) && <Pill label="PREV" disabled={!on || offline} onPress={() => call('media_player', 'media_previous_track', {}, id)} />}
        {(has(st, 1) || has(st, 16384)) && <Pill label={s === 'playing' ? 'PAUSE' : 'PLAY'} tone="hot" busy={busy} disabled={!on || offline} onPress={() => call('media_player', 'media_play_pause', {}, id)} />}
        {has(st, 32) && <Pill label="NEXT" disabled={!on || offline} onPress={() => call('media_player', 'media_next_track', {}, id)} />}
        {!compact && vol == null && has(st, 1024) && <><Pill label="VOL −" disabled={!on || offline} onPress={() => call('media_player', 'volume_down', {}, id)} /><Pill label="VOL +" disabled={!on || offline} onPress={() => call('media_player', 'volume_up', {}, id)} /></>}
        {!compact && (has(st, 256) || has(st, 128)) && <Pill label={on ? 'POWER OFF' : 'POWER ON'} disabled={offline} onPress={() => call('media_player', on ? 'turn_off' : 'turn_on', {}, id)} />}
      </div>
      {!compact && vol != null && has(st, 4) && (
        <Slider label="VOLUME" value={Math.round(vol * 100)} fmt={(v) => `${v}%`} disabled={!on} tone="violet" onCommit={(v) => call('media_player', 'volume_set', { volume_level: v / 100 }, id)} />
      )}
    </div>
  );
}
function MediaSummary() {
  const R = useRoom();
  const m = R.media.find((x) => x[2] === R.mainMedia) ?? R.media[0];
  return <section class="panel"><SecHead title="AUDIO VISUAL" tone="violet" /><Media id={m[2]} label={m[1]} compact /></section>;
}
/* ---------- MEDIA page: MUSIC (Music Assistant) | TELEVISION ---------- */
const mediaTab = {};
function MediaPage() {
  const R = useRoom();
  const tab = (mediaTab[R.key] ??= signal('music'));
  return (
    <div class="page page-mtab">
      <div class="mt-tabs" role="tablist">
        {[['music', 'MUSIC'], ['tv', 'TELEVISION']].map(([k, l]) => (
          <button class="mt-tab" role="tab" data-sfx="nav" data-sel={tab.value === k ? '' : undefined} aria-selected={tab.value === k} onClick={() => (tab.value = k)}>{l}</button>
        ))}
        <span class="mt-fill" />
      </div>
      {tab.value === 'music'
        ? <MusicView />
        : (
          <div class={`page-in ${R.media.length > 1 ? 'page-2' : 'page-1'} page-media`}>
            {R.media.map(([t, l, id, tone]) => <section class="panel"><SecHead title={t} tone={tone} /><Media id={id} label={l} /></section>)}
          </div>
        )}
    </div>
  );
}

const mSpeaker = {};
const MS_KEY = (room) => `cabinlcars.music.${room}`;
function speakerSig(R) {
  if (!mSpeaker[R.key]) {
    const saved = LS.get(MS_KEY(R.key));
    const ok = (id) => MUSIC.speakers.some((x) => x[1] === id);
    mSpeaker[R.key] = signal(ok(saved) ? saved : ok(R.musicDefault) ? R.musicDefault : MUSIC.speakers[0][1]);
  }
  return mSpeaker[R.key];
}
const mmss = (s) => (s == null || Number.isNaN(s) ? '--:--' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

function MusicView() {
  const R = useRoom();
  const sp = speakerSig(R);
  const id = sp.value;
  const meta = MUSIC.speakers.find((x) => x[1] === id);
  const { st, missing, offline } = useEnt(id);
  const a = st?.attributes ?? {};
  const s = st?.state;
  const playing = s === 'playing';
  const active = playing || s === 'paused' || s === 'buffering';
  const dead = !st || offline;
  const busy = isPending(id);
  // progress: HA reports position at a moment; extrapolate while playing
  const [, tick] = useStateTick(playing ? 1000 : 0);
  const pos0 = a.media_position != null ? a.media_position + (playing && a.media_position_updated_at ? (Date.now() - Date.parse(a.media_position_updated_at)) / 1000 : 0) : null;
  const pos = pos0 != null && a.media_duration ? Math.min(pos0, a.media_duration) : pos0;
  const dur = a.media_duration;
  const frac = pos != null && dur ? Math.max(0, Math.min(1, pos / dur)) : 0;
  const art = a.entity_picture ? (/^https?:/.test(a.entity_picture) ? a.entity_picture : `${hassUrl()}${a.entity_picture}`) : null;
  const rpt = a.repeat ?? 'off';
  const nextRpt = { off: 'all', all: 'one', one: 'off' }[rpt] ?? 'off';
  const vol = a.volume_level;
  const pick = (v) => { sp.value = v; LS.set(MS_KEY(R.key), v); };
  // Portrait stacked layout (same rule as the CSS: portrait and MEDIA page 1100 px or narrower):
  // while LIBRARY > SEARCH is open, NOW PLAYING shrinks to a strip so results have room.
  const [mref, mw] = useWidth();
  const portrait = typeof matchMedia === 'function' && matchMedia('(orientation: portrait)').matches;
  const compact = libTab.value === 'search' && portrait && mw > 0 && mw <= 1100;
  const spkOpen = useSignal(false);
  const spk = (
    <div class="mu-spkw"><div class="mu-spk" role="radiogroup" aria-label="Speaker">
        {MUSIC.speakers.map(([label, sid, sub]) => {
          const ss = ent(sid).value;
          const on = ss?.state === 'playing';
          const na = !ss || UNAVAIL.has(ss.state);
          return (
            <button class="mu-sp" role="radio" aria-checked={sid === id} data-sel={sid === id ? '' : undefined} data-play={on ? '' : undefined} data-na={na ? '' : undefined} data-sfx="nav" onClick={() => pick(sid)}>
              <small>{na ? 'OFFLINE' : on ? 'PLAYING' : sub}</small><b>{label}</b>
            </button>
          );
        })}
      </div></div>
  );
  if (compact) {
    return (
      <div class="page-in music" ref={mref} data-compact="">
        <section class="panel mu-strip">
          <div class="mu-sline">
            <div class="mu-art" data-empty={art ? undefined : ''}>{art ? <img src={art} alt="" /> : <span>{active ? 'ART' : 'IDLE'}</span>}</div>
            <div class="mu-meta">
              <span class="mu-state" data-play={playing ? '' : undefined}>{meta?.[0]} • {dead ? 'OFFLINE' : (s ?? '--').replace('_', ' ').toUpperCase()}</span>
              <b class="mu-title">{active && a.media_title ? a.media_title : dead ? 'SPEAKER OFFLINE' : 'NOTHING PLAYING'}</b>
              <span class="mu-artist">{active ? [a.media_artist, a.media_album_name].filter(Boolean).join(' • ') : 'SEARCH BELOW, THEN TAP PLAY'}</span>
              <div class="mu-prog" aria-hidden="true"><i style={{ width: `${frac * 100}%` }} /></div>
            </div>
            <div class="mu-sbtn">
              <Pill label={playing ? 'PAUSE' : 'PLAY'} tone="hot" busy={busy} disabled={dead || !active} onPress={() => call('media_player', 'media_play_pause', {}, id)} />
              <Pill label="NEXT" disabled={dead || !active} onPress={() => call('media_player', 'media_next_track', {}, id)} />
              <Pill label={spkOpen.value ? 'CLOSE' : 'SPEAKER'} selected={spkOpen.value} onPress={() => (spkOpen.value = !spkOpen.peek())} />
            </div>
          </div>
          {spkOpen.value && spk}
        </section>
        <MusicLibrary speaker={id} speakerLabel={meta?.[0]} dead={dead} />
        {kbOpen.value && <SearchKeyboard />}
      </div>
    );
  }
  return (
    <div class="page-in music" ref={mref}>
      <section class="panel mu-now">
        <SecHead title="NOW PLAYING" tone="violet" />
        {spk}
        {missing ? <Missing id={id} label={meta?.[0] ?? id} /> : (
          <>
            <div class="mu-track">
              <div class="mu-art" data-empty={art ? undefined : ''}>{art ? <img src={art} alt="" /> : <span>{active ? 'NO ART' : 'IDLE'}</span>}</div>
              <div class="mu-meta">
                <span class="mu-state" data-play={playing ? '' : undefined}>{meta?.[0]} • {dead ? 'OFFLINE' : (s ?? '--').replace('_', ' ').toUpperCase()}{a.group_members?.length ? ` • ${a.group_members.length} SPEAKERS` : ''}</span>
                <b class="mu-title">{active && a.media_title ? a.media_title : dead ? 'SPEAKER OFFLINE' : 'NOTHING PLAYING'}</b>
                <span class="mu-artist">{active ? [a.media_artist, a.media_album_name].filter(Boolean).join(' • ') : 'PICK A PLAYLIST, ALBUM, ARTIST OR STATION'}</span>
                <div class="mu-prog" aria-hidden="true"><i style={{ width: `${frac * 100}%` }} /></div>
                <div class="mu-time"><span>{active ? mmss(pos) : '--:--'}</span><span>{active ? mmss(dur) : '--:--'}</span></div>
              </div>
            </div>
            <div class="mu-tx">
              <Pill label="PREV" disabled={dead || !active} onPress={() => call('media_player', 'media_previous_track', {}, id)} />
              <Pill label={playing ? 'PAUSE' : 'PLAY'} tone="hot" busy={busy} disabled={dead || !active} onPress={() => call('media_player', 'media_play_pause', {}, id)} />
              <Pill label="NEXT" disabled={dead || !active} onPress={() => call('media_player', 'media_next_track', {}, id)} />
              <Pill label="STOP" disabled={dead || !active} onPress={() => call('media_player', 'media_stop', {}, id)} />
              <Pill label={a.shuffle ? 'SHUFFLE ON' : 'SHUFFLE'} selected={!!a.shuffle} disabled={dead} onPress={() => call('media_player', 'shuffle_set', { shuffle: !a.shuffle }, id)} />
              <Pill label={rpt === 'off' ? 'REPEAT' : `REPEAT ${rpt.toUpperCase()}`} selected={rpt !== 'off'} disabled={dead} onPress={() => call('media_player', 'repeat_set', { repeat: nextRpt }, id)} />
            </div>
            <div class="mu-vol">
              <Slider label="VOLUME" value={vol != null ? Math.round(vol * 100) : null} fmt={(v) => `${v}%`} disabled={dead} tone="violet" onCommit={(v) => call('media_player', 'volume_set', { volume_level: v / 100 }, id)} />
              <Pill label={a.is_volume_muted ? 'UNMUTE' : 'MUTE'} selected={!!a.is_volume_muted} disabled={dead || !((a.supported_features ?? 0) & 8)} onPress={() => call('media_player', 'volume_mute', { is_volume_muted: !a.is_volume_muted }, id)} />
            </div>
          </>
        )}
      </section>
      <MusicLibrary speaker={id} speakerLabel={meta?.[0]} dead={dead} />
      {kbOpen.value && <SearchKeyboard />}
    </div>
  );
}
function useWidth() {
  const ref = useRef(null);
  const w = useSignal(0);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const m = () => { w.value = Math.floor(el.clientWidth); };
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, [ref.current]);
  return [ref, w.value];
}
function useStateTick(ms) {
  const n = useSignal(0);
  useEffect(() => { if (!ms) return undefined; const t = setInterval(() => (n.value += 1), ms); return () => clearInterval(t); }, [ms]);
  return [n.value, n];
}

// library cache shared by all rooms on this screen: { [type]: { items, done, err, loading } }
const libCache = signal({});
const libTab = signal('playlist');
// SEARCH replaced RADIO (v42): the radio library is unused
const LIB_TABS = [['search', 'SEARCH'], ['playlist', 'PLAYLISTS'], ['album', 'ALBUMS'], ['artist', 'ARTISTS']];
const LIB_PAGE = 60;
// MA playlists named only with dots or ellipses are placeholder entries from the provider; hide them
const realName = (n) => /[A-Za-z0-9]/.test(n ?? '');
async function loadLib(type, more) {
  const cur = libCache.peek()[type];
  if (cur?.loading || (more && cur?.done)) return;
  const items = more ? cur?.items ?? [] : [];
  libCache.value = { ...libCache.peek(), [type]: { items, loading: true } };
  try {
    const order = { album: 'timestamp_added_desc', artist: 'sort_name' }[type] ?? 'sort_name';
    const r = await serviceResponse('music_assistant', 'get_library', { config_entry_id: MUSIC.entry, media_type: type, limit: LIB_PAGE, offset: items.length, order_by: order, ...(type === 'artist' ? { album_artists_only: true } : {}) });
    const got = r?.items ?? [];
    libCache.value = { ...libCache.peek(), [type]: { items: [...items, ...got], done: got.length < LIB_PAGE, loading: false } };
  } catch (e) {
    libCache.value = { ...libCache.peek(), [type]: { items, loading: false, err: (e?.message ?? 'LIBRARY UNAVAILABLE').toUpperCase() } };
  }
}
function MusicLibrary({ speaker, speakerLabel, dead }) {
  const type = libTab.value;
  const L = libCache.value[type];
  const started = useSignal(null);
  useEffect(() => { if (type !== 'search' && !libCache.peek()[type]) loadLib(type); }, [type, link.value.mode]);
  const play = async (it) => {
    started.value = { uri: it.uri, state: 'busy' };
    try {
      await call('music_assistant', 'play_media', { media_id: it.uri, media_type: it.media_type, enqueue: 'replace' }, speaker);
      started.value = { uri: it.uri, state: 'ok' };
    } catch (e) { started.value = { uri: it.uri, state: 'err' }; }
    setTimeout(() => { if (started.peek()?.uri === it.uri) started.value = null; }, 3000);
  };
  const items = (L?.items ?? []).filter((it) => realName(it.name));
  return (
    <section class="panel mu-lib">
      <SecHead title="LIBRARY" tone="peach" />
      <div class="mu-ltabs">
        {LIB_TABS.map(([k, l]) => <button class="mu-lt" data-sfx="nav" data-sel={type === k ? '' : undefined} onClick={() => (libTab.value = k)}>{l}</button>)}
      </div>
      {type === 'search' ? <MusicSearch speaker={speaker} speakerLabel={speakerLabel} dead={dead} /> : (
        <>
          <div class="mu-to"><span>TAP TO PLAY ON <b>{speakerLabel ?? '--'}</b>{dead ? ' • SPEAKER OFFLINE' : ''}</span><button class="mu-ref" data-sfx="nav" onClick={() => loadLib(type)}>REFRESH</button></div>
          <div class="mu-list" role="list">
            {L?.err && <div class="fault-line">FAULT • {L.err}</div>}
            {!L || (L.loading && !items.length) ? <div class="mu-wait">LOADING LIBRARY</div> : null}
            {L && !L.loading && !L.err && !items.length && <div class="mu-wait">NOTHING IN THIS SECTION</div>}
            {items.map((it, i) => {
              const sub = it.media_type === 'album' ? (it.artists ?? []).map((x) => x.name).join(', ') : it.media_type === 'artist' ? 'ARTIST • TOP TRACKS' : 'PLAYLIST';
              const S = started.value?.uri === it.uri ? started.value.state : null;
              return (
                <button class="mu-it" role="listitem" data-state={S ?? undefined} disabled={dead} onClick={() => play(it)}>
                  <span class="mu-in">{String(i + 1).padStart(2, '0')}</span>
                  <span class="mu-nm"><b>{it.name}</b><small>{S === 'busy' ? 'STARTING' : S === 'ok' ? `PLAYING ON ${speakerLabel}` : S === 'err' ? 'FAILED' : UP(sub)}</small></span>
                </button>
              );
            })}
            {L && !L.done && !L.err && items.length > 0 && <button class="mu-more" data-sfx="nav" disabled={L.loading} onClick={() => loadLib(type, true)}>{L.loading ? 'LOADING' : 'LOAD MORE'}</button>}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- music search (v42): LIBRARY > SEARCH, on-screen QWERTY keyboard ---------- */
// Shared by every room on this screen. res = music_assistant.search response.
const srch = signal({ q: '', res: null, loading: false, err: null });
const srchFilter = signal('all');
const srchLibOnly = signal(false);
const srchArtist = signal(null); // { it, albums, loading, err }
const kbOpen = signal(false);
const kbText = signal('');
const feed = signal({}); // play feedback by key: busy | ok | err
const RECENT_KEY = 'cabinlcars.music.recent';
const recent = signal(LS.get(RECENT_KEY) ?? []);
const SRCH_LIMIT = 20;
function remember(q) {
  const r = [q, ...recent.peek().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  recent.value = r; LS.set(RECENT_KEY, r);
}
async function runSearch(q) {
  q = (q ?? '').trim();
  srchArtist.value = null;
  if (!q) { srch.value = { q: '', res: null, loading: false, err: null }; return; }
  remember(q);
  srch.value = { q, res: srch.peek().q === q ? srch.peek().res : null, loading: true, err: null };
  try {
    const r = await serviceResponse('music_assistant', 'search', { config_entry_id: MUSIC.entry, name: q, limit: SRCH_LIMIT, ...(srchLibOnly.peek() ? { library_only: true } : {}) });
    if (srch.peek().q === q) srch.value = { q, res: r ?? {}, loading: false, err: null };
  } catch (e) {
    if (srch.peek().q === q) srch.value = { q, res: null, loading: false, err: (e?.message ?? 'SEARCH UNAVAILABLE').toUpperCase() };
  }
}
// Albums often come back in several editions (anniversary, drumless, "complete edition"). Group by base title.
const baseTitle = (n) => String(n ?? '').toLowerCase().replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/\s+-\s+(ep|single)$/, '').replace(/[^a-z0-9]+/g, ' ').trim();
function groupEditions(albums) {
  const m = new Map();
  for (const a of albums) {
    const k = baseTitle(a.name) || a.uri;
    const g = m.get(k);
    if (!g) m.set(k, { ...a, editions: 1 });
    else { g.editions += 1; if ((g.version && !a.version) || (!a.version && !g.version && a.name.length < g.name.length)) Object.assign(g, { ...a, editions: g.editions }); }
  }
  // a grouped album shows its base title (editions keep their full names in Music Assistant)
  return [...m.values()].map((g) => (g.editions > 1 ? { ...g, display: g.name.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || g.name, version: '' } : g));
}
const byArtist = (name) => (a) => (a.artists ?? []).some((x) => (x.name ?? '').toLowerCase().includes(name.toLowerCase()));
async function openArtist(it) {
  srchArtist.value = { it, albums: [], loading: true, err: null };
  try {
    const r = await serviceResponse('music_assistant', 'search', { config_entry_id: MUSIC.entry, name: it.name, media_type: ['album'], artist: it.name, limit: 50, ...(srchLibOnly.peek() ? { library_only: true } : {}) });
    if (srchArtist.peek()?.it.uri !== it.uri) return;
    srchArtist.value = { it, albums: groupEditions((r?.albums ?? []).filter(byArtist(it.name))), loading: false, err: null };
  } catch (e) {
    if (srchArtist.peek()?.it.uri === it.uri) srchArtist.value = { it, albums: [], loading: false, err: (e?.message ?? 'ARTIST UNAVAILABLE').toUpperCase() };
  }
}
async function mplay(key, speaker, data) {
  feed.value = { ...feed.peek(), [key]: 'busy' };
  let st = 'ok';
  try { await call('music_assistant', 'play_media', data, speaker); } catch (e) { st = 'err'; }
  feed.value = { ...feed.peek(), [key]: st };
  setTimeout(() => { if (feed.peek()[key] === st) { const f = { ...feed.peek() }; delete f[key]; feed.value = f; } }, 3000);
}
const artUrl = (src) => (!src ? null : /^https?:/.test(src) ? src : `${hassUrl()}${src}`);
const initials = (n) => String(n ?? '').replace(/^the\s+/i, '').split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '--';
function Art({ src, name, round }) {
  const bad = useSignal(false);
  const u = artUrl(src);
  return (
    <span class="ms-art" data-round={round ? '' : undefined}>
      {u && !bad.value ? <img src={u} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => (bad.value = true)} /> : <i>{initials(name)}</i>}
    </span>
  );
}
const ARTISTS = (it) => (it.artists ?? []).map((x) => x.name).filter(Boolean).join(', ');
function SRow({ it, sub, round, onBody, acts, fkey }) {
  const S = fkey ? feed.value[fkey] : null;
  return (
    <div class="ms-row" data-state={S ?? undefined} role="listitem">
      <button class="ms-body" onClick={onBody}>
        <Art src={it.image} name={it.name} round={round} />
        <span class="ms-nm"><b>{it.display ?? it.name}{it.version ? <em> • {it.version}</em> : null}</b><small>{S === 'busy' ? 'STARTING' : S === 'ok' ? 'SENT TO SPEAKER' : S === 'err' ? 'FAILED' : UP(sub)}</small></span>
      </button>
      {acts.map(([l, t, fn, dis]) => <button class="ms-act" data-t={t} disabled={dis} onClick={fn}>{l}</button>)}
    </div>
  );
}
function MusicSearch({ speaker, speakerLabel, dead }) {
  const s = srch.value;
  const A = srchArtist.value;
  const open = () => { kbText.value = s.q; kbOpen.value = true; };
  const play = (it, enqueue = 'replace', extra = {}) => mplay(`${it.uri}|${enqueue}|${extra.radio_mode ? 'r' : ''}`, speaker, { media_id: it.uri, media_type: it.media_type, enqueue, ...extra });
  const F = (it, enqueue = 'replace', extra = {}) => `${it.uri}|${enqueue}|${extra.radio_mode ? 'r' : ''}`;
  const searchBox = (
    <div class="ms-q">
      <button class="ms-qbox" data-sfx="nav" onClick={open}>
        {s.q ? <><small>QUERY</small><b>{s.q}</b></> : <span>TAP TO SEARCH ARTISTS, ALBUMS, SONGS</span>}
      </button>
      <button class="ms-qbtn" data-sfx="nav" disabled={!s.q} onClick={() => runSearch('')}>CLEAR</button>
    </div>
  );
  const scope = (
    <div class="mu-to"><span>{srchLibOnly.value ? 'YOUR LIBRARY' : 'LIBRARY + STREAMING'} • PLAYS ON <b>{speakerLabel ?? '--'}</b>{dead ? ' • SPEAKER OFFLINE' : ''}</span>
      <button class="mu-ref" data-sfx="nav" data-sel={srchLibOnly.value ? '' : undefined} onClick={() => { srchLibOnly.value = !srchLibOnly.peek(); if (srch.peek().q) runSearch(srch.peek().q); }}>LIBRARY ONLY</button>
    </div>
  );
  if (A) {
    const it = A.it;
    const allAlbums = () => mplay(`${it.uri}|all`, speaker, { media_id: A.albums.map((a) => a.uri), media_type: 'album', enqueue: 'replace' });
    return (
      <>
        <div class="ms-q"><button class="ms-qbtn ms-back" data-sfx="nav" onClick={() => (srchArtist.value = null)}>‹ RESULTS</button><button class="ms-qbox" data-sfx="nav" onClick={open}><small>ARTIST</small><b>{it.name}</b></button></div>
        <div class="ms-ahead">
          <Art src={it.image} name={it.name} />
          <div class="ms-ameta">
            <small>{feed.value[F(it)] === 'busy' || feed.value[`${it.uri}|all`] === 'busy' || feed.value[F(it, 'replace', { radio_mode: true })] === 'busy' ? 'STARTING' : `ARTIST • PLAYS ON ${speakerLabel ?? '--'}`}</small>
            <b>{it.name}</b>
            <div class="ms-aacts">
              <button class="ms-act" data-t="hot" disabled={dead} onClick={() => play(it)}>TOP SONGS</button>
              <button class="ms-act" data-t="tan" disabled={dead || !A.albums.length} onClick={allAlbums}>ALL ALBUMS</button>
              <button class="ms-act" data-t="sky" disabled={dead} onClick={() => play(it, 'replace', { radio_mode: true })}>ARTIST RADIO</button>
            </div>
          </div>
        </div>
        <div class="ms-grp">ALBUMS <i>{A.loading ? 'LOADING' : `${A.albums.length}${A.albums.some((a) => a.editions > 1) ? ' • EDITIONS GROUPED' : ''}`}</i></div>
        <div class="mu-list ms-list" role="list">
          {A.err && <div class="fault-line">FAULT • {A.err}</div>}
          {!A.loading && !A.err && !A.albums.length && <div class="mu-wait">NO ALBUMS FOUND</div>}
          {A.albums.map((a) => (
            <SRow it={a} fkey={feed.value[F(a)] ? F(a) : feed.value[F(a, 'next')] ? F(a, 'next') : F(a, 'add')} sub={`ALBUM${a.editions > 1 ? ` • +${a.editions - 1} EDITION${a.editions > 2 ? 'S' : ''}` : ''}`} onBody={() => !dead && play(a)}
              acts={[['PLAY', 'hot', () => play(a), dead], ['NEXT', '', () => play(a, 'next'), dead], ['+ QUEUE', '', () => play(a, 'add'), dead]]} />
          ))}
        </div>
      </>
    );
  }
  const r = s.res ?? {};
  const groups = [
    ['artists', 'ARTISTS', r.artists ?? []],
    ['albums', 'ALBUMS', groupEditions(r.albums ?? [])],
    ['tracks', 'SONGS', r.tracks ?? []],
    ['playlists', 'PLAYLISTS', (r.playlists ?? []).filter((p) => realName(p.name))],
  ];
  const f = srchFilter.value;
  const shown = groups.filter(([k]) => f === 'all' || f === k);
  const total = groups.reduce((n, g) => n + g[2].length, 0);
  const row = (k, it) => {
    if (k === 'artists') return <SRow it={it} round fkey={F(it)} sub="ARTIST • TAP TO OPEN" onBody={() => openArtist(it)} acts={[['TOP SONGS', 'hot', () => play(it), dead], ['OPEN ›', '', () => openArtist(it)]]} />;
    if (k === 'tracks') { const fk = feed.value[F(it, 'next')] ? F(it, 'next') : F(it); return <SRow it={it} fkey={fk} sub={[ARTISTS(it), it.album?.name].filter(Boolean).join(' • ')} onBody={() => !dead && play(it)} acts={[['PLAY', 'hot', () => play(it), dead], ['NEXT', '', () => play(it, 'next'), dead]]} />; }
    const sub = k === 'albums' ? `${ARTISTS(it) || 'ALBUM'}${it.editions > 1 ? ` • ${it.editions} EDITIONS` : ''}` : 'PLAYLIST';
    const fk = feed.value[F(it, 'add')] ? F(it, 'add') : F(it);
    return <SRow it={it} fkey={fk} sub={sub} onBody={() => !dead && play(it)} acts={[['PLAY', 'hot', () => play(it), dead], ['+ QUEUE', '', () => play(it, 'add'), dead]]} />;
  };
  return (
    <>
      {searchBox}
      {s.res && (
        <div class="ms-chips">
          {[['all', 'ALL'], ...groups.map(([k, l]) => [k, l])].map(([k, l]) => <button class="ms-chip" data-sfx="nav" data-sel={f === k ? '' : undefined} onClick={() => (srchFilter.value = k)}>{l}</button>)}
        </div>
      )}
      {scope}
      <div class="mu-list ms-list" role="list">
        {s.err && <div class="fault-line">FAULT • {s.err}</div>}
        {s.loading && !s.res && <div class="mu-wait">SEARCHING • {UP(s.q)}</div>}
        {!s.q && !s.loading && (
          <>
            <div class="mu-wait">TAP THE SEARCH BOX TO TYPE</div>
            {recent.value.length > 0 && <div class="ms-grp">RECENT</div>}
            {recent.value.map((q) => <button class="mu-it" onClick={() => runSearch(q)}><span class="mu-in">›</span><span class="mu-nm"><b>{q}</b><small>SEARCH AGAIN</small></span></button>)}
          </>
        )}
        {s.res && !total && <div class="mu-wait">NO RESULTS FOR {UP(s.q)}</div>}
        {s.res && shown.map(([k, l, list]) => list.length ? (
          <>
            <div class="ms-grp">{l} <i>{list.length}</i></div>
            {(f === 'all' ? list.slice(0, k === 'tracks' ? 6 : 4) : list).map((it) => row(k, it))}
            {f === 'all' && list.length > (k === 'tracks' ? 6 : 4) && <button class="ms-more" data-sfx="nav" onClick={() => (srchFilter.value = k)}>ALL {list.length} {l} ›</button>}
          </>
        ) : null)}
      </div>
    </>
  );
}

const KB_ROWS = ['1234567890', 'QWERTYUIOP', "ASDFGHJKL'", 'ZXCVBNM&-'];
function SearchKeyboard() {
  const t = kbText.value;
  const close = () => (kbOpen.value = false);
  const go = (q) => { const v = (q ?? kbText.peek()).trim(); kbOpen.value = false; if (v) { libTab.value = 'search'; runSearch(v); } };
  const key = (c) => (kbText.value = (kbText.peek() + c).slice(0, 80));
  const del = () => (kbText.value = kbText.peek().slice(0, -1));
  // a physical keyboard (Surface, iPad keyboard case) types too
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') { e.preventDefault(); go(); } else if (e.key === 'Escape') close();
      else if (e.key === 'Backspace') { e.preventDefault(); del(); } else if (e.key.length === 1) { e.preventDefault(); key(e.key.toUpperCase()); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <div class="kb-ov" role="dialog" aria-label="Search keyboard">
      <SecHead title="SEARCH MUSIC" tone="peach" />
      <div class="kb-q"><div class="kb-field"><small>QUERY</small><b>{t}</b><i class="kb-cur" /></div><button class="kb-k kb-dk" onClick={() => (kbText.value = '')}>CLEAR</button></div>
      {recent.value.length > 0 && <div class="kb-rec"><span>RECENT</span>{recent.value.slice(0, 6).map((q) => <button onClick={() => go(q)}>{q}</button>)}</div>}
      <div class="kb-keys">
        {KB_ROWS.map((r, i) => [...r].map((c) => <button class="kb-k" data-sfx="tap" data-num={i === 0 ? '' : undefined} onClick={() => key(c)}>{c}</button>))}
        <button class="kb-k kb-dk" onClick={del}>DEL</button>
        <button class="kb-k kb-dk kb-w2" data-sfx="nav" onClick={close}>CANCEL</button>
        <button class="kb-k kb-w5" onClick={() => key(' ')}>SPACE</button>
        <button class="kb-k kb-go kb-w3" data-sfx="command" disabled={!t.trim()} onClick={() => go()}>SEARCH</button>
      </div>
    </div>
  );
}

/* ---------- lights ---------- */
const HUES = [
  ['AMBER', [32, 95]], ['RED', [0, 100]], ['ROSE', [330, 75]], ['VIOLET', [275, 80]],
  ['BLUE', [222, 90]], ['TEAL', [180, 85]], ['GREEN', [125, 75]],
];
const TEMPS = [['CANDLE', 2200], ['WARM', 2700], ['NEUTRAL', 4000], ['DAY', 6500]];

const zoneSel = {};
function zoneSig(R) { return (zoneSel[R.key] ??= signal(0)); }
function defaultZone(R) { return R.zones ? { label: R.zones[0][0], id: R.zones[0][1], members: R.zones[0][2] } : { label: R.lightLabel ?? 'ALL LIGHTS', id: R.lights, members: R.lightMembers }; }
function currentZone(R) { if (!R.zones) return defaultZone(R); const z = R.zones[zoneSig(R).value] ?? R.zones[0]; return { label: z[0], id: z[1], members: z[2] }; }
function useLights(zone) {
  const R = useRoom();
  const Z = zone ?? defaultZone(R);
  const { st, missing, offline } = useEnt(Z.id);
  const a = st?.attributes ?? {};
  const on = st?.state === 'on';
  const pct = a.brightness != null ? Math.round(a.brightness / 2.55) : on ? 100 : 0;
  const members = Z.members.map((m) => [m, ent(m).value]);
  const modes = a.supported_color_modes ?? [];
  return {
    label: Z.label, modes,
    canDim: !(modes.length === 1 && modes[0] === 'onoff'),
    canCt: modes.includes('color_temp'),
    canColor: modes.some((m) => ['xy', 'hs', 'rgb', 'rgbw', 'rgbww'].includes(m)),
    id: Z.id, st, missing, offline, a, on, pct, members,
    online: members.filter(([, s]) => s && !UNAVAIL.has(s.state)).length,
    active: members.filter(([, s]) => s?.state === 'on').length,
  };
}

function LightCore({ L, size = 'lg' }) {
  const { a, on, pct, offline, id } = L;
  const rgb = a.rgb_color;
  return (
    <>
      <div class="light-top">
        <Block size={size} label={L.label} sub={on ? (L.canDim ? `ON • ${pct}%` : 'ON') : offline ? 'OFFLINE' : 'OFF'} tag={code(id)} tone={offline ? 'na' : on ? 'on' : 'off'} disabled={offline} busy={isPending(id)} onPress={() => call('light', 'toggle', {}, id)} />
        <div class="light-read">
          <div class="out" style={{ '--out': on && rgb ? `rgb(${rgb.join(',')})` : 'var(--bl-hull)' }}><span>OUTPUT</span></div>
          <div class="read-n"><b>{L.active}</b> ACTIVE</div>
          {L.members.length > 0 && <div class="read-n"><b>{L.online}</b>/{L.members.length} ONLINE</div>}
          <div class="read-n">{a.color_mode === 'color_temp' && a.color_temp_kelvin ? `${a.color_temp_kelvin} K` : a.color_mode ? 'COLOR' : '--'}</div>
        </div>
      </div>
      {L.canDim && <Slider label="INTENSITY" value={on ? pct : 0} min={1} max={100} fmt={(v) => `${v}%`} disabled={offline} onCommit={(v) => call('light', 'turn_on', { brightness_pct: v }, id)} />}
    </>
  );
}

/* Main-page light control without readouts or slider (detail lives on ILLUMINATION). */
function LightCompact() {
  const L = useLights();
  if (L.missing) return <section class="panel"><SecHead title="ILLUMINATION" tone="tan" /><Missing id={L.id} label={L.label} /></section>;
  return (
    <section class="panel">
      <SecHead title="ILLUMINATION" tone="tan" />
      <Block label={L.label} sub={L.on ? (L.canDim ? `ON • ${L.pct}%` : 'ON') : L.offline ? 'OFFLINE' : 'OFF'} tag={code(L.id)} tone={L.offline ? 'na' : L.on ? 'on' : 'off'} disabled={L.offline} busy={isPending(L.id)} onPress={() => call('light', 'toggle', {}, L.id)} />
    </section>
  );
}
/* Placeholder for future house-wide controls. */
function SpareBlock({ n }) {
  return <Block label="UNASSIGNED" sub="RESERVED" tag={`SP-${pad(n)}`} tone="spare" disabled sound="none" />;
}

function LightSummary() {
  const L = useLights();
  return (
    <section class="panel">
      <SecHead title="ILLUMINATION" tone="tan" />
      {L.missing ? <Missing id={L.id} label="ALL LIGHTS" /> : <LightCore L={L} />}
    </section>
  );
}

function ZoneList() {
  const R = useRoom(); const sel = zoneSig(R);
  return (
    <div class="zones">
      {R.zones.map(([l, id], i) => {
        const s = ent(id).value; const na = !s || UNAVAIL.has(s.state);
        const pct = s?.attributes?.brightness != null ? Math.round(s.attributes.brightness / 2.55) : null;
        return (
          <button class="zone" data-sfx="nav" data-sel={sel.value === i ? '' : undefined} data-tone={na ? 'na' : s.state === 'on' ? 'on' : 'off'} onClick={() => (sel.value = i)}>
            <span class="zone-n">{l}</span><span class="zone-s">{na ? 'OFFLINE' : s.state === 'on' ? (pct != null ? `${pct}%` : 'ON') : 'OFF'}</span>
          </button>
        );
      })}
    </div>
  );
}

function IlluminationPage() {
  const R = useRoom();
  const L = useLights(currentZone(R));
  if (L.missing) return <div class="page"><section class="panel"><SecHead title="ILLUMINATION" /><Missing id={L.id} label="ALL LIGHTS" /></section></div>;
  const { a, on, offline, id } = L;
  const ctSel = a.color_mode === 'color_temp' ? a.color_temp_kelvin : null;
  const hsSel = a.color_mode !== 'color_temp' ? a.hs_color : null;
  return (
    <div class={`page ${R.zones ? 'page-ill3' : 'page-2'}`}>
      {R.zones && <section class="panel"><SecHead title="ZONES" tone="peach" /><ZoneList /></section>}
      <section class="panel">
        <SecHead title={R.zones ? L.label : 'ILLUMINATION'} tone="tan" />
        <LightCore L={L} />
        {L.canCt && <Slider label="KELVIN" value={on && a.color_mode === 'color_temp' ? a.color_temp_kelvin : null} min={a.min_color_temp_kelvin ?? 2000} max={a.max_color_temp_kelvin ?? 6500} step={50} fmt={(v) => `${v}`} tone="peach" disabled={offline} onCommit={(v) => call('light', 'turn_on', { color_temp_kelvin: v }, id)} />}
        {L.members.length > 0 && <SecHead title="UNITS" tone="peach" />}
        <div class="members">
          {L.members.map(([m, s]) => {
            const off = !s || UNAVAIL.has(s.state);
            return (
              <button class="mem" data-tone={off ? 'na' : s.state === 'on' ? 'on' : 'off'} data-busy={isPending(m) ? '' : undefined} disabled={off} onClick={() => call('light', 'toggle', {}, m)}>
                <span class="mem-c">{code(m)}</span>
                <span class="mem-n">{(s?.attributes.friendly_name ?? m.split('.')[1]).replace(/^Primary - /, '')}</span>
                <span class="mem-s">{off ? 'OFFLINE' : s.state === 'on' ? `${Math.round((s.attributes.brightness ?? 0) / 2.55)}%` : 'OFF'}</span>
              </button>
            );
          })}
        </div>
      </section>
      <section class="panel">
        <SecHead title="SCENES" tone="tan" />
        <div class="grid4">
          {R.lightScenes.map(([l, sid]) => <PressBlock size="sm" id={sid} label={l} />)}
        </div>
        {L.canCt && <SecHead title="COLOR TEMPERATURE" tone="peach" />}
        {L.canCt && <div class="chips chips-4">
          {TEMPS.map(([l, k]) => <Pill label={l} selected={on && ctSel && Math.abs(ctSel - k) < 75} disabled={offline} swatch={`var(--ct-${k})`} onPress={() => call('light', 'turn_on', { color_temp_kelvin: k }, id)} />)}
        </div>}
        {L.canColor && <SecHead title="SPECTRUM" tone="violet" />}
        {L.canColor && <div class="chips">
          {HUES.map(([l, hs]) => <Pill label={l} selected={on && hsSel && Math.abs(hsSel[0] - hs[0]) < 6 && Math.abs(hsSel[1] - hs[1]) < 8} disabled={offline} swatch={`hsl(${hs[0]} ${hs[1]}% 55%)`} onPress={() => call('light', 'turn_on', { hs_color: hs }, id)} />)}
        </div>}
      </section>
    </div>
  );
}

/* ---------- blinds / fan / climate ---------- */
/** Blinds as one unit: the group entity when the room has one, otherwise the aggregate of the online members. */
function useBlinds() {
  const R = useRoom(); const B = R.blinds;
  if (!B) return { id: null, missing: true, offline: true, members: [], pos: 0 };
  const members = B.members.map(([l, id]) => [l, id, ent(id).value]);
  const live = members.filter(([, , s]) => s && !UNAVAIL.has(s.state));
  if (B.group) {
    const g = useEnt(B.group);
    return { id: B.group, targets: undefined, missing: g.missing, offline: g.offline, state: g.st?.state ?? '--', pos: g.st?.attributes.current_position ?? 0, members };
  }
  const pos = live.length ? Math.round(live.reduce((t, [, , s]) => t + (s.attributes.current_position ?? (s.state === 'open' ? 100 : 0)), 0) / live.length) : 0;
  return { id: `blinds.${R.key}`, targets: live.map(([, id]) => id), missing: false, offline: live.length === 0, state: live.some(([, , s]) => s.state === 'open') ? 'open' : 'closed', pos, members };
}
function coverCall(b, service, data = {}) { call('cover', service, data, b.id, b.targets); }

function BlindsBlock({ size }) {
  const b = useBlinds();
  if (b.missing) return <Missing id={b.id} label="BLINDS" />;
  const toggle = () => (b.targets ? coverCall(b, b.pos > 0 ? 'close_cover' : 'open_cover') : coverCall(b, 'toggle'));
  return <Block size={size} label="BLINDS" sub={b.offline ? 'OFFLINE' : `${b.state} • ${b.pos}%`} tag={code(b.id)} tone={b.offline ? 'na' : b.pos > 0 ? 'on' : 'off'} disabled={b.offline} busy={isPending(b.id)} onPress={toggle} />;
}
function FanBlock({ size }) {
  const R = useRoom();
  const f = useEnt(R.fan);
  return <Block size={size} label="FAN" sub={f.missing ? 'NOT FOUND' : f.offline ? 'OFFLINE' : f.st.state} tag={code(R.fan)} tone={f.offline ? 'na' : f.st?.state === 'on' ? 'on' : 'off'} disabled={f.offline} busy={isPending(R.fan)} onPress={() => call('fan', 'toggle', {}, R.fan)} />;
}
function ClimateBlock({ size }) {
  const R = useRoom();
  const { st, offline, missing } = useEnt(R.hvac);
  const a = st?.attributes ?? {};
  return <Block size={size} sound="nav" label="CLIMATE" sub={missing ? 'NOT FOUND' : offline ? 'OFFLINE' : `${a.current_temperature ?? '--'}° • ${MODE_L[st.state] ?? st.state}`} tag={code(R.hvac)} tone={offline ? 'na' : st.state === 'off' ? 'off' : 'on'} onPress={() => go(R, R.pages.includes('ENVIRON') ? 'ENVIRON' : 'CLIMATE')} />;
}

function EnvSummary() {
  const R = useRoom();
  return (
    <section class="panel">
      <SecHead title="ENVIRONMENT" tone="peach" />
      <div class="row row-fill"><BlindsBlock size="xl" />{R.fan ? <FanBlock size="xl" /> : <ClimateBlock size="xl" />}</div>
    </section>
  );
}

function ClimatePage() {
  const R = useRoom(); const W = R.weather;
  const w = W ? ent(W.entity).value : null;
  const hv = W?.hvacOutdoor ? ent(W.hvacOutdoor).value : null;
  const fc = R.climateForecast;
  const { dew } = useNow(W ?? {}, w?.attributes ?? {});
  const stats = [
    <Stat k="HVAC SENSOR" v={hv && !UNAVAIL.has(hv.state) ? `${Math.round(+hv.state)}°` : '--'} color={hv ? tempColor(+hv.state) : null} />,
    <Stat k="HUMIDITY" v={`${w?.attributes?.humidity ?? '--'}%`} color={humColor(w?.attributes?.humidity)} meter={humMeter(w?.attributes?.humidity)} />,
    <Stat k="DEW POINT" v={`${dew ?? '--'}°`} color={tempColor(dew)} />,
    <Stat k="WIND" v={`${w?.attributes?.wind_speed != null ? Math.round(w.attributes.wind_speed) : '--'} ${w?.attributes?.wind_speed_unit ?? ''}`} />,
  ];
  return (
    <div class={fc ? 'page page-2 page-climfc' : 'page page-2'}>
      <ClimatePanel />
      {W && (
        <section class="panel">
          <SecHead title="OUTDOOR" tone="violet" />
          <WxBig W={W} a={w?.attributes ?? {}} cond={w?.state} small={fc} />
          <div class={fc ? 'wx-grid wx-compact' : 'wx-grid'}>{stats}</div>
          {fc && <>
            <SecHead title="NEXT HOURS" tone="peach" />
            <HourStrip W={W} n={8} />
            <SecHead title="FORECAST" tone="tan" />
            <DayList W={W} n={6} />
          </>}
        </section>
      )}
    </div>
  );
}

function EnvironPage() {
  const R = useRoom();
  if (!R.blinds) return <ClimatePage />;
  const b = useBlinds();
  return (
    <div class="page page-2">
      <section class="panel">
        <SecHead title="BLINDS" tone="peach" />
        <BlindsBlock size="lg" />
        <div class="pg pg-3">
          <Pill label="OPEN" disabled={b.offline} onPress={() => coverCall(b, 'open_cover')} />
          <Pill label="STOP" tone="hot" disabled={b.offline} onPress={() => coverCall(b, 'stop_cover')} />
          <Pill label="CLOSE" disabled={b.offline} onPress={() => coverCall(b, 'close_cover')} />
        </div>
        <Slider label="POSITION" value={b.pos} fmt={(v) => `${v}%`} tone="peach" disabled={b.offline} onCommit={(v) => coverCall(b, 'set_cover_position', { position: v })} />
        <div class="read-row">
          {b.members.map(([l, , s]) => {
            const na = !s || UNAVAIL.has(s.state);
            return <div class="read-n" data-na={na ? '' : undefined}><b>{na ? 'OFFLINE' : `${s.attributes.current_position ?? (s.state === 'open' ? 100 : 0)}%`}</b> {l}</div>;
          })}
        </div>
        {R.fan && <><SecHead title="AIR" tone="violet" /><FanBlock size="lg" /></>}
      </section>
      <ClimatePanel />
    </div>
  );
}

function PressBlock({ id, label, size = 'md', tone = 'off', prefix }) {
  const { st, missing, offline } = useEnt(id);
  const [flash, fire] = useFlash();
  const domain = id.split('.')[0];
  const base = missing ? 'NOT FOUND' : offline ? 'OFFLINE' : st ? (st.state === 'unknown' ? 'READY' : `LAST ${stamp(st.state)}`) : 'AWAITING';
  const sub = prefix && !missing && !offline ? `${prefix} • ${base}` : base;
  const press = () => { fire(); domain === 'scene' ? call('scene', 'turn_on', {}, id) : call('input_button', 'press', {}, id); };
  return <Block sound="command" size={size} label={label} sub={sub} tag={code(id)} tone={missing || (offline && domain !== 'scene') ? 'na' : tone} flash={flash.value} disabled={missing || (offline && domain !== 'scene')} busy={isPending(id)} onPress={press} />;
}
function ToggleBlock({ id, label, sub, size }) {
  const n = useEnt(id);
  const domain = id.split('.')[0];
  return <Block size={size} label={label} sub={n.missing ? 'NOT FOUND' : n.offline ? 'OFFLINE' : `${sub ? `${sub} • ` : ''}${n.st.state}`} tag={code(id)} tone={n.offline ? 'na' : n.st?.state === 'on' ? 'on' : 'off'} disabled={n.offline} busy={isPending(id)} onPress={() => call(domain, 'toggle', {}, id)} />;
}

/* Goodbye: runs the same automation as the stairway keypad (2-minute delay, then Away Mode on).
   Countdown is read from the automation's running state, so it shows wherever Goodbye was started. */
const GOODBYE_DELAY = 120;
function GoodbyeBlock({ id, away }) {
  const a = useEnt(id);
  const aw = useEnt(away);
  clock.value; // re-render every second for the countdown
  const running = (a.st?.attributes?.current ?? 0) > 0;
  const lt = a.st?.attributes?.last_triggered;
  const left = running && lt ? Math.max(0, GOODBYE_DELAY - Math.floor((Date.now() - Date.parse(lt)) / 1000)) : null;
  const isAway = aw.st?.state === 'on';
  const press = async () => {
    if (running) { sfx('off'); await call('automation', 'turn_off', { stop_actions: true }, id); await call('automation', 'turn_on', {}, id); return; }
    if (isAway) { sfx('on'); call('input_boolean', 'turn_off', {}, away); return; }
    sfx('command'); call('automation', 'trigger', { skip_condition: true }, id);
  };
  const sub = a.missing ? 'NOT FOUND' : running ? `AWAY IN ${Math.floor(left / 60)}:${pad(left % 60)} • TAP TO CANCEL` : isAway ? 'AWAY • TAP TO RETURN' : 'AWAY IN 2 MIN';
  return <Block sound="none" label={running ? 'DEPARTING' : isAway ? 'AWAY' : 'GOODBYE'} sub={sub} tag={code(id)} tone={a.missing || a.offline ? 'na' : running ? 'alert' : isAway ? 'on' : 'off'} disabled={a.missing} busy={isPending(id)} onPress={press} />;
}

function ActionBlock({ c }) {
  const [flash, fire] = useFlash();
  const offline = c.targets.every((t) => { const s = ent(t).value; return !s || UNAVAIL.has(s.state); });
  return <Block sound="command" label={c.label} sub={offline ? 'OFFLINE' : c.sub} tag={code(c.label)} tone={offline ? 'na' : c.tone ?? 'off'} flash={flash.value} disabled={offline} busy={isPending(c.id)} onPress={() => { fire(); call(c.domain, c.service, c.data, c.id, c.targets.filter((t) => !UNAVAIL.has(ent(t).value?.state))); }} />;
}

function CommandsPage() {
  const R = useRoom();
  const n = R.commands.length;
  const cols = n <= 2 ? n : n === 4 ? 2 : 3;
  const blocks = R.commands.map((c) => (
    c.kind === 'toggle' ? <ToggleBlock id={c.id} label={c.label} sub={c.sub} />
    : c.kind === 'goodbye' ? <GoodbyeBlock id={c.id} away={c.away} />
    : c.kind === 'action' ? <ActionBlock c={c} />
    : <PressBlock id={c.id} label={c.label} tone={c.tone} />
  ));
  if (R.vehicleMode === 'night') {
    return (
      <div class="page page-cmdv">
        <div class="cmd-grid" style={{ '--cols': cols, '--rows': Math.ceil(n / cols) }}>{blocks}</div>
        <section class="panel"><SecHead title="VEHICLES" tone="violet" /><VehicleSummary vehicles={R.vehicles} mode="night" /></section>
        <VehicleOverlay vehicles={R.vehicles} />
      </div>
    );
  }
  return <div class="page page-cmd" style={{ '--cols': cols, '--rows': Math.ceil(n / cols) }}>{blocks}</div>;
}

const MODE_L = { off: 'OFF', fan_only: 'FAN', cool: 'COOL', heat: 'HEAT', heat_cool: 'AUTO', auto: 'AUTO', dry: 'DRY' };
function ClimatePanel() {
  const R = useRoom(); const H = R.hvac;
  const { st, missing, offline } = useEnt(H);
  if (missing || !st) return <section class="panel"><SecHead title="CLIMATE" tone="tan" />{missing ? <Missing id={H} label="HVAC" /> : null}</section>;
  const a = st.attributes;
  const mode = st.state;
  const step = (k, d) => call('climate', 'set_temperature', k === 'temperature' ? { temperature: (a.temperature ?? 70) + d } : { target_temp_low: (a.target_temp_low ?? 66) + (k === 'target_temp_low' ? d : 0), target_temp_high: (a.target_temp_high ?? 74) + (k === 'target_temp_high' ? d : 0) }, H);
  const setpt = (k, label) => (
    <div class="setpt">
      <Pill label="−" disabled={offline} onPress={() => step(k, -1)} />
      <div class="setpt-v"><span>{label}</span><b>{a[k] ?? '--'}°</b></div>
      <Pill label="+" disabled={offline} onPress={() => step(k, 1)} />
    </div>
  );
  const modes = a.hvac_modes ?? [];
  const presets = (a.preset_modes ?? []).filter((m) => m !== 'resume');
  return (
    <section class="panel">
      <SecHead title="CLIMATE" tone="tan" />
      <div class="clim">
        <div class="clim-t" style={{ color: tempColor(a.current_temperature) ?? undefined }}>{a.current_temperature ?? '--'}<sup>°F</sup></div>
        <div class="clim-side">
          <div class="read-n"><b style={{ color: humColor(a.current_humidity) ?? undefined }}>{a.current_humidity ?? '--'}%</b> HUMIDITY</div>
          {a.current_humidity != null && humMeter(a.current_humidity)}
          <div class="read-n"><b>{(a.hvac_action ?? mode).replace('_', ' ')}</b> ACTION</div>
          {(mode === 'heat' || mode === 'cool') && <div class="read-n"><b>{a.temperature ?? '--'}°</b> TARGET</div>}
        </div>
      </div>
      <div class="lbl">MODE</div>
      <div class="pg" style={{ '--n': modes.length || 1 }}>
        {modes.map((m) => <Pill label={MODE_L[m] ?? m} selected={mode === m} tone={m === 'off' ? 'hot' : undefined} disabled={offline} onPress={() => call('climate', 'set_hvac_mode', { hvac_mode: m }, H)} />)}
      </div>
      {(mode === 'heat' || mode === 'cool') && <div class="pg pg-1">{setpt('temperature', 'TARGET')}</div>}
      {mode === 'heat_cool' && <div class="pg pg-2">{setpt('target_temp_low', 'HEAT TO')}{setpt('target_temp_high', 'COOL TO')}</div>}
      {a.fan_modes && <>
        <div class="lbl">FAN</div>
        <div class="pg" style={{ '--n': a.fan_modes.length }}>
          {a.fan_modes.map((m) => <Pill label={m} selected={a.fan_mode === m} disabled={offline} onPress={() => call('climate', 'set_fan_mode', { fan_mode: m }, H)} />)}
        </div>
      </>}
      {presets.length > 0 && <>
        <div class="lbl">PRESET</div>
        <div class="pg pg-3">
          {presets.map((m) => <Pill label={m} selected={a.preset_mode === m} disabled={offline} onPress={() => call('climate', 'set_preset_mode', { preset_mode: m }, H)} />)}
        </div>
      </>}
    </section>
  );
}

/* ---------- security ---------- */
function useCameraSrc(id = SHARED.camera) {
  const cam = ent(id).value;
  const pic = cam?.attributes?.entity_picture;
  return pic && hassUrl() ? `${hassUrl()}${pic.replace('/api/camera_proxy/', '/api/camera_proxy_stream/')}` : null;
}

const garageArmed = signal(false);
let armTimer;
function GarageBlock({ size = 'lg' }) {
  const G = SHARED.garage;
  const g = useEnt(G);
  const obs = ent(SHARED.garageObs).value?.state === 'on';
  if (g.missing) return <Missing id={G} label="GARAGE DOOR" />;
  const s = g.st?.state ?? '--';
  const moving = s === 'opening' || s === 'closing';
  const press = () => {
    if (!garageArmed.peek()) { garageArmed.value = true; sfx('arm'); clearTimeout(armTimer); armTimer = setTimeout(() => (garageArmed.value = false), 4000); return; }
    garageArmed.value = false; clearTimeout(armTimer); sfx('dooralarm');
    call('cover', 'toggle', {}, G);
  };
  const action = s === 'closed' ? 'OPEN' : s === 'open' ? 'CLOSE' : moving ? 'STOP' : 'TOGGLE';
  return (
    <Block size={size} sound="none"
      label={garageArmed.value ? `CONFIRM ${action}` : 'GARAGE DOOR'}
      sub={g.offline ? 'OFFLINE' : `${s}${obs ? ' • OBSTRUCTION' : ''}${garageArmed.value ? '' : ` • TAP TWICE TO ${action}`}`}
      tag={code(G)}
      tone={g.offline ? 'na' : s === 'closed' && !obs ? 'off' : 'open'}
      flash={garageArmed.value}
      disabled={g.offline} busy={isPending(G)} onPress={press} />
  );
}

function SecurityPage() {
  const src = useCameraSrc();
  const cam = ent(SHARED.camera).value;
  const doors = SHARED.doors.map((d) => [d, ent(d).value]);
  const open = doors.filter(([, s]) => s?.state === 'on').length;
  return (
    <div class="page page-sec">
      <section class="panel">
        <SecHead title="FRONT DOOR" tone="peach" />
        {src ? <img class="sec-cam" src={src} alt="Front door camera" /> : <div class="sec-cam alert-nocam"><span>NO FEED</span><small>{link.value.mode === 'sim' ? 'SIMULATION • CAMERA REQUIRES LIVE LINK' : 'CAMERA UNAVAILABLE'}</small></div>}
        <div class="read-row"><div class="read-n"><b>{cam?.state ?? '--'}</b> {cam?.attributes?.friendly_name ?? 'CAMERA'}</div></div>
      </section>
      <section class="panel">
        <SecHead title={open ? `${open} OPEN` : 'ALL SECURE'} tone={open ? 'red' : 'tan'} />
        <div class="doors">
          {doors.map(([d, s]) => {
            const na = !s || UNAVAIL.has(s.state);
            const isOpen = s?.state === 'on';
            return (
              <div class="door" data-tone={na ? 'na' : isOpen ? 'open' : 'shut'}>
                <span class="door-c">{code(d)}</span>
                <span class="door-n">{s?.attributes.friendly_name ?? d}</span>
                <span class="door-s">{na ? 'OFFLINE' : isOpen ? 'OPEN' : 'SECURE'}</span>
              </div>
            );
          })}
        </div>
        <SecHead title="GARAGE" tone="violet" />
        <GarageBlock />
      </section>
    </div>
  );
}

/* ---------- visitor alert ---------- */
const dismissedAt = signal(null);
function Visitor() {
  const v = ent(SHARED.visitor).value;
  const cam = ent(SHARED.camera).value;
  const active = v?.state === 'on';
  const show = active && dismissedAt.value !== v.last_changed;
  useEffect(() => { if (show) sfx('alert'); }, [show, v?.last_changed]);
  if (!show) return null;
  const src = useCameraSrc();
  return (
    <div class="alert" role="alert">
      <div class="alert-frame">
        <div class="alert-hd">
          <span class="alert-cap" />
          <span class="alert-bar" />
          <h2 class="alert-t">VISITOR • FRONT DOOR</h2>
          <span class="alert-end" />
        </div>
        <div class="alert-body">
          {src ? <img class="alert-cam" src={src} alt="Front door camera" /> : <div class="alert-nocam"><span>NO FEED</span><small>{link.value.mode === 'sim' ? 'SIMULATION • CAMERA REQUIRES LIVE LINK' : 'CAMERA UNAVAILABLE'}</small></div>}
          <div class="alert-side">
            <div class="read-n"><b>{stamp(v.last_changed)}</b> DETECTED</div>
            <div class="read-n"><b>{code(SHARED.camera, 6)}</b> {cam?.attributes?.friendly_name ?? 'DOORBELL'}</div>
            <Block label="ACKNOWLEDGE" tone="alert" sound="tap" onPress={() => (dismissedAt.value = v.last_changed)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- sound library ---------- */
const soundsOpen = signal(false); // true = SETTINGS panel open
const settingsTab = signal('displays');
const deployed = signal(null);
async function loadDeployed() {
  if (link.peek().mode === 'sim') { deployed.value = { sim: true }; return; }
  try { const r = await fetch('/local/cabin-lcars-version.json', { cache: 'no-store' }); deployed.value = r.ok ? await r.json() : { err: `HTTP ${r.status}` }; }
  catch (e) { deployed.value = { err: 'UNREACHABLE' }; }
}
/** Reloads this page when a reload helper is pressed after load (deploy automation or SETTINGS). */
function ReloadWatch() {
  const R = useRoom();
  const ids = SHARED.reload.filter((id) => id.endsWith('_all') || id.endsWith(`_${R.key}`));
  const base = useRef({});
  const vals = ids.map((id) => ent(id).value?.state);
  useEffect(() => {
    ids.forEach((id, i) => {
      const v = vals[i];
      if (!v || UNAVAIL.has(v)) return;
      if (base.current[id] === undefined) { base.current[id] = v; return; }
      if (v !== base.current[id]) { base.current[id] = v; setTimeout(() => location.reload(), 500 + Math.random() * 3000); }
    });
  }, vals);
  return null;
}
function SettingsPanel() {
  useEffect(() => { if (soundsOpen.value) loadDeployed(); }, [soundsOpen.value]);
  if (!soundsOpen.value) return null;
  const tab = settingsTab.value;
  return (
    <div class="alert" onClick={(e) => e.target === e.currentTarget && (soundsOpen.value = false)}>
      <div class="linkp sndp setp">
        <div class="sh"><span class="sh-cap" style={{ background: 'var(--bl-violet)' }} /><span class="sh-bar" /><h2 class="sh-t">SETTINGS</h2><span class="sh-end" style={{ background: 'var(--bl-violet)' }} /></div>
        <div class="set-tabs">
          {[['displays', 'DISPLAYS'], ['sounds', 'SOUND LIBRARY']].map(([k, l]) => <button class="set-tab" data-on={tab === k ? '' : undefined} onClick={() => (settingsTab.value = k)}>{l}</button>)}
        </div>
        {tab === 'displays' ? <DisplaysTab /> : <SoundsTab />}
        <div class="row"><Pill label="CLOSE" onPress={() => (soundsOpen.value = false)} /></div>
      </div>
    </div>
  );
}
function DisplaysTab() {
  const msg = useSignal(null);
  const D = deployed.value;
  const [allId, kitId] = SHARED.reload;
  const last = (id) => { const s = ent(id).value; return s && !UNAVAIL.has(s.state) ? `LAST ${stamp(s.state)}` : s ? 'HELPER OFFLINE' : 'HELPER NOT FOUND'; };
  const press = async (id, label) => { msg.value = null; try { await call('input_button', 'press', {}, id); msg.value = { ok: true, t: label }; } catch (e) { msg.value = { ok: false, t: e?.message ?? 'FAILED' }; sfx('fault'); } };
  const dep = !D ? 'CHECKING' : D.sim ? 'SIMULATION' : D.err ? `UNKNOWN • ${D.err}` : `${UP(D.build)} • ${D.sha}`;
  const stale = D && D.build && D.build !== BUILD;
  return (
    <div class="snd-list">
      <div class="snd-row set-row" data-custom={stale ? '' : undefined}>
        <div class="snd-l"><b>THIS CONSOLE</b><span>RUNNING {UP(BUILD)} • DEPLOYED {dep}{stale ? ' • RELOAD TO UPDATE' : ''}</span></div>
        <Pill label="RELOAD" onPress={() => setTimeout(() => location.reload(), 150)} />
      </div>
      <div class="snd-row set-row">
        <div class="snd-l"><b>KITCHEN DISPLAY</b><span>{last(kitId)}</span></div>
        <Pill label="RELOAD" tone="hot" onPress={() => press(kitId, 'KITCHEN DISPLAY RELOAD SENT')} />
      </div>
      <div class="snd-row set-row">
        <div class="snd-l"><b>ALL CONSOLES</b><span>{last(allId)} • INCLUDES THIS ONE</span></div>
        <Pill label="RELOAD ALL" tone="hot" onPress={() => press(allId, 'RELOAD SENT TO ALL CONSOLES')} />
      </div>
      {msg.value && <p class="note" data-bad={msg.value.ok ? undefined : ''}>{msg.value.t}</p>}
      <p class="note">EVERY CONSOLE RELOADS ITSELF AFTER EACH SUCCESSFUL DEPLOY • A RELOAD ALSO LOADS THE LATEST DEPLOYED BUILD</p>
    </div>
  );
}
function SoundsTab() {
  const msg = useSignal(null);
  const busy = useSignal(null);
  const target = useSignal(null);
  const fileRef = useRef();
  useEffect(() => { refreshSounds(); }, []);
  const C = custom.value; const sync = soundSync.value;
  const run = async (kind, label, fn) => {
    busy.value = kind; msg.value = null;
    try { await fn(); msg.value = { ok: true, t: `${kind.toUpperCase()} • ${label}` }; }
    catch (err) { msg.value = { ok: false, t: `${kind.toUpperCase()} • ${err?.message ?? 'FAILED'}` }; sfx('fault'); }
    finally { busy.value = null; }
  };
  const pick = (kind) => { target.value = kind; msg.value = null; fileRef.current.value = ''; fileRef.current.click(); };
  const onFile = (e) => {
    const f = e.currentTarget.files?.[0]; const kind = target.peek(); if (!f || !kind) return;
    run(kind, `UPLOADED ${f.name} • SHARED TO ALL TABLETS`, async () => { await setCustomSound(kind, f); previewSound(kind); });
  };
  return (
    <>
        <div class="snd-list">
          {SOUND_SLOTS.map(([k, l, d]) => (
            <div class="snd-row" data-custom={C[k] ? '' : undefined} data-busy={busy.value === k ? '' : undefined}>
              <div class="snd-l"><b>{l}</b><span>{d}</span></div>
              <div class="snd-f">{busy.value === k ? 'TRANSFERRING' : C[k] ? `SHARED FILE • ${stamp(C[k].at / 1000)}` : 'BUILT-IN TONE'}</div>
              <Pill label="TEST" sound="none" onPress={() => previewSound(k)} />
              <Pill label="UPLOAD" tone="hot" sound="none" disabled={!!busy.value} onPress={() => pick(k)} />
              <Pill label="RESET" sound="none" disabled={!C[k] || !!busy.value} onPress={() => run(k, 'RESET TO BUILT-IN TONE', () => clearCustomSound(k))} />
            </div>
          ))}
        </div>
        {msg.value && <p class="note" data-bad={msg.value.ok ? undefined : ''}>{msg.value.t}</p>}
        {sync.state === 'error' && <p class="note" data-bad="">SYNC FAULT • {sync.msg}</p>}
        <p class="note">SHARED BY ALL TABLETS VIA HOME ASSISTANT MEDIA • UPLOAD/RESET NEED AN ADMIN LOGIN • AUDIO FILES UP TO 2 MB AND {MAX_SECONDS} S • LEVELS AUTO-MATCHED • OTHER TABLETS UPDATE WITHIN 5 MIN</p>
        <div class="row">
          <Pill label="RESYNC" sound="none" disabled={sync.state === 'syncing'} onPress={() => refreshSounds()} />
        </div>
    </>
  );
}

/* ---------- link panel (standalone only) ---------- */
const linkOpen = signal(false);
function LinkPanel() {
  const url = useSignal(hassUrl() || (location.protocol.startsWith('http') && !location.hostname.endsWith('claude.ai') ? location.origin : 'http://homeassistant.local:8123'));
  const tok = useSignal('');
  if (!linkOpen.value) return null;
  return (
    <div class="alert" onClick={(e) => e.target === e.currentTarget && (linkOpen.value = false)}>
      <div class="linkp">
        <div class="sh"><span class="sh-cap" style={{ background: 'var(--bl-tan)' }} /><span class="sh-bar" /><h2 class="sh-t">HOME ASSISTANT LINK</h2><span class="sh-end" style={{ background: 'var(--bl-tan)' }} /></div>
        <label class="fld"><span>HOME ASSISTANT URL</span><input value={url.value} onInput={(e) => (url.value = e.currentTarget.value)} spellcheck={false} autocapitalize="off" /></label>
        <label class="fld"><span>LONG-LIVED ACCESS TOKEN (OPTIONAL)</span><input type="password" value={tok.value} onInput={(e) => (tok.value = e.currentTarget.value)} placeholder="LEAVE BLANK TO SIGN IN" /></label>
        <div class="row">
          <Pill label="ENGAGE" tone="hot" onPress={() => (tok.value ? saveLongLived(url.value, tok.value) : startOAuth(url.value))} />
          <Pill label="SIMULATE" onPress={() => forgetLink()} />
          <Pill label="CLOSE" onPress={() => (linkOpen.value = false)} />
        </div>
        <p class="note">STATUS: {link.value.mode} {link.value.detail ? `• ${link.value.detail}` : ''}</p>
      </div>
    </div>
  );
}

/* ---------- pages + frame ---------- */
const PAGE_DEF = {
  KITCHEN: ['tan', () => null],
  MAIN: ['peach', MainPage],
  MEDIA: ['violet', MediaPage],
  ILLUMINATION: ['tan', IlluminationPage],
  ENVIRON: ['peach', EnvironPage],
  CLIMATE: ['peach', EnvironPage],
  WEATHER: ['violet', WeatherPage],
  COMMANDS: ['violet', CommandsPage],
  SYSTEMS: ['violet', CommandsPage],
  SCHEDULE: ['peach', SchedulePage],
  SECURITY: ['tan', SecurityPage],
  VEHICLES: ['violet', function VehiclesNav() { const R = useRoom(); return R.vehicleCompact ? <CompactVehiclesPage vehicles={R.vehicles} /> : <VehiclesPage vehicles={R.vehicles} />; }],
};

function StatusPill() {
  const l = link.value;
  const label = { hass: 'LINK ACTIVE', init: 'INITIALIZING', sim: 'SIMULATION', connecting: 'LINKING', live: 'LINK ACTIVE', auth: 'AUTH FAILED', error: 'LINK FAULT' }[l.mode];
  return <button class="status" data-mode={l.mode} onClick={() => l.mode !== 'hass' && (linkOpen.value = true)}>{label}{l.detail && <small>{l.detail}</small>}</button>;
}

function Fault() {
  const f = fault.value;
  useEffect(() => { if (!f) return; sfx('fault'); const t = setTimeout(() => { if (fault.peek() === f) fault.value = null; }, 6000); return () => clearTimeout(t); }, [f]);
  return f ? <span class="fault">FAULT • {f.msg}</span> : null;
}

function SimVisitor() {
  if (link.value.mode !== 'sim') return null;
  const v = ent(SHARED.visitor).value;
  return (
    <button class="nav nav-sim" onClick={() => { const on = v?.state !== 'on'; const t = Date.now() / 1000; ent(SHARED.visitor).value = { ...v, state: on ? 'on' : 'off', last_changed: t, last_updated: t }; }}>
      <span>SIM VISITOR</span>
    </button>
  );
}

function clickSound(e) {
  const b = e.target.closest?.('button');
  if (!b || b.disabled) return;
  const k = b.dataset.sfx;
  if (k === 'none') return;
  sfx(k || (b.getAttribute('aria-pressed') === 'false' ? 'on' : b.getAttribute('aria-pressed') === 'true' ? 'off' : 'tap'));
}

function SoundSync() {
  const mode = link.value.mode;
  useEffect(() => { const api = mediaApi(); if (api && ['hass', 'live', 'sim'].includes(mode)) startSoundSync(api); }, [mode]);
  return null;
}

function Frame() {
  const R = useRoom();
  const pg = pageSig(R).value;
  const P = PAGE_DEF[pg][1];
  return (
    <div class="app" onClickCapture={clickSound}>
      <div class="elbow-t"><span class="elbow-code">{code(`tiny-cabins-${R.key}`, 6)}</span></div>
      <header class="hd">
        <span class="corner-t"><i /></span>
        <span class="hd-bar" />
        <span class="hd-seg" style={{ background: 'var(--bl-tan)', width: '72px' }} />
        <span class="hd-seg hd-code">{pg} • {BUILD}</span>
        <h1 class="hd-t">{R.title}</h1>
        <span class="hd-cap" />
      </header>
      <nav class="side">
        {R.pages.map((l) => (
          <button class="nav" data-sel={pg === l ? '' : undefined} aria-current={pg === l ? 'page' : undefined} style={{ '--nav': `var(--bl-${PAGE_DEF[l][0]})` }} data-sfx="nav" onClick={() => go(R, l)}>
            <span class="nav-c">{code(l)}</span><span class="nav-l">{l}</span>
          </button>
        ))}
        <SimVisitor />
        <span class="side-fill" />
        {link.value.mode !== 'hass' && <button class="nav" style={{ '--nav': 'var(--bl-amber)' }} onClick={() => (linkOpen.value = true)}><span class="nav-c">07-00</span><span class="nav-l">LINK</span></button>}
      </nav>
      <main class="main">
        <P />
        <Visitor />
      </main>
      <div class="elbow-b" />
      <footer class="ft">
        <span class="corner-b"><i /></span>
        <span class="ft-bar" />
        <Fault />
        <button class="status snd" data-sfx="none" data-on={soundOn.value ? '' : undefined} onClick={toggleSound}>{soundOn.value ? 'AUDIO ON' : 'AUDIO OFF'}</button>
        <button class="status sndlib" onClick={() => (soundsOpen.value = true)}>SETTINGS</button>
        <StatusPill />
        <span class="ft-seg" />
        <span class="ft-cap" />
      </footer>
      <LinkPanel />
      <SettingsPanel />
      <ReloadWatch />
      <SoundSync />
      {R.calendar && <EventChirp />}
    </div>
  );
}


/* ===================== KITCHEN DISPLAY (TV kiosk, display only) ===================== */
const calStore = {};
/** Events for several calendars between now+fromH hours and the end of day now+days; refreshed every 5 min. */
function useCals(key, cals, fromH, days) {
  if (!calStore[key]) calStore[key] = signal({ at: 0, items: [], error: null });
  const sig = calStore[key];
  useEffect(() => {
    if (!cals) return;
    const load = async () => {
      try {
        const start = new Date(Date.now() + fromH * 3600e3);
        const end = new Date(); end.setDate(end.getDate() + days); end.setHours(23, 59, 59, 0);
        const all = await Promise.all(cals.map(async ([label, eid, tone, hide]) => {
          const evs = await getEvents(eid, start, end);
          return evs.filter((e) => !(hide && hide.test(e.summary ?? ''))).map((e) => {
            const allDay = !e.start?.dateTime;
            const st = allDay ? new Date(`${e.start.date}T00:00:00`) : new Date(e.start.dateTime);
            const en = allDay ? new Date(`${e.end.date}T00:00:00`) : new Date(e.end.dateTime);
            return { label, tone, summary: (e.summary ?? '').trim(), description: e.description ?? '', s: st, en, allDay };
          });
        }));
        sig.value = { at: Date.now(), items: all.flat().sort((a, b) => a.s - b.s), error: null };
      } catch (e) { sig.value = { ...sig.peek(), at: Date.now(), error: e?.message ?? 'CALENDAR FAULT' }; }
    };
    if (Date.now() - sig.peek().at > 60000) load();
    const t = setInterval(load, 300000);
    return () => clearInterval(t);
  }, [key, link.value.mode]);
  return sig.value;
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function KAgenda({ title, tone, cals, k, days = 2, tall }) {
  const ag = useCals(k, cals, 0, days - 1);
  const now = clock.value.getTime();
  const items = ag.items.filter((x) => x.en.getTime() > now);
  // TODAY always heads the list, so tomorrow's events are never read as today's
  const groups = [{ k: 'TODAY', items: [] }];
  for (const it of items) { const g0 = dayTag(it.s); let g = groups.find((x) => x.k === g0); if (!g) groups.push((g = { k: g0, items: [] })); g.items.push(it); }
  return (
    <section class={tall ? 'panel k-ag k-tall' : 'panel k-ag'}>
      <SecHead title={title} tone={tone} />
      {ag.error && <div class="fault-line">FAULT • {ag.error}</div>}
      {!ag.error && groups.map((g) => (
        <div class="k-day">
          <div class="k-dh">{g.k}</div>
          {!g.items.length && <div class="k-none">NO EVENTS REMAINING TODAY</div>}
          {g.items.map((it) => {
            const ph = evPhase(it, now);
            return (
              <div class="k-ev" data-phase={ph ?? undefined} style={{ '--t': `var(--bl-${it.tone})` }}>
                <span class="k-tm">{it.allDay ? 'ALL DAY' : hm(it.s)}</span>
                <span class="k-sm">{it.summary}</span>
                <span class="k-cal">{ph === 'now' ? `NOW • ${Math.ceil((it.en - now) / 60000)}M LEFT` : ph === 'soon' ? `IN ${Math.max(0, Math.ceil((it.s - now) / 60000))}M` : it.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function KNext({ title, cal }) {
  const ag = useCals(`next:${cal}`, [[title, cal, 'sky', null]], 0, 14);
  const now = clock.value.getTime();
  const it = ag.items.find((x) => x.en.getTime() > now);
  return (
    <div class="k-next">
      <span class="k-next-l">{title}</span>
      {it ? <><b>{dayTag(it.s) === 'TODAY' ? (it.allDay ? 'TODAY' : hm(it.s)) : `${dayTag(it.s).slice(0, 3)} ${it.allDay ? '' : hm(it.s)}`}</b><span class="k-next-t">{it.summary}</span></> : <span class="k-next-t">NOTHING SCHEDULED</span>}
    </div>
  );
}

function KClock({ compact }) {
  const d = clock.value;
  return (
    <div class={compact ? 'k-clock k-clock-c' : 'k-clock'}>
      <div class="k-time">{pad(d.getHours())}<span class="chrono-c">:</span>{pad(d.getMinutes())}</div>
      <div class="k-date"><b>{DAYS[d.getDay()]}</b><span>{d.getDate()} {MONTHS[d.getMonth()]} {d.getFullYear()}</span></div>
    </div>
  );
}

function KWeather({ compact }) {
  const R = useRoom(); const W = R.weather;
  const w = ent(W.entity).value; const a = w?.attributes ?? {};
  const fc = useForecast(W.entity, 'daily');
  const today = fc.items[0];
  const { rain } = useNow(W, a);
  const hv = ent(W.hvacOutdoor).value;
  return (
    <div class={compact ? 'k-wx k-wx-c' : 'k-wx'}>
      <WxBig W={W} a={a} cond={w?.state} small={compact} />
      <div class="wx-grid wx-compact">
        <Stat k="HIGH / LOW" v={today ? `${Math.round(today.temperature)}° / ${Math.round(today.templow ?? today.temperature)}°` : '--'} />
        <Stat k="RAIN CHANCE" v={rain != null ? `${rain}%` : '--'} />
        <Stat k="HUMIDITY" v={`${a.humidity ?? '--'}%`} color={humColor(a.humidity)} />
        <Stat k="HVAC OUTDOOR" v={hv && !UNAVAIL.has(hv.state) ? `${Math.round(+hv.state)}°` : '--'} color={hv ? tempColor(+hv.state) : null} />
      </div>
    </div>
  );
}

function KStatus() {
  const R = useRoom();
  const g = ent(SHARED.garage).value;
  const d = ent(R.quick.allDoors).value;
  const gOpen = g && g.state !== 'closed' && !UNAVAIL.has(g.state);
  const dOpen = d?.state === 'on';
  // Name each open door (group members; falls back to the generic line if the members lag the group).
  const openNames = SHARED.doors.filter((x) => ent(x).value?.state === 'on')
    .map((x) => UP((ent(x).value.attributes?.friendly_name ?? x.split('.')[1]).replace(/\s*door$/i, '')));
  return (
    <div class="k-status">
      <div class="k-st" data-tone={!g || UNAVAIL.has(g.state) ? 'na' : gOpen ? 'alert' : 'ok'}><span>GARAGE DOOR</span><b>{g ? UP(g.state) : '--'}</b></div>
      <div class="k-st" data-tone={!d || UNAVAIL.has(d.state) ? 'na' : dOpen ? 'alert' : 'ok'} data-n={dOpen ? Math.min(openNames.length, 3) : undefined}>
        <span>{dOpen ? (openNames.length === 1 ? 'DOOR OPEN' : `${openNames.length || ''} DOORS OPEN`.trim()) : 'DOORS'}</span>
        <b>{dOpen ? (openNames.length ? openNames.map((n) => <i>{n}</i>) : 'A DOOR IS OPEN') : d ? 'ALL CLOSED' : '--'}</b>
      </div>
    </div>
  );
}
const UP = (s) => String(s ?? '').replace(/_/g, ' ').toUpperCase();

function KPlanner() {
  const R = useRoom(); const W = R.weather;
  const ag = useCals('planner', R.planner, -12, 6);
  const fc = useForecast(W.entity, 'daily');
  const now = clock.value;
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  return (
    <section class="panel k-plan">
      <SecHead title="WEEK PLANNER" tone="peach" />
      <div class="k-legend">{R.planner.map(([l, , tone]) => <span style={{ '--t': `var(--bl-${tone})` }}>{l}</span>)}{ag.error && <span class="fault-line">FAULT • {ag.error}</span>}</div>
      <div class="k-week">
        {days.map((d, i) => {
          const end = new Date(d); end.setDate(end.getDate() + 1);
          const evs = ag.items.filter((x) => x.s < end && x.en > d && !(x.allDay && x.en <= d));
          const f = fc.items.find((x) => sameDay(new Date(x.datetime), d));
          return (
            <div class="k-col" data-today={i === 0 ? '' : undefined}>
              <div class="k-colh">
                <span class="k-cd"><b>{i === 0 ? 'TODAY' : DAYS[d.getDay()].slice(0, 3)}</b><small>{d.getDate()} {MONTHS[d.getMonth()].slice(0, 3)}</small></span>
                {f && <span class="k-cw"><WxIcon cond={f.condition} size={30} /><i style={{ color: tempColor(f.temperature) }}>{Math.round(f.temperature)}°</i><i style={{ color: tempColor(f.templow) }}>{f.templow != null ? `${Math.round(f.templow)}°` : ''}</i></span>}
              </div>
              <div class="k-evs">
                {evs.map((x) => (
                  <div class="k-pev" data-allday={x.allDay ? '' : undefined} data-past={!x.allDay && x.en < now ? '' : undefined} style={{ '--t': `var(--bl-${x.tone})` }}>
                    {!x.allDay && <span>{hm(x.s)}</span>}<b>{x.summary}</b>
                  </div>
                ))}
                {!evs.length && <div class="k-free">CLEAR</div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KTimeline() {
  const R = useRoom();
  const ag = useCals('ai', [['AI', R.aiTimeline, 'violet', null]], -24, 0);
  const items = ag.items.slice(-3).reverse();
  return (
    <section class="panel k-ai">
      <SecHead title="DOOR ACTIVITY • 24 H" tone="violet" />
      {!items.length && <div class="ag-empty">NO ACTIVITY RECORDED</div>}
      {items.map((x) => (
        <div class="k-aie">
          <div class="k-aih"><b>{dayTag(x.s) === 'TODAY' ? hm(x.s) : `${dayTag(x.s).slice(0, 3)} ${hm(x.s)}`}</b><span>{x.summary}</span></div>
          {x.description && x.description !== x.summary && <p>{x.description}</p>}
        </div>
      ))}
    </section>
  );
}

function KCamera({ visitor }) {
  const src = useCameraSrc();
  const cam = ent(SHARED.camera).value;
  return (
    <section class="panel k-cam" data-visitor={visitor ? '' : undefined}>
      <SecHead title={visitor ? 'VISITOR • FRONT DOOR' : 'FRONT DOOR'} tone={visitor ? 'red' : 'peach'} />
      {src ? <img class="k-feed" src={src} alt="Front door camera" /> : <div class="k-feed alert-nocam"><span>NO FEED</span><small>{link.value.mode === 'sim' ? 'SIMULATION • CAMERA REQUIRES LIVE LINK' : `${UP(cam?.state ?? 'CAMERA')} • UNAVAILABLE`}</small></div>}
    </section>
  );
}

/* TELEMETRY: live house readings as LCARS meters + a solar track, with a stepped scan animation */
function Meter({ label, value, unit, min, max, fn, alert, sub, id }) {
  const segs = 14;
  const v = value == null || Number.isNaN(+value) ? null : +value;
  const lit = v == null ? 0 : Math.max(1, Math.round(((Math.min(max, Math.max(min, v)) - min) / (max - min)) * segs));
  return (
    <div class="tm" data-link={id ? '' : undefined} onClick={id ? () => openEntity(id) : undefined} data-alert={alert ? '' : undefined} data-na={v == null ? '' : undefined}>
      <b class="tm-v">{v == null ? '--' : Math.round(v)}<small>{unit}</small></b>
      <div class="tm-bar" style={{ '--n': segs }}>
        {Array.from({ length: segs }, (_, i) => {
          const on = i < lit;
          const at = min + ((i + 0.5) / segs) * (max - min);
          return <i data-on={on ? '' : undefined} data-top={on && i === lit - 1 ? '' : undefined} style={on ? { background: alert ? 'var(--bl-red)' : fn ? fn(at) : 'var(--bl-tan)' } : undefined} />;
        })}
        <span class="tm-scan" />
      </div>
      <span class="tm-l">{label}</span>
      {sub && <span class="tm-s">{sub}</span>}
    </div>
  );
}
function SolarTrack() {
  const R = useRoom();
  const sun = ent(R.weather.sun).value?.attributes ?? {};
  const W = 640, H = 120, hz = 78;
  const el = sun.elevation ?? null, az = sun.azimuth ?? null;
  const x = az == null ? null : (az / 360) * W;
  const y = el == null ? null : hz - (el / 90) * 64;
  // sun path for today: approximate the elevation curve through noon using the peak elevation estimate
  const path = Array.from({ length: 61 }, (_, i) => { const a = (i / 60) * 360; const e = -35 * Math.cos(((a) / 180) * Math.PI) - 8; return `${i ? 'L' : 'M'}${((a / 360) * W).toFixed(1)},${(hz - (e / 90) * 64).toFixed(1)}`; }).join(' ');
  const t = (iso) => (iso ? hm(new Date(iso)) : '--');
  return (
    <div class="solar">
      <div class="solar-g">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {[0, 90, 180, 270, 360].map((a) => <line x1={(a / 360) * W} x2={(a / 360) * W} y1="6" y2={H - 6} stroke="#1C3C55" stroke-width="1" />)}
        <line x1="0" x2={W} y1={hz} y2={hz} stroke="#2E6E95" stroke-width="2" />
        <path d={path} fill="none" stroke="#2E6E95" stroke-width="1.5" stroke-dasharray="4 5" />
        <rect class="solar-scan" x="0" y="6" width="3" height={H - 12} fill="#66E0F0" />
        {x != null && y != null && <><circle cx={x} cy={y} r="13" fill="none" stroke={el > 0 ? '#FFC14D' : '#37A6D1'} stroke-width="2" class="solar-ring" /><circle cx={x} cy={y} r="7" fill={el > 0 ? '#FFC14D' : '#37A6D1'} /></>}
      </svg>
      {/* compass letters in HTML: the stretched SVG (preserveAspectRatio none) distorted them */}
      {['N', 'E', 'S', 'W', 'N'].map((l, i) => <span class="solar-c" style={{ left: `${i * 25}%` }} data-edge={i === 0 ? 'l' : i === 4 ? 'r' : undefined}>{l}</span>)}
      </div>
      <div class="solar-r">
        <span>ELEVATION<b>{el != null ? `${el.toFixed(1)}°` : '--'}</b></span>
        <span>AZIMUTH<b>{az != null ? `${Math.round(az)}°` : '--'}</b></span>
        <span>SUNRISE<b>{t(sun.next_rising)}</b></span>
        <span>SUNSET<b>{t(sun.next_setting)}</b></span>
      </div>
    </div>
  );
}
function KTelemetry() {
  const R = useRoom(); const T = R.telemetry;
  const hv = ent(T.hvac).value?.attributes ?? {};
  const out = ent(R.weather.hvacOutdoor).value;
  const wx = ent(R.weather.entity).value?.attributes ?? {};
  const fz = ent(T.freezer).value;
  const lights = ROOMS.house.zones.slice(1).map(([, id]) => ent(id).value?.state);
  const on = lights.filter((s) => s === 'on').length;
  const num = (s) => (s && !UNAVAIL.has(s.state) && !Number.isNaN(+s.state) ? +s.state : null);
  const fzv = num(fz);
  return (
    <section class="panel k-tel">
      <SecHead title="TELEMETRY" tone="tan" />
      <SolarTrack />
      <div class="tm-row">
        <Meter label="INDOOR" unit="°" value={hv.current_temperature} min={50} max={90} fn={tempColor} sub={UP(hv.hvac_action ?? '')} />
        <Meter label="HUMIDITY" unit="%" value={hv.current_humidity} min={0} max={100} fn={humColor} sub="INDOOR" />
        <Meter label="OUTDOOR" unit="°" value={num(out)} min={-20} max={100} fn={tempColor} sub="HVAC UNIT" />
        <Meter label="WIND" unit="MPH" value={wx.wind_speed} min={0} max={40} sub={wx.wind_bearing != null ? `FROM ${Math.round(wx.wind_bearing)}°` : ''} />
        <Meter label="FREEZER" unit="°" value={fzv} min={-20} max={20} alert={fzv != null && fzv > 10} sub={fzv != null && fzv > 10 ? 'TOO WARM' : 'NOMINAL'} />
        {T.cars.map(([l, id]) => { const v = num(ent(id).value); return <Meter id={id} label={l} unit="%" value={v} min={0} max={100} alert={v != null && v < 20} sub="BATTERY" />; })}
        <Meter label="LIGHTS" unit={`/${lights.length}`} value={on} min={0} max={lights.length} sub="ZONES ON" />
      </div>
    </section>
  );
}

function kitchenMode(R) {
  const visitor = ent(SHARED.visitor).value?.state === 'on';
  if (visitor) return 'VISITOR';
  if (ent(R.modes.camera).value?.state === 'on') return 'CAMERA';
  if (ent(R.modes.calendar).value?.state === 'on') return 'CALENDAR';
  return 'STANDARD';
}

function KitchenPage() {
  const R = useRoom();
  const mode = kitchenMode(R);
  if (mode === 'VISITOR' || mode === 'CAMERA') {
    return (
      <div class="page k-page k-camm">
        <KCamera visitor={mode === 'VISITOR'} />
        <div class="k-side">
          <section class="panel"><SecHead title="CHRONOMETER" tone="peach" /><KClock compact /></section>
          <KTimeline />
          <section class="panel"><SecHead title="STATUS" tone="tan" /><KStatus /></section>
        </div>
      </div>
    );
  }
  if (mode === 'CALENDAR') {
    return (
      <div class="page k-page k-calm">
        <div class="k-top">
          <section class="panel"><SecHead title="CHRONOMETER" tone="peach" /><KClock compact /></section>
          <section class="panel"><SecHead title="ATMOSPHERICS" tone="violet" /><KWeather compact /></section>
          <section class="panel"><SecHead title="STATUS" tone="tan" /><KStatus /></section>
        </div>
        <KPlanner />
      </div>
    );
  }
  return (
    <div class="page k-page k-std">
      <div class="k-colw">
        <section class="panel"><SecHead title="CHRONOMETER" tone="peach" /><KClock /></section>
        <section class="panel"><SecHead title="ATMOSPHERICS" tone="violet" /><KWeather /></section>
        <section class="panel"><SecHead title="NEXT HOURS" tone="peach" /><HourStrip W={R.weather} n={9} /></section>
        <KTelemetry />
      </div>
      <KAgenda title="ELAM" tone="peach" cals={R.elam} k="elam" tall />
      <div class="k-colw">
        <KAgenda title="KATIE" tone="sunflower" cals={R.katie} k="katie" />
        <section class="panel"><SecHead title="DAX" tone="sky" /><KNext title="NEXT" cal={R.dax} /></section>
        <section class="panel"><SecHead title="STATUS" tone="tan" /><KStatus /></section>
      </div>
    </div>
  );
}

function KitchenFrame() {
  const R = useRoom();
  const mode = kitchenMode(R);
  return (
    <div class="app k-app">
      <div class="elbow-t"><span class="elbow-code">{code(`tiny-cabins-${R.key}`, 6)}</span></div>
      <header class="hd">
        <span class="corner-t"><i /></span>
        <span class="hd-bar" />
        <span class="hd-seg" style={{ background: 'var(--bl-tan)', width: '72px' }} />
        <span class="hd-seg hd-code">{mode} • {BUILD}</span>
        <h1 class="hd-t">{R.title}</h1>
        <span class="hd-cap" />
      </header>
      <nav class="side" aria-label="Display mode">
        {['STANDARD', 'CALENDAR', 'CAMERA', 'VISITOR'].map((m, i) => (
          <div class="nav k-mode" data-sel={mode === m ? '' : undefined} data-alert={m === 'VISITOR' && mode === m ? '' : undefined} style={{ '--nav': `var(--bl-${['tan', 'peach', 'violet', 'red'][i]})` }}>
            <span class="nav-c">{code(m)}</span><span class="nav-l">{m}</span>
          </div>
        ))}
        <SimVisitor />
        <span class="side-fill" />
        {link.value.mode !== 'hass' && <button class="nav" style={{ '--nav': 'var(--bl-amber)' }} onClick={() => (linkOpen.value = true)}><span class="nav-c">07-00</span><span class="nav-l">LINK</span></button>}
      </nav>
      <main class="main"><KitchenPage /></main>
      <div class="elbow-b" />
      <footer class="ft">
        <span class="corner-b"><i /></span>
        <span class="ft-bar" />
        <Fault />
        <span class="status k-foot">DISPLAY ONLY • MODES SET FROM RETRO HOUSE CONSOLE</span>
        <StatusPill />
        <span class="ft-seg" />
        <span class="ft-cap" />
      </footer>
      <LinkPanel />
      <ReloadWatch />
    </div>
  );
}

/* ===================== CABIN MASTER SYSTEMS STATUS (landscape desktop, display only) ===================== */
const num = (st) => (st && !UNAVAIL.has(st.state) && !Number.isNaN(+st.state) ? +st.state : null);
/** Tone for one status tile: ok | warn | alert | na */
function tileTone(t, st) {
  if (!st) return 'na';
  if (t.ago === 'state' && st.state === 'unknown') return 'ok'; // stateless entity that has never fired
  if (UNAVAIL.has(st.state)) return 'na';
  if (t.kind === 'climate') return st.state === 'off' ? 'warn' : 'ok';
  if (t.bad?.includes(st.state)) return 'alert';
  if (t.warn?.includes(st.state)) return 'warn';
  const v = +st.state;
  if (!Number.isNaN(v)) {
    if ((t.lowBad != null && v < t.lowBad) || (t.highBad != null && v > t.highBad)) return 'alert';
    if ((t.lowWarn != null && v < t.lowWarn) || (t.highWarn != null && v > t.highWarn)) return 'warn';
  }
  return 'ok';
}
/** Time since a timestamp, in console words: NOW / 5 MIN AGO / 3 H AGO / 2 D AGO. */
function ago(ts) {
  const t = typeof ts === 'number' ? ts * 1000 : Date.parse(ts);
  if (Number.isNaN(t)) return '--';
  const m = Math.max(0, Math.round((clock.value - t) / 60000));
  return m < 1 ? 'NOW' : m < 60 ? `${m} MIN AGO` : m < 2880 ? `${Math.round(m / 60)} H AGO` : `${Math.round(m / 1440)} D AGO`;
}
/** Display text for one tile. */
function tileText(t, st) {
  if (!st) return 'NOT FOUND';
  if (t.ago === 'state') return st.state === 'unknown' ? 'NEVER' : UNAVAIL.has(st.state) ? 'NO SIGNAL' : ago(st.state);
  if (UNAVAIL.has(st.state)) return 'NO SIGNAL';
  if (t.kind === 'climate') { const a = st.attributes ?? {}; return `${a.current_temperature ?? '--'}° • SET ${a.temperature ?? '--'}°`; }
  if (t.unit) { const v = +st.state; return Number.isNaN(v) ? UP(st.state) : `${Math.round(v * 10) / 10}${t.unit === '%' || t.unit.startsWith('°') ? '' : ' '}${t.unit}`; }
  const base = t.raw ? st.state : (t.map?.[st.state] ?? UP(st.state));
  return base;
}
function tileSub(t, st) {
  if (t.kind === 'climate' && st && !UNAVAIL.has(st.state)) return ` • ${UP(st.attributes?.hvac_action ?? st.state)}`;
  if (t.ago === 'changed' && st && !UNAVAIL.has(st.state)) return ` • ${ago(st.last_changed)}`;
  return '';
}
/** Reading for a thermal meter: climate entities use current_temperature, sensors their state. */
function tempOf(id) {
  const st = ent(id).value;
  if (!st || UNAVAIL.has(st.state)) return null;
  return id.startsWith('climate.') ? st.attributes?.current_temperature ?? null : num(st);
}
function meterTone(v, o) { return v == null ? 'na' : (o.lo != null && v < o.lo) || (o.hi != null && v > o.hi) ? 'alert' : 'ok'; }
/** Every alert and warning on the panel, for the header count, the side lamps and the ALERTS list. */
function useStatusEval(S) {
  const items = [];
  const groups = {};
  // Each subsystem's health covers its overview tiles and its detail-page tiles; an entity counts once.
  const keys = [...new Set([...S.groups.map((g) => g.key), ...Object.keys(S.detail ?? {})])];
  for (const key of keys) {
    let worst = 'ok'; const done = new Set();
    const tiles = [...(S.groups.find((g) => g.key === key)?.tiles ?? []), ...(S.detail?.[key] ?? []).flatMap((p) => p.tiles ?? [])];
    for (const t of tiles) {
      if (done.has(t.id)) continue; done.add(t.id);
      const st = ent(t.id).value; const tone = tileTone(t, st);
      if (tone === 'alert' || tone === 'warn' || tone === 'na') items.push({ g: key, l: t.l, tone, v: tileText(t, st), id: t.id });
      worst = rank(tone) > rank(worst) ? tone : worst;
    }
    groups[key] = worst;
  }
  let th = 'ok';
  for (const [l, id, o] of S.thermal) {
    const v = tempOf(id); const tone = meterTone(v, o);
    if (tone !== 'ok') items.push({ id, g: 'THERMAL', l: `TEMP • ${l}`, tone, v: v == null ? 'NO SIGNAL' : `${Math.round(v)}°F` });
    th = rank(tone) > rank(th) ? tone : th;
  }
  for (const [l, id, o] of S.humidity) {
    const v = num(ent(id).value); const tone = v == null ? 'na' : v > o.hi ? 'warn' : 'ok';
    if (tone !== 'ok') items.push({ id, g: 'THERMAL', l: `HUMIDITY • ${l}`, tone, v: v == null ? 'NO SIGNAL' : `${Math.round(v)}%` });
    th = rank(tone) > rank(th) ? tone : th;
  }
  groups.THERMAL = rank(th) > rank(groups.THERMAL ?? 'ok') ? th : (groups.THERMAL ?? 'ok');
  items.sort((a, b) => rank(b.tone) - rank(a.tone));
  return { items, groups, alerts: items.filter((x) => x.tone === 'alert').length, warns: items.filter((x) => x.tone !== 'alert').length };
}
function rank(t) { return { ok: 0, na: 1, warn: 2, alert: 3 }[t] ?? 0; }

function STile({ t }) {
  const st = ent(t.id).value; const tone = tileTone(t, st);
  return <div class="s-tile" data-link="" role="button" title="Open device in Home Assistant" onClick={() => openEntity(t.id)} data-tone={tone}><span>{t.l}{tileSub(t, st)}</span><b>{tileText(t, st)}</b></div>;
}
function SGroup({ g, cols = 2 }) {
  return (
    <section class="panel">
      <SecHead title={g.key} tone={g.tone} />
      <div class="s-tiles" style={{ '--cols': cols }}>{g.tiles.map((t) => <STile t={t} />)}</div>
    </section>
  );
}
function SThermal() {
  const S = useRoom().status;
  return (
    <section class="panel s-therm">
      <SecHead title="THERMAL • FREEZE WATCH" tone="tan" />
      <div class="tm-row s-tm" style={{ gridTemplateColumns: `repeat(${S.thermal.length}, minmax(0, 1fr))` }}>
        {S.thermal.map(([l, id, o]) => {
          const v = tempOf(id); const st = ent(id).value; const a = st?.attributes ?? {};
          const tone = meterTone(v, o);
          const sub = id.startsWith('climate.') ? (st && !UNAVAIL.has(st.state) ? `SET ${a.temperature ?? '--'}° • ${UP(a.hvac_action ?? st.state)}` : 'NO SIGNAL') : (tone === 'alert' ? `BELOW ${o.lo}°` : o.sub);
          return <Meter id={id} label={l} unit="°" value={v} min={20} max={90} fn={tempColor} alert={tone === 'alert'} sub={sub} />;
        })}
      </div>
    </section>
  );
}
function SHumidity() {
  const S = useRoom().status;
  const co2 = num(ent(S.co2).value);
  return (
    <section class="panel s-hum">
      <SecHead title="HUMIDITY • AIR" tone="violet" />
      <div class="tm-row s-tm" style={{ gridTemplateColumns: `repeat(${S.humidity.length + 1}, minmax(0, 1fr))` }}>
        {S.humidity.map(([l, id, o]) => { const v = num(ent(id).value); return <Meter label={l} unit="%" value={v} min={0} max={100} fn={humColor} alert={v != null && v > o.hi} sub={v != null && v > o.hi ? `ABOVE ${o.hi}%` : 'RH'} />; })}
        <Meter id={S.co2} label="CO2" unit="" value={co2} min={400} max={2000} alert={co2 != null && co2 > 1500} sub={co2 == null ? '' : co2 > 1500 ? 'HIGH' : co2 > 1000 ? 'ELEVATED • PPM' : 'PPM'} />
      </div>
    </section>
  );
}
function SOccupancy() {
  const S = useRoom().status;
  const fmt = (s) => { if (!s) return '--'; const d = new Date(s.replace(' ', 'T')); return isNaN(d) ? s : `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  return (
    <section class="panel">
      <SecHead title="OCCUPANCY" tone="sunflower" />
      {S.units.map(([l, cal, hrs, pres]) => {
        const c = ent(cal).value; const h = num(ent(hrs).value); const p = ent(pres).value;
        const booked = c?.state === 'on';
        return (
          <div class="s-unit" data-booked={booked ? '' : undefined}>
            <div class="s-unit-h" data-link="" onClick={() => openEntity(cal)}><b>{l}</b><span>{!c ? 'NOT FOUND' : UNAVAIL.has(c.state) ? 'NO SIGNAL' : booked ? 'RESERVED' : 'VACANT'}</span></div>
            <div class="s-unit-r">
              <span>{booked ? 'UNTIL' : 'NEXT'}<b>{booked ? fmt(c.attributes?.end_time) : fmt(c?.attributes?.start_time)}</b></span>
              <span data-link="" onClick={() => openEntity(hrs)}>LAST ACTIVITY<b>{h == null ? '--' : h < 1 ? 'UNDER 1 H' : `${h.toFixed(1)} H AGO`}</b></span>
              <span data-link="" onClick={() => openEntity(pres)}>PRESENCE<b>{!p || UNAVAIL.has(p.state) ? '--' : p.state === 'on' ? 'DETECTED' : 'NONE'}</b></span>
            </div>
            {booked && c.attributes?.message && <div class="s-unit-m">{c.attributes.message}</div>}
          </div>
        );
      })}
    </section>
  );
}
function SPower() {
  const S = useRoom().status;
  const now = num(ent(S.solar.now).value); const today = num(ent(S.solar.today).value);
  return (
    <section class="panel">
      <SecHead title="SOLAR" tone="sunflower" />
      <div class="s-tiles" style={{ '--cols': 2 }}>
        <div class="s-tile" data-link="" onClick={() => openEntity(S.solar.now)} data-tone={now == null ? 'na' : 'ok'}><span>OUTPUT NOW</span><b>{now == null ? 'NO SIGNAL' : now >= 1000 ? `${(now / 1000).toFixed(2)} KW` : `${Math.round(now)} W`}</b></div>
        <div class="s-tile" data-link="" onClick={() => openEntity(S.solar.today)} data-tone={today == null ? 'na' : 'ok'}><span>TODAY</span><b>{today == null ? 'NO SIGNAL' : `${(today / 1000).toFixed(1)} KWH`}</b></div>
      </div>
    </section>
  );
}
function SWeather() {
  const R = useRoom(); const W = R.weather;
  const w = ent(W.entity).value; const a = w?.attributes ?? {};
  const fc = useForecast(W.entity, 'daily'); const t = fc.items[0];
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return (
    <div class="k-wx k-wx-c">
      <WxBig W={W} a={a} cond={w?.state} small />
      <div class="wx-grid wx-compact">
        <Stat k="HIGH / LOW" v={t ? `${Math.round(t.temperature)}° / ${Math.round(t.templow ?? t.temperature)}°` : '--'} />
        <Stat k="WIND" v={a.wind_speed != null ? `${Math.round(a.wind_speed)} ${a.wind_bearing != null ? dirs[Math.round(a.wind_bearing / 45) % 8] : ''}` : '--'} />
        <Stat k="HUMIDITY" v={`${a.humidity ?? '--'}%`} color={humColor(a.humidity)} />
      </div>
    </div>
  );
}
function SAlerts({ E }) {
  return (
    <section class="panel s-alerts">
      <SecHead title={E.items.length ? `ALERTS • ${E.items.length}` : 'ALERTS'} tone={E.alerts ? 'red' : E.warns ? 'sunflower' : 'tan'} />
      {!E.items.length && <div class="s-clear">ALL SYSTEMS NOMINAL</div>}
      <div class="s-alist">
        {E.items.map((x) => <div class="s-al" data-link="" onClick={() => openEntity(x.id)} data-tone={x.tone}><i>{x.g}</i><span>{x.l}</span><b>{x.v}</b></div>)}
      </div>
    </section>
  );
}
/* The status page is laid out on a fixed design canvas and scaled to fit the available area, so panels keep their
   proportions and never overlap on shorter or narrower windows (HA header, browser chrome, laptop screens). */
const S_W = 1740, S_H = 930;
function useFit() {
  const ref = useRef(null); const z = useSignal(1);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const m = () => { const cs = getComputedStyle(el); const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom); z.value = Math.max(0.3, Math.min(w / S_W, h / S_H, 1.6)); };
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, z.value];
}

/* THERMAL page: every humidity sensor as meters (display only) */
function SHumidityAll() {
  const S = useRoom().status;
  return (
    <section class="panel s-hum s-humall">
      <SecHead title="HUMIDITY • ALL SENSORS" tone="violet" />
      <div class="tm-row s-tm" style={{ gridTemplateColumns: `repeat(${S.humidityAll.length}, minmax(0, 1fr))` }}>
        {S.humidityAll.map(([l, id]) => { const v = num(ent(id).value); return <Meter id={id} label={l} unit="%" value={v} min={0} max={100} fn={humColor} sub="RH" />; })}
      </div>
    </section>
  );
}

/* THERMOSTAT CHARTS: room temperature against set point over the chosen window, heating periods underneath.
   History comes from HA's recorder (history_during_period), refreshed every 5 minutes; the live state extends it to now. */
const thermoHours = signal(24);
const thermoHist = signal({ at: 0, key: '', data: {}, err: null });
function useThermoHistory(ids) {
  const h = thermoHours.value; const key = `${h}|${ids.join(',')}`;
  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const end = new Date(); const start = new Date(+end - h * 3600e3);
        const data = await getHistory(ids, start, end);
        if (!dead) thermoHist.value = { at: Date.now(), key, data, err: null };
      } catch (e) { if (!dead) thermoHist.value = { ...thermoHist.peek(), key, err: e?.message ?? 'HISTORY FAILED' }; }
    };
    load(); const iv = setInterval(load, 300e3);
    return () => { dead = true; clearInterval(iv); };
  }, [key]);
  return thermoHist.value.key === key ? thermoHist.value : { at: 0, data: {}, err: null };
}
function SThermoChart({ id, label, rows, hours }) {
  const st = ent(id).value; const a = st?.attributes ?? {};
  const now = Date.now(); const t0 = now - hours * 3600e3;
  // series: history rows plus the live state at "now"
  const pts = (rows ?? []).filter((r) => r.s && !UNAVAIL.has(r.s)).map((r) => ({ t: Math.max(r.t, t0), cur: r.a?.current_temperature, set: r.s === 'off' ? null : r.a?.temperature, heat: r.a?.hvac_action === 'heating' }));
  if (st && !UNAVAIL.has(st.state)) pts.push({ t: now, cur: a.current_temperature, set: st.state === 'off' ? null : a.temperature, heat: a.hvac_action === 'heating' });
  const vals = pts.flatMap((p) => [p.cur, p.set]).filter((v) => v != null);
  const lo = vals.length ? Math.floor((Math.min(...vals) - 2) / 5) * 5 : 50;
  const hi = vals.length ? Math.ceil((Math.max(...vals) + 2) / 5) * 5 : 80;
  const W = 680, H = 200, L = 34, R = 6, T = 8, B = 24, HB = 10; // plot box, heating band height
  const x = (t) => L + ((t - t0) / (now - t0)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B - HB - 4);
  const step = (key) => { let d = ''; let prev = null; for (const p of pts) { const v = p[key]; if (v == null) { prev = null; continue; } const X = x(p.t).toFixed(1), Y = y(v).toFixed(1); d += prev == null ? `M${X},${Y}` : `H${X}V${Y}`; prev = v; } return d; };
  const line = (key) => { let d = ''; let prev = null; for (const p of pts) { const v = p[key]; if (v == null) { prev = null; continue; } d += `${prev == null ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(v).toFixed(1)}`; prev = v; } return d; };
  // heating spans and total heating time
  const spans = []; let heatMs = 0;
  for (let i = 0; i < pts.length - 1; i++) if (pts[i].heat) { const a0 = pts[i].t, a1 = pts[i + 1].t; heatMs += a1 - a0; const last = spans[spans.length - 1]; if (last && Math.abs(last[1] - a0) < 1) last[1] = a1; else spans.push([a0, a1]); }
  const ticks = []; for (let v = lo; v <= hi; v += 5) ticks.push(v);
  const tstep = hours <= 12 ? 3 : hours <= 24 ? 6 : 24; const tt = [];
  { const d = new Date(t0); d.setMinutes(0, 0, 0); d.setHours(Math.ceil(d.getHours() / tstep) * tstep); for (let t = +d; t <= now; t += tstep * 3600e3) tt.push(t); }
  const off = !st || UNAVAIL.has(st.state);
  const heatingNow = a.hvac_action === 'heating';
  const gap = a.current_temperature != null && a.temperature != null ? a.current_temperature - a.temperature : null;
  return (
    <section class="panel s-tc">
      <SecHead title={label} tone={off ? 'rust' : heatingNow ? 'rose' : 'tan'} />
      <div class="s-tc-body">
        <svg class="s-tc-g" viewBox={`0 0 ${W} ${H}`} onClick={() => openEntity(id)} data-link="" aria-label={`${label} temperature and set point, last ${hours} hours`}>
          {ticks.map((v) => <g><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} class="s-tc-grid" /><text x={L - 6} y={y(v) + 4} class="s-tc-yl">{v}°</text></g>)}
          {tt.map((t) => { const d = new Date(t); return <g><line x1={x(t)} x2={x(t)} y1={T} y2={H - B} class="s-tc-vgrid" /><text x={x(t)} y={H - 6} class="s-tc-xl">{hours > 24 ? DAYS[d.getDay()].slice(0, 3) : `${pad(d.getHours())}:00`}</text></g>; })}
          {spans.map(([s0, s1]) => <rect x={x(s0)} width={Math.max(1.5, x(s1) - x(s0))} y={H - B - HB} height={HB} class="s-tc-heat" />)}
          <line x1={L} x2={W - R} y1={H - B - HB} y2={H - B - HB} class="s-tc-base" />
          <path d={step('set')} class="s-tc-set" />
          <path d={line('cur')} class="s-tc-cur" />
          {!off && a.current_temperature != null && <circle cx={x(now)} cy={y(a.current_temperature)} r="5" class="s-tc-now" />}
          {!pts.length && <text x={W / 2} y={H / 2} class="s-tc-empty">{off ? 'NO SIGNAL' : 'LOADING HISTORY'}</text>}
        </svg>
        <div class="s-tc-r">
          <span>NOW<b>{a.current_temperature ?? '--'}°</b></span>
          <span class="s-tc-sp">SET<b>{st?.state === 'off' ? 'OFF' : `${a.temperature ?? '--'}°`}</b></span>
          <span data-heat={heatingNow ? '' : undefined}>{UP(st?.state ?? '--')}<b>{UP(a.hvac_action ?? (off ? 'NO SIGNAL' : '--'))}</b></span>
          <span>{gap == null ? 'OFFSET' : gap >= 0 ? 'ABOVE SET' : 'BELOW SET'}<b>{gap == null ? '--' : `${gap > 0 ? '+' : ''}${Math.round(gap * 10) / 10}°`}</b></span>
          <span>HEAT {hours} H<b>{(heatMs / 3600e3).toFixed(1)} H</b></span>
        </div>
      </div>
    </section>
  );
}
function SThermoCharts({ p }) {
  const h = useThermoHistory(p.thermo);
  return (
    <div class="s-tcs">
      <div class="s-tc-bar">
        <span class="s-tc-key"><i class="k-cur" />ROOM TEMP<i class="k-set" />SET POINT<i class="k-heat" />HEATING</span>
        {h.err && <span class="fault-line">HISTORY FAULT • {UP(h.err)}</span>}
        <span class="s-tc-pills">{[12, 24, 72].map((n) => <button class="s-tc-pill" data-sel={thermoHours.value === n ? '' : undefined} onClick={() => (thermoHours.value = n)}>{n} H</button>)}</span>
      </div>
      <div class="s-tc-grid4">{p.thermo.map((id, i) => <SThermoChart id={id} label={p.labels[i]} rows={h.data[id]} hours={thermoHours.value} />)}</div>
    </div>
  );
}

const sPage = signal((() => { try { return localStorage.getItem('cabinlcars.status.page') || 'STATUS'; } catch { return 'STATUS'; } })());
function goStatus(p) { if (p !== 'CAMERAS' || sPage.peek() === 'CAMERAS') camView.value = null; sPage.value = p; try { localStorage.setItem('cabinlcars.status.page', p); } catch {} }
const LAMP_TONE = { WATER: 'sky', SEPTIC: 'peach', THERMAL: 'tan', SAFETY: 'red', ACCESS: 'violet', NETWORK: 'ice' };

/* ACCESS page: big-state entry cards on the left, a camera x detection matrix and recent-activity list on the right */
const tsOf = (st) => (typeof st?.last_changed === 'number' ? st.last_changed * 1000 : Date.parse(st?.last_changed));
const since = (st) => { const t = tsOf(st); return Number.isNaN(t) ? '--' : `SINCE ${hm(new Date(t))} • ${ago(t / 1000)}`; };
function Batt({ id }) {
  const st = ent(id).value; const v = num(st);
  const tone = v == null ? 'na' : v < 15 ? 'alert' : v < 30 ? 'warn' : 'ok';
  return (
    <span class="s-chip s-batt" data-tone={tone} data-link="" onClick={() => openEntity(id)}>BATTERY
      <i class="s-bar"><i style={{ width: `${v ?? 0}%` }} /></i><b>{v == null ? '--' : `${Math.round(v)}%`}</b>
    </span>
  );
}
function Chip({ l, id, map, bad }) {
  const st = ent(id).value; const s0 = st?.state;
  const tone = !st || UNAVAIL.has(s0) ? 'na' : (bad === 'dead' ? s0 === 'dead' : s0 === 'on') ? (bad === 'warn' ? 'warn' : 'alert') : 'ok';
  return <span class="s-chip" data-tone={tone} data-link="" onClick={() => openEntity(id)}>{l}<b>{!st ? '--' : UNAVAIL.has(s0) ? 'NO SIGNAL' : map[s0] ?? UP(s0)}</b></span>;
}
function SAccess() {
  const S = useRoom().status; const A = S.access;
  // perimeter matrix
  const types = ['PERSON', 'VISITOR', 'VEHICLE', 'ANIMAL', 'PACKAGE', 'MOTION'];
  const shortCam = (l) => l.replace('LOG CABIN ', '').replace('BUNK HOUSE ', 'BUNK ').replace('FRONT ', '');
  const recent = S.cameras.flatMap(([cl, , , det]) => det.map(([l, id]) => ({ cam: shortCam(cl), l, id, st: ent(id).value })))
    .filter((x) => x.st && !UNAVAIL.has(x.st.state) && !Number.isNaN(tsOf(x.st)))
    .sort((a, b) => (b.st.state === 'on') - (a.st.state === 'on') || tsOf(b.st) - tsOf(a.st)).slice(0, 8);
  return (
    <div class="s-acc">
      <div class="s-acc-l">
        <section class="panel">
          <SecHead title="LOCKS" tone="violet" />
          {A.locks.map((L) => {
            const lk = ent(L.id).value; const ls = lk?.state;
            const lTone = !lk || UNAVAIL.has(ls) ? 'na' : ls === 'jammed' ? 'alert' : ls === 'unlocked' ? 'warn' : 'ok';
            return (
              <div class="s-lockc">
                <div class="s-big s-big-md" data-tone={lTone} data-link="" onClick={() => openEntity(L.id)}>
                  <span class="s-big-l">{L.l}</span>
                  <b class="s-big-v">{!lk ? 'NOT FOUND' : UNAVAIL.has(ls) ? 'NO SIGNAL' : UP(ls)}</b>
                  <span class="s-big-s">{lk ? since(lk) : ''}</span>
                </div>
                <div class="s-chips"><Batt id={L.battery} />{L.chips.map(([l, id, map, bad]) => <Chip l={l} id={id} map={map} bad={bad} />)}</div>
              </div>
            );
          })}
        </section>
        <div class="s-acc-op">
          {A.openings.map((o) => {
            const st = ent(o.id).value; const open = st?.state === 'on';
            const tone = !st || UNAVAIL.has(st.state) ? 'na' : open ? 'warn' : 'ok';
            return (
              <section class="panel">
                <div class="s-big s-big-sm" data-tone={tone} data-link="" onClick={() => openEntity(o.id)}>
                  <span class="s-big-l">{o.l}</span>
                  <b class="s-big-v">{!st ? 'NOT FOUND' : UNAVAIL.has(st.state) ? 'NO SIGNAL' : open ? 'OPEN' : 'CLOSED'}</b>
                  <span class="s-big-s">{st ? since(st) : ''}</span>
                </div>
                <div class="s-chips"><Batt id={o.battery} /><Chip l="TAMPER" id={o.tamper} map={{ on: 'COVER OFF', off: 'OK' }} bad="warn" /></div>
              </section>
            );
          })}
        </div>
      </div>
      <div class="s-acc-r">
        <section class="panel">
          <SecHead title="PERIMETER • DETECTIONS" tone="violet" />
          <div class="s-mx" style={{ '--c': types.length }}>
            <span class="s-mx-h" />{types.map((t) => <span class="s-mx-h">{t}</span>)}
            {S.cameras.map(([cl, , , det]) => [
              <span class="s-mx-r">{shortCam(cl)}</span>,
              ...types.map((t) => {
                const d = det.find(([l]) => l === t); if (!d) return <span class="s-mx-c" data-none="">—</span>;
                const st = ent(d[1]).value; if (!st || UNAVAIL.has(st.state)) return <span class="s-mx-c" data-tone="na" data-link="" onClick={() => openEntity(d[1])}>--</span>;
                const on = st.state === 'on'; const age = (clock.value - tsOf(st)) / 60000;
                return <span class="s-mx-c" data-link="" onClick={() => openEntity(d[1])} data-tone={on ? (t === 'MOTION' ? 'warn' : 'alert') : age < 15 ? 'fresh' : 'old'}>{on ? 'NOW' : ago(tsOf(st) / 1000).replace(' AGO', '')}</span>;
              }),
            ])}
          </div>
          <div class="s-mx-key"><i data-tone="alert" />DETECTING NOW<i data-tone="warn" />MOTION NOW<i data-tone="fresh" />LAST 15 MIN<i data-tone="old" />OLDER</div>
        </section>
        <section class="panel s-feedlist">
          <SecHead title="LATEST ACTIVITY" tone="violet" />
          {recent.map((x) => (
            <div class="s-act" data-on={x.st.state === 'on' ? '' : undefined} data-link="" onClick={() => openEntity(x.id)}>
              <b>{x.st.state === 'on' ? 'NOW' : hm(new Date(tsOf(x.st)))}</b><span>{x.cam}</span><span class="s-act-t">{x.l}</span><i>{x.st.state === 'on' ? 'ACTIVE' : ago(tsOf(x.st) / 1000)}</i>
            </div>
          ))}
          <div class="s-act-note">TIMES ARE THE LAST CHANGE OF EACH SENSOR; A HOME ASSISTANT RESTART RESETS THEM</div>
        </section>
      </div>
    </div>
  );
}


/* NETWORK page: big connectivity states on the left, Z-Wave nodes grouped by building on the right */
function SNetwork() {
  const S = useRoom().status; const N = S.network;
  const all = N.zwave.flatMap(([, ns]) => ns);
  const cnt = (st) => all.filter(([, id]) => ent(id).value?.state === st).length;
  const na = all.filter(([, id]) => { const x = ent(id).value; return !x || UNAVAIL.has(x.state); }).length;
  const ip = num(ent(N.ipad.battery).value);
  const kind = { mains: 'MAINS POWER • ALWAYS AWAKE', battery: 'BATTERY • SLEEPS BETWEEN REPORTS', lock: 'LOCK • WAKES ON DEMAND' };
  return (
    <div class="s-acc s-net">
      <div class="s-acc-l">
        <section class="panel">
          <SecHead title="CONNECTIVITY" tone="ice" />
          <div class="s-net-links">
            {N.links.map((L) => {
              const st = ent(L.id).value; const on = st?.state === 'on';
              const tone = !st || UNAVAIL.has(st.state) ? 'na' : on ? 'ok' : 'alert';
              return (
                <div class="s-big s-big-sm" data-tone={tone} data-link="" onClick={() => openEntity(L.id)}>
                  <span class="s-big-l">{L.l}</span>
                  <b class="s-big-v">{!st ? 'NOT FOUND' : UNAVAIL.has(st.state) ? 'NO SIGNAL' : on ? 'ONLINE' : 'OFFLINE'}</b>
                  <span class="s-big-s">{st ? since(st) : ''}{(L.sub ?? []).map(([sl, sid]) => { const x = ent(sid).value; return ` • ${sl} ${x?.state === 'on' ? 'UP' : x ? 'DOWN' : '--'}`; }).join('')}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section class="panel">
          <SecHead title={N.ipad.l} tone="ice" />
          <div class="s-chips"><Batt id={N.ipad.battery} /></div>
          {ip != null && ip < 30 && <div class="s-act-note">THE WALL IPAD IS LOSING CHARGE • CHECK ITS POWER CABLE</div>}
        </section>
      </div>
      <div class="s-acc-r">
        <section class="panel">
          <SecHead title="Z-WAVE MESH" tone="ice" />
          <div class="s-net-sum">
            <span data-tone="ok"><b>{all.length}</b>NODES</span>
            <span data-tone="ok"><b>{cnt('alive')}</b>ALIVE</span>
            <span data-tone="ok"><b>{cnt('asleep')}</b>ASLEEP</span>
            <span data-tone={cnt('dead') ? 'alert' : 'ok'}><b>{cnt('dead')}</b>DEAD</span>
            <span data-tone={na ? 'na' : 'ok'}><b>{na}</b>NO SIGNAL</span>
          </div>
        </section>
        {N.zwave.map(([grp, ns]) => (
          <section class="panel">
            <SecHead title={grp} tone="ice" />
            <div class="s-nodes">
              {[...ns].sort((a, b) => rank(nodeTone(ent(b[1]).value)) - rank(nodeTone(ent(a[1]).value))).map(([l, id, k]) => {
                const st = ent(id).value; const tone = nodeTone(st);
                return (
                  <div class="s-node" data-tone={tone} data-link="" onClick={() => openEntity(id)}>
                    <span class="s-node-n">{l}<small>{kind[k]}</small></span>
                    <b>{!st ? 'NOT FOUND' : UNAVAIL.has(st.state) ? 'NO SIGNAL' : UP(st.state)}</b>
                    <i>{st && !UNAVAIL.has(st.state) ? since(st).replace('SINCE ', '') : ''}</i>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function nodeTone(st) { return !st || UNAVAIL.has(st.state) ? 'na' : st.state === 'dead' ? 'alert' : 'ok'; }

function SDetail({ k }) {
  const S = useRoom().status; const P = S.detail?.[k] ?? [];
  if (k === 'ACCESS' && S.access) return <SAccess />;
  if (k === 'NETWORK' && S.network) return <SNetwork />;
  return (
    <div class="s-detail">
      {P.map((p) => p.meters ? <div class="s-dwide s-ttop"><SThermal /><SHumidityAll /></div> : p.thermo ? <div class="s-dwide"><SThermoCharts p={p} /></div> : (
        <section class="panel" style={{ gridColumn: (p.cols ?? 3) >= 4 ? '1 / -1' : undefined }}>
          <SecHead title={p.t} tone={p.tone} />
          <div class="s-tiles" style={{ '--cols': p.cols ?? 3 }}>{p.tiles.map((t) => <STile t={t} />)}</div>
        </section>
      ))}
    </div>
  );
}
function SCam({ c: [label, id, wide, det] }) {
  const src = useCameraSrc(id); const cam = ent(id).value;
  const active = det.filter(([, d]) => ent(d).value?.state === 'on');
  const hot = active.some(([l]) => l !== 'MOTION');
  return (
    <section class="panel s-cam" data-wide={wide ? '' : undefined} data-hot={hot ? '' : undefined}>
      <SecHead title={label} tone={hot ? 'red' : active.length ? 'sunflower' : 'violet'} />
      {src ? <img class="s-feed" data-link="" title="Open full screen" onClick={() => (camView.value = { kind: 'cam', c: [label, id, wide, det] })} src={src} alt={`${label} camera`} />
        : <div class="s-feed alert-nocam" data-link="" onClick={() => (camView.value = { kind: 'cam', c: [label, id, wide, det] })}><span>NO FEED</span><small>{link.value.mode === 'sim' ? 'SIMULATION • CAMERA REQUIRES LIVE LINK' : `${UP(cam?.state ?? 'CAMERA NOT FOUND')}`}</small></div>}
      <div class="s-det">
        {det.map(([l, d]) => { const st = ent(d).value; const on = st?.state === 'on'; return <span data-link="" onClick={() => openEntity(d)} data-on={on ? '' : undefined} data-kind={l === 'MOTION' ? 'motion' : 'ai'} data-na={!st || UNAVAIL.has(st.state) ? '' : undefined}>{l}<i>{!st || UNAVAIL.has(st.state) ? '--' : on ? 'NOW' : ago(st.last_changed)}</i></span>; })}
      </div>
    </section>
  );
}
function SWebcam({ w: [label, src, page] }) {
  return (
    <section class="panel s-cam s-web">
      <SecHead title={label} tone="sky" />
      {link.value.mode === 'sim'
        ? <div class="s-feed alert-nocam"><span>EXTERNAL FEED</span><small>SIMULATION • LOADS ON THE LIVE CONSOLE</small></div>
        : <iframe class="s-feed" src={src} title={label} allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" />}
      <div class="s-det"><span>PUBLIC WEBCAM<i>NEST LIVE</i></span><span data-link="" onClick={() => (camView.value = { kind: 'web', w: [label, src, page] })}>VIEW<i>FULL SCREEN</i></span><span data-link="" onClick={() => window.open(page, '_blank', 'noopener')}>SOURCE<i>OPEN PAGE</i></span></div>
    </section>
  );
}

/* FULL-SCREEN CAMERA VIEWER: one feed filling the page, with digital zoom (1-6x) and pan.
   Pan is kept as a fraction of the feed box so it is independent of the page's fit-to-window zoom. */
const camView = signal(null);
const ZMAX = 6;
function SCamViewer({ v }) {
  const z = useSignal(1), px = useSignal(0), py = useSignal(0);
  const stage = useRef(null); const drag = useRef(null);
  const [label, id] = v.kind === 'cam' ? v.c : v.w;
  const det = v.kind === 'cam' ? v.c[3] : [];
  const src = useCameraSrc(v.kind === 'cam' ? id : null);
  const clamp = (x, zz) => { const m = (zz - 1) / 2; return Math.max(-m, Math.min(m, x)); };
  const setZ = (z2, cx = 0, cy = 0) => {
    z2 = Math.max(1, Math.min(ZMAX, Math.round(z2 * 100) / 100));
    const z1 = z.peek();
    px.value = clamp(cx - (cx - px.peek()) * (z2 / z1), z2); py.value = clamp(cy - (cy - py.peek()) * (z2 / z1), z2); z.value = z2;
  };
  const pan = (dx, dy) => { px.value = clamp(px.peek() + dx, z.peek()); py.value = clamp(py.peek() + dy, z.peek()); };
  const reset = () => { z.value = 1; px.value = 0; py.value = 0; };
  const rel = (e) => { const r = stage.current.getBoundingClientRect(); return [(e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5, r]; };
  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') camView.value = null;
      else if (e.key === '+' || e.key === '=') setZ(z.peek() * 1.25);
      else if (e.key === '-') setZ(z.peek() / 1.25);
      else if (e.key === '0') reset();
      else if (e.key.startsWith('Arrow')) { const d = 0.08; pan(e.key === 'ArrowLeft' ? d : e.key === 'ArrowRight' ? -d : 0, e.key === 'ArrowUp' ? d : e.key === 'ArrowDown' ? -d : 0); e.preventDefault(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const onWheel = (e) => { e.preventDefault(); const [cx, cy] = rel(e); setZ(z.peek() * (e.deltaY < 0 ? 1.15 : 1 / 1.15), cx, cy); };
  const onDown = (e) => { if (z.peek() <= 1) return; const [, , r] = rel(e); drag.current = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { const d = drag.current; if (!d) return; pan((e.clientX - d.x) / d.w, (e.clientY - d.y) / d.h); d.x = e.clientX; d.y = e.clientY; };
  const onUp = () => { drag.current = null; };
  const onDbl = (e) => { const [cx, cy] = rel(e); if (z.peek() > 1) reset(); else setZ(2.5, cx, cy); };
  const tf = { transform: `translate(${(px.value * 100).toFixed(2)}%, ${(py.value * 100).toFixed(2)}%) scale(${z.value})` };
  const cam = v.kind === 'cam' ? ent(id).value : null;
  return (
    <div class="s-cv">
      <div class="s-cv-main">
        <SecHead title={`${label} • ${z.value === 1 ? 'FULL VIEW' : `${z.value.toFixed(1)}X`}`} tone="violet" />
        <div class="s-cv-stage" ref={stage} data-zoomed={z.value > 1 ? '' : undefined} onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDblClick={onDbl}>
          {v.kind === 'web'
            ? (link.value.mode === 'sim' ? <div class="s-cv-media alert-nocam" style={tf}><span>EXTERNAL FEED</span><small>SIMULATION</small></div> : <iframe class="s-cv-media" style={tf} src={v.w[1]} title={label} allow="autoplay; fullscreen" />)
            : src ? <img class="s-cv-media" style={tf} src={src} alt={label} draggable={false} />
            : <div class="s-cv-media alert-nocam" style={tf}><span>NO FEED</span><small>{link.value.mode === 'sim' ? 'SIMULATION • CAMERA REQUIRES LIVE LINK' : UP(cam?.state ?? 'CAMERA NOT FOUND')}</small></div>}
          {v.kind === 'web' && z.value > 1 && <div class="s-cv-grab" />}
          <div class="s-cv-mini" aria-hidden="true"><i style={{ width: `${100 / z.value}%`, height: `${100 / z.value}%`, left: `${(0.5 - 0.5 / z.value - px.value / z.value) * 100}%`, top: `${(0.5 - 0.5 / z.value - py.value / z.value) * 100}%` }} /></div>
        </div>
        {det.length > 0 && <div class="s-det">{det.map(([l, d]) => { const st = ent(d).value; const on = st?.state === 'on'; return <span data-link="" onClick={() => openEntity(d)} data-on={on ? '' : undefined} data-kind={l === 'MOTION' ? 'motion' : 'ai'} data-na={!st || UNAVAIL.has(st.state) ? '' : undefined}>{l}<i>{!st || UNAVAIL.has(st.state) ? '--' : on ? 'NOW' : ago(st.last_changed)}</i></span>; })}</div>}
      </div>
      <div class="s-cv-ctl">
        <button class="s-cv-b s-cv-close" onClick={() => (camView.value = null)}>CLOSE<small>ESC</small></button>
        <div class="s-cv-h">ZOOM</div>
        <div class="s-cv-row s-cv-pm"><button class="s-cv-b" onClick={() => setZ(z.peek() / 1.25)} disabled={z.value <= 1}>−</button><button class="s-cv-b" onClick={() => setZ(z.peek() * 1.25)} disabled={z.value >= ZMAX}>+</button></div>
        <div class="s-cv-row">{[1, 2, 3, 4].map((n) => <button class="s-cv-b s-cv-lv" data-sel={Math.abs(z.value - n) < 0.05 ? '' : undefined} onClick={() => (n === 1 ? reset() : setZ(n, px.peek(), py.peek()))}>{n}X</button>)}</div>
        <div class="s-cv-h">PAN</div>
        <div class="s-cv-pad">
          <span /><button class="s-cv-b" onClick={() => pan(0, 0.1)} disabled={z.value <= 1}>▲</button><span />
          <button class="s-cv-b" onClick={() => pan(0.1, 0)} disabled={z.value <= 1}>◀</button><button class="s-cv-b" onClick={reset}>⦿</button><button class="s-cv-b" onClick={() => pan(-0.1, 0)} disabled={z.value <= 1}>▶</button>
          <span /><button class="s-cv-b" onClick={() => pan(0, -0.1)} disabled={z.value <= 1}>▼</button><span />
        </div>
        <button class="s-cv-b" onClick={reset} disabled={z.value === 1 && !px.value && !py.value}>RESET VIEW</button>
        <span class="s-cv-fill" />
        {v.kind === 'cam' ? <button class="s-cv-b" onClick={() => openEntity(id)}>DEVICE PAGE</button> : <button class="s-cv-b" onClick={() => window.open(v.w[2], '_blank', 'noopener')}>SOURCE PAGE</button>}
        <div class="s-cv-tip">SCROLL OR +/− TO ZOOM • DRAG TO PAN • DOUBLE-CLICK TO ZOOM IN / RESET</div>
      </div>
    </div>
  );
}

function SCameras() {
  const S = useRoom().status;
  if (camView.value) return <SCamViewer v={camView.value} key={camView.value.c?.[1] ?? camView.value.w?.[1]} />;
  const top = S.cameras.filter((c) => !c[2]), wide = S.cameras.filter((c) => c[2]);
  return <div class="s-cams" style={{ '--n': top.length + (S.webcams?.length ?? 0) }}>{top.map((c) => <SCam c={c} />)}{(S.webcams ?? []).map((w) => <SWebcam w={w} />)}{wide.map((c) => <SCam c={c} />)}</div>;
}
function StatusFrame() {
  const R = useRoom(); const S = R.status;
  const [fitRef, zoom] = useFit();
  const E = useStatusEval(S);
  const g = (k) => S.groups.find((x) => x.key === k);
  const lamps = ['WATER', 'SEPTIC', 'THERMAL', 'SAFETY', 'ACCESS', 'NETWORK'];
  const pg = lamps.includes(sPage.value) || sPage.value === 'CAMERAS' ? sPage.value : 'STATUS';
  // most recent person detection on any camera: NOW while one is active, else time since the latest one changed
  const persons = S.cameras.flatMap(([, , , d]) => d.filter(([l]) => l === 'PERSON').map(([, x]) => ent(x).value)).filter((x) => x && !UNAVAIL.has(x.state));
  const personSeen = !persons.length ? 'PERSON --' : persons.some((x) => x.state === 'on') ? 'PERSON NOW'
    : `PERSON ${ago(Math.max(...persons.map((x) => (typeof x.last_changed === 'number' ? x.last_changed * 1000 : Date.parse(x.last_changed)))) / 1000)}`;
  const camNa = S.cameras.filter(([, c]) => { const st = ent(c).value; return !st || UNAVAIL.has(st.state); }).length;
  const sub = E.items.filter((x) => x.g === pg);
  const head = E.alerts ? `${E.alerts} ALERT${E.alerts > 1 ? 'S' : ''}` : E.warns ? `${E.warns} CAUTION` : 'NOMINAL';
  return (
    <div class="app k-app s-app">
      <div class="elbow-t"><span class="elbow-code">{code(`tiny-cabins-${R.key}`, 6)}</span></div>
      <header class="hd">
        <span class="corner-t"><i /></span>
        <span class="hd-bar" />
        <span class="hd-seg" style={{ background: E.alerts ? 'var(--bl-red)' : E.warns ? 'var(--bl-sunflower)' : 'var(--bl-tan)', width: '72px' }} />
        <span class="hd-seg hd-code">{head} • {BUILD}</span>
        <h1 class="hd-t">{R.title} • {pg === 'STATUS' ? 'MASTER SYSTEMS' : pg}</h1>
        <span class="hd-cap" />
      </header>
      <nav class="side" aria-label="System health">
        <button class="nav s-home" data-cur={pg === 'STATUS' ? '' : undefined} style={{ '--nav': 'var(--bl-amber)' }} onClick={() => goStatus('STATUS')}>
          <span class="nav-c">{head}</span><span class="nav-l">STATUS</span>
        </button>
        {lamps.map((k) => {
          const tone = E.groups[k] ?? 'na';
          return (
            <button class="nav k-mode s-lamp" data-sel="" data-cur={pg === k ? '' : undefined} data-alert={tone === 'alert' ? '' : undefined} style={{ '--nav': `var(--bl-${{ ok: 'tan', warn: 'sunflower', alert: 'red', na: 'rust' }[tone]})` }} onClick={() => goStatus(k)}>
              <span class="nav-c">{{ ok: 'NOMINAL', warn: 'CAUTION', alert: 'ALERT', na: 'NO SIGNAL' }[tone]}</span><span class="nav-l">{k}</span>
            </button>
          );
        })}
        <button class="nav s-home" data-cur={pg === 'CAMERAS' ? '' : undefined} data-alert={camNa ? '' : undefined} style={{ '--nav': `var(--bl-${camNa ? 'red' : 'violet'})` }} onClick={() => goStatus('CAMERAS')}>
          <span class="nav-c">{camNa ? `${camNa} OFFLINE` : personSeen}</span><span class="nav-l">CAMERAS</span>
        </button>
        <span class="side-fill" />
        {link.value.mode !== 'hass' && <button class="nav" style={{ '--nav': 'var(--bl-amber)' }} onClick={() => (linkOpen.value = true)}><span class="nav-c">07-00</span><span class="nav-l">LINK</span></button>}
      </nav>
      <main class="main s-main" ref={fitRef}>
        {pg === 'CAMERAS' ? (
          <div class="page s-dpage" style={{ width: `${S_W}px`, height: `${S_H}px`, zoom }}><SCameras /></div>
        ) : pg !== 'STATUS' ? (
          <div class="page s-dpage" style={{ width: `${S_W}px`, height: `${S_H}px`, zoom }}>
            <section class="panel s-dalerts">
              <SecHead title={sub.length ? `${pg} • ${sub.length} ${sub.length > 1 ? 'ITEMS NEED' : 'ITEM NEEDS'} ATTENTION` : `${pg} • ALL NOMINAL`} tone={sub.some((x) => x.tone === 'alert') ? 'red' : sub.length ? 'sunflower' : LAMP_TONE[pg]} />
              {sub.length > 0 && <div class="s-alist s-alist-h">{sub.map((x) => <div class="s-al" data-link="" onClick={() => openEntity(x.id)} data-tone={x.tone}><i>{x.g}</i><span>{x.l}</span><b>{x.v}</b></div>)}</div>}
            </section>
            <SDetail k={pg} />
          </div>
        ) : (
        <div class="page k-page s-page" style={{ width: `${S_W}px`, height: `${S_H}px`, zoom }}>
          <div class="k-colw">
            <section class="panel"><SecHead title="CHRONOMETER" tone="peach" /><KClock compact /></section>
            <section class="panel"><SecHead title="ATMOSPHERICS" tone="violet" /><SWeather /></section>
            <SOccupancy />
            <SPower />
          </div>
          <div class="k-colw">
            <SThermal />
            <SHumidity />
            <SGroup g={g('WATER')} cols={4} />
            <SGroup g={g('SEPTIC')} cols={2} />
          </div>
          <div class="k-colw">
            <SAlerts E={E} />
            <SGroup g={g('SAFETY')} cols={3} />
            <SGroup g={g('ACCESS')} cols={2} />
            <SGroup g={g('NETWORK')} cols={3} />
          </div>
        </div>
        )}
      </main>
      <div class="elbow-b" />
      <footer class="ft">
        <span class="corner-b"><i /></span>
        <span class="ft-bar" />
        <Fault />
        <span class="status k-foot">DISPLAY ONLY • REMOTE MONITORING</span>
        <StatusPill />
        <span class="ft-seg" />
        <span class="ft-cap" />
      </footer>
      <LinkPanel />
      <ReloadWatch />
    </div>
  );
}

/* ================= MOBILE (room: mobile) =================
   Portrait phone console: STATUS / CONTROL / CAMERAS tabs on a bottom LCARS bar.
   Physical controls (locks, water valve, heat tape, heat off) need a second tap within ARM_MS. */
const mTab = signal((() => { try { return localStorage.getItem('cabinlcars.mobile.tab') || 'STATUS'; } catch { return 'STATUS'; } })());
function goTab(t) { if (t !== 'CAMERAS') camView.value = null; mTab.value = t; try { localStorage.setItem('cabinlcars.mobile.tab', t); } catch {} try { dom.root.querySelector?.('.m-body')?.scrollTo?.(0, 0); } catch {} }
const mOpen = signal(null); // expanded subsystem on STATUS
const mArmed = signal(null); // { key, until }
const ARM_MS = 4000;
let mArmTimer;
/** First tap arms, second tap within ARM_MS runs. */
function mArmOrRun(key, run) {
  const a = mArmed.peek();
  if (a?.key === key && Date.now() < a.until) { mArmed.value = null; clearTimeout(mArmTimer); run(); return; }
  mArmed.value = { key, until: Date.now() + ARM_MS };
  clearTimeout(mArmTimer); mArmTimer = setTimeout(() => { if (mArmed.peek()?.key === key) mArmed.value = null; }, ARM_MS);
}
const mIsArmed = (key) => mArmed.value?.key === key;
function MBtn({ k, label, confirm, tone = 'tan', onRun, disabled, busy, sel }) {
  const on = confirm && mIsArmed(k);
  return (
    <button class="m-btn" data-tone={on ? 'red' : tone} data-sel={sel ? '' : undefined} data-armed={on ? '' : undefined} disabled={disabled || busy}
      onClick={() => (confirm ? mArmOrRun(k, onRun) : onRun())}>{busy ? 'WORKING' : on ? `TAP AGAIN • ${label}` : label}</button>
  );
}

function MLock({ c: [label, id, batt] }) {
  const st = ent(id).value; const b = num(ent(batt).value);
  const na = !st || UNAVAIL.has(st.state); const locked = st?.state === 'locked'; const busy = isPending(id) || st?.state === 'locking' || st?.state === 'unlocking';
  const tone = na ? 'na' : st.state === 'jammed' ? 'alert' : locked ? 'ok' : 'warn';
  return (
    <div class="m-card" data-tone={tone}>
      <div class="m-card-h" data-link="" onClick={() => openEntity(id)}><span>{label}</span><b>{na ? 'NO SIGNAL' : UP(st.state)}</b></div>
      <div class="m-card-s">{b == null ? 'BATTERY --' : `BATTERY ${Math.round(b)}%`}{st && !na ? ` • ${ago(st.last_changed)}` : ''}</div>
      <div class="m-row2">
        <MBtn k={`lock:${id}`} label="LOCK" tone="tan" sel={locked} disabled={na || locked} busy={busy} confirm onRun={() => call('lock', 'lock', {}, id)} />
        <MBtn k={`unlock:${id}`} label="UNLOCK" tone="sunflower" sel={!na && !locked} disabled={na || !locked} busy={busy} confirm onRun={() => call('lock', 'unlock', {}, id)} />
      </div>
    </div>
  );
}

const setTimers = {};
function MClimate({ c: [label, id] }) {
  const st = ent(id).value; const a = st?.attributes ?? {};
  const na = !st || UNAVAIL.has(st.state); const off = st?.state === 'off';
  const target = useSignal(null); // local set point while adjusting, committed after a pause
  const sp = target.value ?? a.temperature;
  const lo = a.min_temp ?? 41, hi = a.max_temp ?? 86, step = a.target_temp_step ?? 1;
  const bump = (d) => {
    const v = Math.max(lo, Math.min(hi, Math.round(((sp ?? a.current_temperature ?? 60) + d) / step) * step));
    target.value = v; clearTimeout(setTimers[id]);
    setTimers[id] = setTimeout(async () => { await call('climate', 'set_temperature', { temperature: v }, id); target.value = null; }, 1200);
  };
  const cur = a.current_temperature;
  const tone = na ? 'na' : cur != null && cur < 50 ? 'alert' : cur != null && cur > 85 ? 'alert' : 'ok';
  const modes = a.hvac_modes ?? ['off', 'heat'];
  return (
    <div class="m-card" data-tone={tone}>
      <div class="m-card-h" data-link="" onClick={() => openEntity(id)}><span>{label}</span><b>{na ? 'NO SIGNAL' : `${cur ?? '--'}°`}</b></div>
      <div class="m-card-s">{na ? '--' : `${UP(st.state)} • ${UP(a.hvac_action ?? 'idle')}`}</div>
      <div class="m-thermo">
        <button class="m-btn m-sq" disabled={na || off || sp == null || sp <= lo} onClick={() => bump(-step)} aria-label={`Lower ${label} set point`}>−</button>
        <div class="m-sp" data-pend={target.value != null ? '' : undefined}><small>{target.value != null ? 'SENDING' : 'SET'}</small><b>{off || sp == null ? 'OFF' : `${sp}°`}</b></div>
        <button class="m-btn m-sq" disabled={na || off || sp == null || sp >= hi} onClick={() => bump(step)} aria-label={`Raise ${label} set point`}>+</button>
      </div>
      <div class="m-row2">
        {modes.includes('heat') && <MBtn k={`heat:${id}`} label="HEAT" tone="rose" sel={st?.state === 'heat'} disabled={na || st?.state === 'heat'} busy={isPending(id)} onRun={() => call('climate', 'set_hvac_mode', { hvac_mode: 'heat' }, id)} />}
        <MBtn k={`off:${id}`} label="OFF" tone="sunflower" sel={off} disabled={na || off} busy={isPending(id)} confirm onRun={() => call('climate', 'set_hvac_mode', { hvac_mode: 'off' }, id)} />
      </div>
    </div>
  );
}

function MSwitch({ c: [label, id, onTxt, offTxt, warn] }) {
  const st = ent(id).value; const na = !st || UNAVAIL.has(st.state); const on = st?.state === 'on';
  const k = `sw:${id}`;
  return (
    <div class="m-card" data-tone={na ? 'na' : on ? 'ok' : 'warn'}>
      <div class="m-card-h" data-link="" onClick={() => openEntity(id)}><span>{label}</span><b>{na ? 'NO SIGNAL' : on ? onTxt : offTxt}</b></div>
      <div class="m-card-s">{mIsArmed(`${k}:off`) ? warn : st && !na ? `SINCE ${ago(st.last_changed)}` : '--'}</div>
      <div class="m-row2">
        <MBtn k={`${k}:on`} label={onTxt === 'OPEN' ? 'OPEN' : 'ON'} tone="tan" sel={on} disabled={na || on} busy={isPending(id)} confirm onRun={() => call('switch', 'turn_on', {}, id)} />
        <MBtn k={`${k}:off`} label={offTxt === 'CLOSED' ? 'CLOSE' : 'OFF'} tone="sunflower" sel={!na && !on} disabled={na || !on} busy={isPending(id)} confirm onRun={() => call('switch', 'turn_off', {}, id)} />
      </div>
    </div>
  );
}

function MControl() {
  const C = useRoom().status.controls;
  return (
    <div class="m-stack">
      <div class="m-note">CONTROLS ACT ON THE CABIN • RED BUTTONS NEED A SECOND TAP WITHIN 4 S</div>
      <SecHead title="LOCKS" tone="violet" />
      {C.locks.map((c) => <MLock c={c} />)}
      <SecHead title="HEATING" tone="rose" />
      {C.climate.map((c) => <MClimate c={c} />)}
      <SecHead title="WATER" tone="sky" />
      {C.switches.map((c) => <MSwitch c={c} />)}
    </div>
  );
}

function MStatus({ E }) {
  const S = useRoom().status;
  const keys = ['WATER', 'SEPTIC', 'THERMAL', 'SAFETY', 'ACCESS', 'NETWORK'];
  const tilesOf = (k) => { const seen = new Set(); return [...(S.groups.find((g) => g.key === k)?.tiles ?? []), ...(S.detail?.[k] ?? []).flatMap((p) => p.tiles ?? [])].filter((t) => !seen.has(t.id) && seen.add(t.id)); };
  return (
    <div class="m-stack">
      <section class="panel">
        <SecHead title={E.items.length ? `${E.items.length} ${E.items.length > 1 ? 'ITEMS NEED' : 'ITEM NEEDS'} ATTENTION` : 'ALL SYSTEMS NOMINAL'} tone={E.alerts ? 'red' : E.warns ? 'sunflower' : 'tan'} />
        {E.items.length > 0 && <div class="m-alist">{E.items.map((x) => <div class="s-al" data-link="" onClick={() => openEntity(x.id)} data-tone={x.tone}><i>{x.g}</i><span>{x.l}</span><b>{x.v}</b></div>)}</div>}
      </section>
      <section class="panel">
        <SecHead title="TEMPERATURES" tone="tan" />
        <div class="m-temps">{S.thermal.map(([l, id, o]) => { const v = tempOf(id); return <div class="m-temp" data-link="" onClick={() => openEntity(id)} data-tone={meterTone(v, o)}><span>{l}</span><b>{v == null ? '--' : `${Math.round(v)}°`}</b></div>; })}</div>
      </section>
      <section class="panel">
        <SecHead title="SUBSYSTEMS" tone="peach" />
        <div class="m-lamps">
          {keys.map((k) => {
            const tone = E.groups[k] ?? 'na'; const n = E.items.filter((x) => x.g === k).length;
            return <button class="m-lamp" data-tone={tone} data-cur={mOpen.value === k ? '' : undefined} onClick={() => (mOpen.value = mOpen.value === k ? null : k)}><span>{k}</span><b>{{ ok: 'NOMINAL', warn: `${n} CAUTION`, alert: `${n} ALERT`, na: 'NO SIGNAL' }[tone]}</b></button>;
          })}
        </div>
        {mOpen.value && <div class="m-sub"><SecHead title={mOpen.value} tone={LAMP_TONE[mOpen.value]} /><div class="s-tiles" style={{ '--cols': 2 }}>{tilesOf(mOpen.value).map((t) => <STile t={t} />)}</div></div>}
      </section>
    </div>
  );
}

function MCameras() {
  const S = useRoom().status;
  if (camView.value) return <SCamViewer v={camView.value} key={camView.value.c?.[1] ?? camView.value.w?.[1]} />;
  return <div class="m-stack m-cams">{S.cameras.map((c) => <SCam c={c} />)}{(S.webcams ?? []).map((w) => <SWebcam w={w} />)}</div>;
}

/** Fit the phone frame to the space below whatever Home Assistant draws above the card (its header,
 * or nothing in kiosk mode). Re-measured on resize and for a few seconds after load, since the header can change late. */
function useFitHeight() {
  const ref = useRef(null); const h = useSignal(null);
  useEffect(() => {
    const fit = () => { const el = ref.current; if (!el) return; const top = el.getBoundingClientRect().top + (window.scrollY || 0); const v = Math.round((window.visualViewport?.height ?? window.innerHeight) - Math.max(0, top)); if (v > 200 && (v !== h.peek()?.v || (top < 1) !== h.peek()?.top0)) h.value = { v, top0: top < 1 }; };
    fit(); const ts = [250, 1000, 2500, 5000].map((t) => setTimeout(fit, t));
    window.addEventListener('resize', fit); window.visualViewport?.addEventListener('resize', fit);
    return () => { ts.forEach(clearTimeout); window.removeEventListener('resize', fit); window.visualViewport?.removeEventListener('resize', fit); };
  }, []);
  return [ref, h.value];
}
function MobileFrame() {
  const R = useRoom(); const S = R.status;
  const [fitRef, fitH] = useFitHeight();
  const E = useStatusEval(S);
  const tab = ['STATUS', 'CONTROL', 'CAMERAS'].includes(mTab.value) ? mTab.value : 'STATUS';
  const camNa = S.cameras.filter(([, c]) => { const st = ent(c).value; return !st || UNAVAIL.has(st.state); }).length;
  const head = E.alerts ? `${E.alerts} ALERT${E.alerts > 1 ? 'S' : ''}` : E.warns ? `${E.warns} CAUTION` : 'NOMINAL';
  const unlocked = S.controls.locks.filter(([, id]) => ent(id).value?.state === 'unlocked').length;
  return (
    <div class="m-app" data-tab={tab} ref={fitRef} data-top0={!fitH || fitH.top0 ? '' : undefined} style={fitH ? { height: `${fitH.v}px` } : undefined}>
      <header class="m-hd">
        <span class="m-hd-cap" style={{ background: E.alerts ? 'var(--bl-red)' : E.warns ? 'var(--bl-sunflower)' : 'var(--bl-amber)' }}><b>{head}</b></span>
        <div class="m-hd-t"><h1>{R.title}</h1><small>{tab === 'STATUS' ? 'MASTER SYSTEMS' : tab} • {hm(clock.value)} • {BUILD}</small></div>
        {link.value.mode !== 'hass' ? <button class="m-menu" data-link-btn="" onClick={() => (linkOpen.value = true)}>LINK</button>
          : canMenu() && <button class="m-menu" onClick={toggleMenu} aria-label="Open Home Assistant menu">MENU</button>}
      </header>
      <main class="m-body">{tab === 'CONTROL' ? <MControl /> : tab === 'CAMERAS' ? <MCameras /> : <MStatus E={E} />}</main>
      <div class="m-fault"><Fault /></div>
      <nav class="m-tabs" aria-label="Sections">
        <button class="m-tab" data-cur={tab === 'STATUS' ? '' : undefined} style={{ '--nav': `var(--bl-${E.alerts ? 'red' : E.warns ? 'sunflower' : 'amber'})` }} onClick={() => goTab('STATUS')}><small>{head}</small>STATUS</button>
        <button class="m-tab" data-cur={tab === 'CONTROL' ? '' : undefined} style={{ '--nav': 'var(--bl-peach)' }} onClick={() => goTab('CONTROL')}><small>{unlocked ? `${unlocked} UNLOCKED` : 'LOCKED'}</small>CONTROL</button>
        <button class="m-tab" data-cur={tab === 'CAMERAS' ? '' : undefined} style={{ '--nav': `var(--bl-${camNa ? 'red' : 'violet'})` }} onClick={() => goTab('CAMERAS')}><small>{camNa ? `${camNa} OFFLINE` : `${S.cameras.length} FEEDS`}</small>CAMERAS</button>
      </nav>
      <LinkPanel />
      <ReloadWatch />
    </div>
  );
}

export const BUILD = 'v16';
function App({ room = 'bedroom' }) {
  const R = ROOMS[room];
  if (!R) return <div class="app" style={{ display: 'grid', placeItems: 'center' }}><div class="fault-line" style={{ fontSize: '28px' }}>UNKNOWN ROOM "{UP(room)}" • CONSOLE FILE BUILD {BUILD} • CHECK THE CARD'S room SETTING</div></div>;
  return <RoomCtx.Provider value={R}>{R.kiosk === 'mobile' ? <MobileFrame /> : R.kiosk === 'status' ? <StatusFrame /> : R.kiosk ? <KitchenFrame /> : <Frame />}</RoomCtx.Provider>;
}

export { App, ALL_IDS };
