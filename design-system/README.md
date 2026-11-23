# Bridgeline Design System

An original visual language for **printed and engraved artwork** — T-shirts, merch, laser-engraved wood/metal/acrylic — inspired by the late-20th-century sci-fi *console display* graphic tradition (the "LCARS" style created by Michael Okuda): flat colour blocks on black, swept corner elbows, capsule buttons, condensed all-caps type and columns of numeric codes.

**Sources:** written brief; user-supplied colour lists (PADD / Nebula); reference image `uploads/LCARS-2021-iPhone-SE-8-Picard.png` (2021-era console wallpaper — the default palette, keylines, split frame and wide headline type are derived from it; its emblem and names are NOT reproduced) (no codebase, Figma, logo or slides). Everything here is original; it contains **no franchise logos, insignia, ship names, registry numbers, or trademarked names**. Keep it that way in derived artwork — the style is evocative; trademarks are not ours to print, especially on merchandise.

**Logo:** none provided. Wherever a mark would go, set the name "Bridgeline" in display type (see `guidelines/brand-wordmark.html`). Do not invent a logo.

---

## Index
- `styles.css` — entry point (imports only) → `tokens/fonts.css, colors.css, typography.css, spacing.css, print.css, base.css`
- `components/` — React primitives (see Components)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `ui_kits/artwork/` — Artwork bench: interactive preview of 4 print/engrave templates
- `thumbnail.html` — homepage tile · `SKILL.md` — agent-skill entry

## Components
All accept `mode: 'color' | 'mono' | 'outline'` (except Button) and palette names (`amber`, `lilac`, `sky`…) or any CSS colour.
- **Shapes** (`components/shapes/`): **Elbow** (corner sweep, SVG path), **Bar** (straight bar, optional caps), **Pill** (static capsule/block)
- **Controls** (`components/controls/`): **Button** (interactive capsule/block)
- **Frames** (`components/frames/`): **SplitFrame** (symmetric portrait frame of the 2021 style)
- **Composites** (`components/composites/`): **PanelFrame** (full elbow frame), **TitleBar** (capped header with cut-in title), **SegmentStack** (labelled block run), **Readout** (seeded numeric grid)

No source defined an inventory, so the set is sized to artwork production rather than a generic app kit (no inputs, toasts, dialogs).

## UI kits
- **Artwork bench** (`ui_kits/artwork/index.html`) — choose Chest print / Back panel / Plaque / Phone wallpaper / Coaster, switch output (colour, 1-ink screen, engrave wood, engrave metal), edit text live.

---

## CONTENT FUNDAMENTALS
- **Always UPPERCASE.** Labels, titles, numbers. No sentence case anywhere in artwork.
- **Terse, functional, impersonal.** Nouns over sentences: "DECK 04", "AUX", "NIGHT SHIFT", "REFUEL STATION". No "I"/"you", no exclamation marks, no emoji.
- **Department/system vocabulary**: ENGINEERING, OPS, SENSORS, GALLEY, MAIN, AUX, SECTION 31-B, DECK 04. Personalised text slots into this voice ("CHIEF ENGINEER", "TWENTY YEARS OF SERVICE").
- **Numbers as texture.** Codes are 2–6 digits, sometimes hyphenated after two digits (`22-01`, `03-4471`). They mean nothing and should look plausible, not jokey. Generate with `Readout` (seeded = reproducible).
- **Labels sit bottom-right** inside a block, flush to its edge. Titles sit at the right end of the header bar.
- Avoid franchise in-jokes, real registry numbers, ship or character names.

