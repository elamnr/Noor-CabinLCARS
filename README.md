# Noor-CabinLCARS

LCARS-style Home Assistant consoles for Tiny Cabins (Log Cabin and Bunk House), built on the Bridgeline design system.
Forked from `elamnr/Noor-LCARS` @ 4b2a4d5 (Retro House). See `docs/HANDOFF.md` for the architecture this repo inherits.

## Consoles
| Room key | Card | Screen |
|---|---|---|
| `status` | `type: custom:cabin-lcars`, `room: status` | Master Systems Status, landscape desktop, display only |

The Retro House room definitions (bedroom, office, entry, house, kitchen) are still in `console/src/rooms.js` and unused here.

## Deploy
- Lovelace resource: `/local/cabin-lcars-loader.js` (type `module`).
- Files served from `/config/www/`: `cabin-lcars.js`, `cabin-lcars-loader.js`, `cabin-lcars-version.json`.
- Push to `main` → GitHub Action builds, tests, publishes the `deploy` branch, then calls `HA_WEBHOOK_URL` (repo secret) so HA runs `shell_command.cabin_lcars_deploy` (`!secret cabin_lcars_deploy_cmd`, template in `console/deploy/secrets.example.yaml`).
- Reload helpers: `input_button.cabin_lcars_reload_all`, `input_button.cabin_lcars_reload_kitchen`.

## Palette
Sea Pine, a Cabin-only override at the end of `console/src/app.css`. Bridgeline tokens (`--bl-*`) are unchanged.
