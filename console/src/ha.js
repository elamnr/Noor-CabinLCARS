// Home Assistant link layer: WebSocket client (subscribe_entities, compressed diffs),
// OAuth / long-lived-token auth, and a simulation backend with the same interface.
import { signal, batch } from '@preact/signals';

const STORE = 'bridgeline.bedroom.auth';
export const LS = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

/** One signal per entity; components that read .value re-render only for that entity. */
const registry = new Map();
export function ent(id) {
  let s = registry.get(id);
  if (!s) { s = signal(undefined); registry.set(id, s); }
  return s;
}
/** link.mode: init | sim | connecting | live | auth | error */
export const link = signal({ mode: 'init', detail: '' });
export const fault = signal(null);
/** true once the first full entity snapshot has arrived (undefined entity after this = not found) */
export const ready = signal(false);
export const pending = signal({});

let backend = null;
export const hassUrl = () => backend?.base ?? backend?.auth?.hassUrl ?? '';
export function setBackend(b) { backend = b; }
/** Media-library access for shared sounds; null until a backend that supports it is linked. */
export function mediaApi() {
  const b = backend;
  if (!b?.mediaBrowse) return null;
  return {
    browse: (id) => b.mediaBrowse(id),
    resolve: (id) => b.mediaResolve(id),
    upload: (folder, file) => b.mediaUpload(folder, file),
    remove: (id) => b.mediaRemove(id),
    fetchUrl: (url) => b.mediaFetch(url),
  };
}
/** weather.get_forecasts for one entity; resolves to [] when unsupported. */
export async function getForecast(eid, type) {
  if (!backend) return [];
  if (backend.forecast) return backend.forecast(eid, type);
  const r = await backend.send({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type }, target: { entity_id: eid }, return_response: true });
  return r?.response?.[eid]?.forecast ?? [];
}
/** Service call that returns data (return_response); throws when there is no link. */
export async function serviceResponse(domain, service, data = {}, target) {
  if (!backend) throw new Error('NO LINK');
  if (backend.serviceResponse) return backend.serviceResponse(domain, service, data, target);
  const r = await backend.send({ type: 'call_service', domain, service, service_data: data, ...(target ? { target } : {}), return_response: true });
  return r?.response;
}
/** Device-registry entry by device name (VIN = serial_number); null when unavailable. */
export async function getDevice(name) {
  if (!backend?.device) return null;
  try { return await backend.device(name); } catch { return null; }
}
/** Calendar events between two Date objects; resolves to [] when unsupported. */
export async function getEvents(eid, start, end) {
  if (!backend?.events) return [];
  return backend.events(eid, start.toISOString(), end.toISOString());
}

export async function call(domain, service, data = {}, entityId, targets) {
  if (!backend) return;
  const key = entityId ?? `${domain}.${service}`;
  pending.value = { ...pending.value, [key]: true };
  const t0 = performance.now();
  try {
    await backend.callService(domain, service, data, targets ? { entity_id: targets } : entityId ? { entity_id: entityId } : undefined);
  } catch (e) {
    fault.value = { msg: `${domain}.${service} ${e?.message ?? e?.code ?? 'FAILED'}`, t: Date.now() };
  } finally {
    const wait = Math.max(0, 180 - (performance.now() - t0));
    setTimeout(() => { const p = { ...pending.value }; delete p[key]; pending.value = p; }, wait);
  }
}

/* ---------------- compressed state handling ---------------- */
function inflate(c) {
  return { state: c.s, attributes: c.a ?? {}, last_changed: c.lc, last_updated: c.lu ?? c.lc };
}
function applyCompressed(ev) {
  batch(() => {
    if (ev.a) for (const [id, c] of Object.entries(ev.a)) ent(id).value = inflate(c);
    if (ev.c) for (const [id, d] of Object.entries(ev.c)) {
      const s = ent(id); const cur = s.peek(); if (!cur) continue;
      const n = { ...cur, attributes: { ...cur.attributes } };
      const p = d['+'];
      if (p) {
        if ('s' in p) n.state = p.s;
        if (p.a) Object.assign(n.attributes, p.a);
        if ('lc' in p) { n.last_changed = p.lc; n.last_updated = p.lc; }
        if ('lu' in p) n.last_updated = p.lu;
      }
      if (d['-']?.a) for (const k of d['-'].a) delete n.attributes[k];
      s.value = n;
    }
    if (ev.r) for (const id of ev.r) ent(id).value = null;
    if (ev.a) ready.value = true;
  });
}