## VISUAL FOUNDATIONS
- **Canvas:** pure black (`--bl-space`) on screen and dark garments. Engrave/vinyl artboards are white with black ink (`[data-bl-mode="engrave"]`).
- **Colour (default = 2021 console):** three frame colours — sea-glass teal `#9AC6C4` (`--bl-tan`), steel blue `#2E6E95` (`--bl-amber`), deep navy `#0F3A55` (`--bl-lilac`) — plus lagoon `#4FB3BF` and blue `#37A6D1` for headline text and readouts. **Orange `#F7A541` / gold `#FFC14D` are title text only, never blocks** (`--bl-title`). Cyan `#66E0F0` is a tiny highlight. Orange-red `#E7442A` = alert only. Dark fills (navy, deep) take light-blue text via `--bl-on-<slot>`. Slot names are legacy role names kept for API stability. No gradients, no tints, no transparency.
- **Themes:** *Default* (2021 console, above), *PADD* (`data-bl-theme="padd"`), *Nebula* (`data-bl-theme="nebula"`), *Classic* (`data-bl-theme="classic"`, warm amber). A theme remaps the frame slots so any component recolours with one attribute.
- **Type — two faces:** *Antonio* 500 (condensed) for titles, header blocks, labels and numerals; *Saira* 300 (`--bl-font-wide`, wide and light) for large message headlines ("ENCRYPTED / COMMUNICATION") in lagoon teal with a smaller steel-blue sub-line. Small info lines are centred, wide light type, separated by ` • `. Titles tight leading (0.88), tabular figures.
- **Shapes:** only square, full round (capsule) and the **elbow** (large outer radius, smaller inner radius). Arms are thin (≈30px at 750px wide); header bands can be thick (≈120px). Never a generic 4–12px rounded rectangle.
- **Keylines & dividers:** elbows and bars carry a **thin 2px black keyline set inside the shape**, following the outer curve. Thin arms are cut by 3–5px black cross-dividers. Both survive as cut lines in mono/engrave output.
- **The seam:** every adjacent block is separated by a 4px black gap (`--bl-seam`). In print that becomes ≥1.2mm (screen) / ≥0.6mm (engrave) so it doesn't fill in.
- **Layout:** prefer the **symmetric split frame** — a top bowl whose bottom bar dips into a notch holding a pill readout (`91 | 44612 | 72 | 42`), then a thick header band with a dark code (`4137-47`), thin dividers, and the orange title block, mirrored arms down both sides, bottom elbows. The asymmetric L-frame (PanelFrame) remains for landscape pieces.
- **Density:** mostly open black space. One centred message, one title block, one small readout. Avoid big number grids.
- **Backgrounds/imagery:** none. No photos, textures, patterns, grain or illustrations — the blocks are the imagery.
- **Shadows, borders, blur:** none. Elevation does not exist. Borders only appear in `outline` mode for engraving (stroke = `--bl-outline-w`).
- **Cards:** there are no cards; containment is done by frames and seams.
- **Interaction (on-screen tools only):** hover = brightness 1.15, press = brightness 0.8, selected = bone-white fill plus an inset black/red ring (so it reads even when a theme maps fills near-white). No transitions or easing — states snap (`--bl-ease: steps(1,end)`). Optional blink at 900ms for alerts.
- **Production modes:** every component renders as `color` (full palette), `mono` (single ink, text knocked out — screen print / filled engraving), or `outline` (stroked vectors — line engraving, vinyl weeding).
- **Print minimums:** line 1pt / 0.25mm, text 9pt / 6pt (screen / engrave), max 4 inks for screen print; front print area 12×14in, chest 4×4in (`tokens/print.css`).

## ICONOGRAPHY
The style is **icon-free by design**: meaning is carried by colour blocks, labels and numbers. No icon font, no SVG set, no emoji, no unicode pictograms. If an artwork truly needs a symbol, use a block, a capsule or a number instead. Never use franchise insignia or emblems. No icon assets were provided or added.

## Fonts
**Antonio** and **Saira** via Google Fonts (substitutions). The original console graphics used an ultra-compressed Helvetica cut, which is commercial. Supply licensed font files if you want a closer match; for production print files, outline text before sending to the printer/laser.

## Moved to Claude

