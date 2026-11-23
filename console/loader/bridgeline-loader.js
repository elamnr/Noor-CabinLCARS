// Bridgeline console loader. Lovelace resource: /local/bridgeline-loader.js (type: module).
// Reads the deployed commit from bridgeline-version.json (never cached) and imports the
// matching console bundle, so a new deploy reaches every screen on its next reload
// without editing the Lovelace resource or clearing browser caches.
(async () => {
  let v = String(Date.now());
  try {
    const r = await fetch('/local/bridgeline-version.json', { cache: 'no-store' });
    if (r.ok) v = (await r.json()).sha || v;
  } catch (e) { /* fall back to a timestamp: always fresh, never cached */ }
  await import(`/local/bridgeline-bedroom-console.js?v=${encodeURIComponent(v)}`);
})();
