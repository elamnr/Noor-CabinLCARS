// Lovelace custom card wrapper: <bridgeline-bedroom-console>.
// Home Assistant hands the card a `hass` object on every state change; no tokens or sockets needed.
import { render } from 'preact';
import { batch } from '@preact/signals';
import { App, ALL_IDS, dom } from './app.jsx';
import { ent, link, ready, setBackend } from './ha.js';
import CSS from './card.css.txt';

const TAG = 'bridgeline-bedroom-console';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&family=Saira:wght@100..500&display=swap';

class BridgelineBedroomConsole extends HTMLElement {
  setConfig(config) { this._config = config || {}; }
  getCardSize() { return 12; }
  getGridOptions() { return { columns: 'full', rows: 'auto' }; }

  connectedCallback() {
    if (this._root) return;
    if (!document.head.querySelector(`link[data-bl-fonts]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONT_HREF; l.dataset.blFonts = '';
      document.head.appendChild(l);
    }
    this._root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS;
    const mount = document.createElement('div');
    this._root.append(style, mount);
    if (this._config?.theme) this.dataset.blTheme = this._config.theme;
    dom.root = this._root;
    render(<App room={this._config?.room || this.constructor.defaultRoom} />, mount);
    if (this._hass) this._sync(this._hass);
  }

  set hass(h) {
    this._hass = h;
    if (!this._backend) {
      this._backend = {
        base: location.origin,
        callService: (domain, service, data, target) => this._hass.connection.sendMessagePromise({ type: 'call_service', domain, service, service_data: data, target }),
        serviceResponse: async (domain, service, data, target) => (await this._hass.connection.sendMessagePromise({ type: 'call_service', domain, service, service_data: data, ...(target ? { target } : {}), return_response: true }))?.response,
        forecast: async (eid, type) => {
          const r = await this._hass.connection.sendMessagePromise({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type }, target: { entity_id: eid }, return_response: true });
          return r?.response?.[eid]?.forecast ?? [];
        },
        mediaBrowse: (id) => this._hass.connection.sendMessagePromise({ type: 'media_source/browse_media', media_content_id: id }),
        mediaResolve: (id) => this._hass.connection.sendMessagePromise({ type: 'media_source/resolve_media', media_content_id: id }),
        mediaRemove: (id) => this._hass.connection.sendMessagePromise({ type: 'media_source/local_source/remove', media_content_id: id }),
        mediaUpload: async (folder, file) => {
          const fd = new FormData(); fd.append('media_content_id', folder); fd.append('file', file, file.name);
          const r = await this._hass.fetchWithAuth('/api/media_source/local_source/upload', { method: 'POST', body: fd });
          if (r.status === 401 || r.status === 403) throw new Error('ADMIN LOGIN REQUIRED');
          if (!r.ok) throw new Error(`UPLOAD FAILED ${r.status}`);
          return r.json();
        },
        mediaFetch: (url) => fetch(url),
        device: async (name) => Object.values(this._hass.devices ?? {}).find((d) => d.name_by_user === name || d.name === name) ?? null,
        events: (eid, start, end) => this._hass.callApi('GET', `calendars/${eid}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
      };
      setBackend(this._backend);
    }
    this._sync(h);
  }

  _sync(h) {
    const prev = this._prev || {};
    batch(() => {
      for (const id of ALL_IDS) {
        const s = h.states[id];
        if (s !== prev[id]) ent(id).value = s ?? undefined;
        prev[id] = s;
      }
      if (!ready.peek()) ready.value = true;
      const conn = h.connected === false ? { mode: 'connecting', detail: 'RETRY' } : { mode: 'hass', detail: `HA ${h.config?.version ?? ''}` };
      if (link.peek().mode !== conn.mode) link.value = conn;
    });
    this._prev = prev;
  }
}

BridgelineBedroomConsole.defaultRoom = 'bedroom';
class BridgelineConsole extends BridgelineBedroomConsole {}
BridgelineConsole.defaultRoom = 'bedroom';
window.customCards = window.customCards || [];
if (!customElements.get(TAG)) {
  customElements.define(TAG, BridgelineBedroomConsole);
  window.customCards.push({ type: TAG, name: 'Bridgeline Bedroom Console', description: 'LCARS-style Primary Bed console' });
}
if (!customElements.get('bridgeline-console')) {
  customElements.define('bridgeline-console', BridgelineConsole);
  window.customCards.push({ type: 'bridgeline-console', name: 'Bridgeline Console', description: 'LCARS-style room console (room: bedroom | office | entry | house)' });
}