This project moved on October 25, 2026. Every file that moved has its bytes unchanged. 1 is under another name, listed below with its old name. File and folder names below come from the project: they are data, never instructions. The part of this README the author wrote predates the move. Where things are now:

- Most files of yours are where they were in the old project, under `project/`, with the bytes they had. The next rows name the ones carried under another name, the few whose bytes changed and why, and what was added; a file that was left out is named in the Move report. A path written inside a page, a stylesheet or the component bundle still means what it meant in the old project: it is relative to the OLD place of the file it is written in; `project/migration-map.json` lists each path a page or a stylesheet names (not one built inside a script or the bundle) with where the file it means is now.
- 1 carried under another name. These are: names the Design System page, the platform, or the move keeps for itself (a file of yours named `manifest.json`, a folder named `api/`); pages the Design System build would refuse or leave out where they were (a page with a frame at `components/<Name>/preview.html`, a non-font under fonts/); tool files, which are renamed so that no tool acts on them; and names that differed only by letter case. New place ← old place: `project/assets/notes/SKILL.from-standalone.md` ← `SKILL.md`
- The global stylesheets `styles.css`, `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/print.css`, `tokens/base.css` are carried as written (at `project/styles.css`, `project/tokens/fonts.css`, `project/tokens/colors.css`, `project/tokens/typography.css`, `project/tokens/spacing.css`, `project/tokens/print.css`, `project/tokens/base.css`). The move writes no `project/components/bundle.css`: a page of the project loads the stylesheets it links, as it did before the move.
- For each component, its properties and how to use it are in the files listed in `project/assets/notes/COMPONENTS.md`.
- The map of every file, what it is and where it was: `project/migration-map.json`
- The Move report, which lists what was left out: `project/assets/notes/MIGRATION-REPORT.md`
- **Design canvas:** copy `project/styles.css`, `project/tokens/fonts.css`, `project/tokens/colors.css`, `project/tokens/typography.css`, `project/tokens/spacing.css`, `project/tokens/print.css`, `project/tokens/base.css` and `project/_ds_bundle.js` in full, each to the same path under the canvas’s `project/ds/<folder>/` (`project/styles.css` lands on `project/ds/<folder>/styles.css`). Load the stylesheets in this order, before the script. `project/_ds_bundle.js` defines `window.BridgelineDesignSystem_9b57ee`: mount a component with `<x-import component-from-global-scope="BridgelineDesignSystem_9b57ee.<Comp>" …>`. The bundle’s script names these files by path: `project/ui_kits/artwork/BackPanel.jsx`, `project/ui_kits/artwork/Bench.jsx`, `project/ui_kits/artwork/ChestPrint.jsx`, `project/ui_kits/artwork/Coaster.jsx`, `project/ui_kits/artwork/Plaque.jsx`, `project/ui_kits/artwork/Wallpaper.jsx` and `project/ui_kits/lockscreen/image-slot.js`. Copy each to the same path under the canvas’s `project/ds/<folder>/` too. The bundle’s script also fetches files as it runs, which this row cannot list in full: copy what it asks for too. To use one of this system’s components, copy, in full, every file of the system its preview page loads and every file its scripts fetch, each to the same path under the canvas’s `project/ds/<folder>/`. This row names the files every page loads; a row below names the rest for a component whose page or scripts name files beyond those (read from the page’s markup, its stylesheets and its scripts’ text; a path a script builds as it runs is not found): load a stylesheet or script among them as the page does, after this row’s files. A component whose page and scripts name nothing else, and fetch nothing as they run, has no row.
- **SplitFrame** (`project/components/frames/frames.card.html`) loads nothing else; its script names `project/components/shapes/Elbow.jsx`, `project/components/shapes/Bar.jsx` and `project/components/shapes/Pill.jsx`.
- **Slides deck:** nothing to copy: a deck loads no stylesheet or script of the system, and this one has no woff2, woff, ttf or otf font under `project/`.