/* ---------------- auth ---------------- */
class Auth {
  constructor(d) { this.d = d; }
  get hassUrl() { return this.d.hassUrl; }
  get accessToken() { return this.d.access_token; }
  async token() {
    if (this.d.kind === 'oauth' && Date.now() > this.d.expires - 30000) await this.refresh();
    return this.d.access_token;
  }
  async refresh() {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.d.refresh_token, client_id: this.d.clientId });
    const r = await fetch(`${this.d.hassUrl}/auth/token`, { method: 'POST', body });
    if (!r.ok) throw new Error(`TOKEN REFRESH ${r.status}`);
    const j = await r.json();
    this.d.access_token = j.access_token;
    this.d.expires = Date.now() + j.expires_in * 1000;
    if (this.d.persist) LS.set(STORE, this.d);
  }
}

export function startOAuth(url) {
  const hass = url.replace(/\/+$/, '');
  const clientId = `${location.origin}/`;
  const redirect = `${location.origin}${location.pathname}`;
  const state = btoa(JSON.stringify({ hassUrl: hass, clientId }));
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirect, state });
  location.href = `${hass}/auth/authorize?${q}`;
}

async function finishOAuth() {
  const q = new URLSearchParams(location.search);
  const code = q.get('code'); const st = q.get('state');
  if (!code || !st) return null;
  history.replaceState(null, '', location.pathname);
  const { hassUrl, clientId } = JSON.parse(atob(st));
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: clientId });
  const r = await fetch(`${hassUrl}/auth/token`, { method: 'POST', body });
  if (!r.ok) throw new Error(`TOKEN EXCHANGE ${r.status}`);
  const j = await r.json();
  const d = { kind: 'oauth', persist: true, hassUrl, clientId, access_token: j.access_token, refresh_token: j.refresh_token, expires: Date.now() + j.expires_in * 1000 };
  LS.set(STORE, d);
  return d;
}

export function saveLongLived(url, token) {
  LS.set(STORE, { kind: 'llat', persist: true, hassUrl: url.replace(/\/+$/, ''), access_token: token.trim() });
  location.reload();
}
export function forgetLink() { LS.del(STORE); location.href = `${location.pathname}?sim=1`; }

