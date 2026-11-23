# Noor-LCARS

LCARS-style Home Assistant consoles for Retro House, built on the **Bridgeline** design system.

| Folder | What it is |
|---|---|
| `console/` | The consoles: one Lovelace custom card (`custom:bridgeline-console`) serving five rooms, plus standalone simulation previews. Preact + signals, bundled with esbuild. See `console/README.md` for deployment, decisions on record and open items. |
| `design-system/` | The Bridgeline design system the consoles were built from: tokens (`tokens/*.css`), React components, guideline specimen pages, UI kits. See `design-system/README.md`. |
| `docs/screenshots/` | Simulation previews of each console. |

## Consoles

| Dashboard | Card config | Device |
|---|---|---|
| `bedroom-console` | `custom:bridgeline-bedroom-console` | Bedroom tablet |
| `office-console` | `custom:bridgeline-console`, `room: office` | Office tablet |
| `entry-console` | `custom:bridgeline-console`, `room: entry` | Basement entry tablet |
| `house-console` | `custom:bridgeline-console`, `room: house` | Retro House main tablet |
| `kitchen-console` | `custom:bridgeline-console`, `room: kitchen` | Kitchen TV (display only) |

## Build and deploy

Deployment is automatic. A push to `main` that touches `console/` runs `.github/workflows/deploy.yml`:

1. `npm ci`, `node build.mjs`, then `node tests/ci.js` (every room and page, kitchen modes, and the Lovelace card bundle in every room). Any failure stops the run; nothing is published.
2. The built `bridgeline-bedroom-console.js`, `bridgeline-loader.js` and `bridgeline-version.json` (`{sha, build}`) are force-pushed as a single commit to the `deploy` branch.
3. The workflow POSTs `{"sha": ...}` to the Home Assistant webhook in the `HA_WEBHOOK_URL` repository secret.
4. The HA automation **Bridgeline Console Deploy** runs `shell_command.bridgeline_deploy`, which downloads the three files from the `deploy` branch with a read-only fine-grained token, swaps them into `/config/www/` atomically, and notifies on success or failure.

The Lovelace resource is `/local/bridgeline-loader.js` (module). The loader reads `bridgeline-version.json` uncached and imports the bundle with `?v=<sha>`, so screens pick up a deploy on their next reload with no resource edit and no cache clearing. Other branches never deploy, so design work can be previewed and iterated before it reaches `main`.

`console/dist/` is build output and is not committed. Manual build:

```
cd console
npm ci
npm run build        # -> dist/bridgeline-bedroom-console.js (+ preview HTML)
npm test             # CI checks (Playwright 1.63; run `npx playwright install chromium` once)
```

### Home Assistant side

`configuration.yaml`:

```yaml
shell_command:
  bridgeline_deploy: !secret bridgeline_deploy_cmd
```

`secrets.yaml` holds the full command, including the token (never commit it). Template in `console/deploy/secrets.example.yaml`.

## Previews and tests

`console/dist/<room>-console.html` runs against a simulation snapshot (`?room=` overrides, `?kmode=calendar|camera` for the kitchen modes). `console/tests/ci.js` is the deploy gate; the other scripts in `console/tests/` are screenshot and layout probes used during design work.

## Notes

- Car cutaway images in `console/src/img/` were supplied by the owner and are bundled into the card as data URLs.
- No credentials, tokens or VINs are stored in source. The VIN on the vehicle SYSTEM DETAILS screen is read at runtime from the Home Assistant device registry.
- `design-system/` is the Bridgeline export as published. Its README cites a reference wallpaper (`uploads/LCARS-2021-iPhone-SE-8-Picard.png`) that is deliberately **not** included here because it is third-party artwork.