/* ---------------- websocket client ---------------- */
class Socket {
  constructor(auth, ids) {
    this.auth = auth; this.ids = ids; this.n = 1; this.pend = new Map(); this.subs = new Map();
    this.backoff = 1000; this.dead = false;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ws?.readyState > 1 && !this.dead) { clearTimeout(this.retry); this.open(); }
    });
    setInterval(() => this.ping(), 30000);
  }
  open() {
    link.value = { mode: 'connecting', detail: this.auth.hassUrl };
    const ws = this.ws = new WebSocket(`${this.auth.hassUrl.replace(/^http/, 'ws')}/api/websocket`);
    ws.onmessage = async (e) => {
      const m = JSON.parse(e.data);
      switch (m.type) {
        case 'auth_required':
          try { ws.send(JSON.stringify({ type: 'auth', access_token: await this.auth.token() })); }
          catch (err) { link.value = { mode: 'auth', detail: String(err.message) }; this.dead = true; ws.close(); }
          break;
        case 'auth_ok':
          this.backoff = 1000;
          link.value = { mode: 'live', detail: `HA ${m.ha_version}` };
          this.subscribe({ type: 'subscribe_entities', entity_ids: this.ids }, applyCompressed);
          break;
        case 'auth_invalid':
          link.value = { mode: 'auth', detail: m.message }; this.dead = true; ws.close(); break;
        case 'result': {
          const p = this.pend.get(m.id); if (!p) break;
          this.pend.delete(m.id); m.success ? p.res(m.result) : p.rej(m.error); break;
        }
        case 'event': this.subs.get(m.id)?.(m.event); break;
        case 'pong': clearTimeout(this.pongWait); break;
      }
    };
    ws.onclose = () => {
      for (const p of this.pend.values()) p.rej({ message: 'LINK LOST' });
      this.pend.clear(); this.subs.clear();
      if (this.dead) return;
      link.value = { mode: 'connecting', detail: 'RETRY' };
      this.retry = setTimeout(() => this.open(), this.backoff);
      this.backoff = Math.min(this.backoff * 2, 30000);
    };
  }
  ping() {
    if (this.ws?.readyState !== 1) return;
    this.ws.send(JSON.stringify({ type: 'ping', id: this.n++ }));
    this.pongWait = setTimeout(() => this.ws.close(), 10000);
  }
  send(msg) {
    return new Promise((res, rej) => {
      if (this.ws?.readyState !== 1) return rej({ message: 'NO LINK' });
      const id = this.n++; this.pend.set(id, { res, rej });
      this.ws.send(JSON.stringify({ ...msg, id }));
    });
  }
  subscribe(msg, cb) {
    const id = this.n++; this.subs.set(id, cb);
    this.pend.set(id, { res() {}, rej: (e) => { fault.value = { msg: `SUBSCRIBE ${e.message}`, t: Date.now() }; } });
    this.ws.send(JSON.stringify({ ...msg, id }));
  }
  callService(domain, service, service_data, target) {
    return this.send({ type: 'call_service', domain, service, service_data, target });
  }
  async device(name) { const l = await this.send({ type: 'config/device_registry/list' }); return l.find((d) => d.name_by_user === name || d.name === name) ?? null; }
  mediaBrowse(id) { return this.send({ type: 'media_source/browse_media', media_content_id: id }); }
  mediaResolve(id) { return this.send({ type: 'media_source/resolve_media', media_content_id: id }); }
  mediaRemove(id) { return this.send({ type: 'media_source/local_source/remove', media_content_id: id }); }
  async mediaUpload(folder, file) {
    const fd = new FormData(); fd.append('media_content_id', folder); fd.append('file', file, file.name);
    const r = await fetch(`${this.auth.hassUrl}/api/media_source/local_source/upload`, { method: 'POST', headers: { Authorization: `Bearer ${await this.auth.token()}` }, body: fd });
    if (r.status === 401 || r.status === 403) throw new Error('ADMIN LOGIN REQUIRED');
    if (!r.ok) throw new Error(`UPLOAD FAILED ${r.status}`);
    return r.json();
  }
  mediaFetch(url) { return fetch(/^https?:/.test(url) ? url : `${this.auth.hassUrl}${url}`); }
  async events(eid, start, end) {
    const r = await fetch(`${this.auth.hassUrl}/api/calendars/${eid}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { headers: { Authorization: `Bearer ${await this.auth.token()}` } });
    if (!r.ok) throw new Error(`CALENDAR ${r.status}`);
    return r.json();
  }
}

/* ---------------- boot ---------------- */
export async function boot(ids, seed, simulate) {
  const q = new URLSearchParams(location.search);
  let d = null;
  try { d = await finishOAuth(); } catch (e) { fault.value = { msg: e.message, t: Date.now() }; }
  if (!d && !q.has('sim')) d = LS.get(STORE);
  // Served from HA itself (/local/...): reuse the frontend's session if present, else log in.
  const onHA = /^\/(local|hacsfiles)\//.test(location.pathname);
  if (!d && onHA && !q.has('sim')) {
    const t = LS.get('hassTokens');
    if (t?.refresh_token) d = { kind: 'oauth', persist: false, ...t, hassUrl: t.hassUrl || location.origin };
    else { startOAuth(location.origin); return; }
  }
  if (d) {
    backend = new Socket(new Auth(d), ids);
    backend.open();
  } else {
    backend = simulate(seed);
    ready.value = true;
    link.value = { mode: 'sim', detail: typeof __ROOM__ !== 'undefined' && __ROOM__ === 'status' ? 'CABIN SNAPSHOT 2026-11-22' : 'SNAPSHOT 2026-10-29' };
  }
}
