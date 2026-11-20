# Text, logos and CTA buttons on the canvas
Branch: feat/phase-7-text-logos (stacked on feat/phase-6-multi-screen; needs its selection and drag system) · Delivery: ask-on-risk (forecast ~800 authored lines) · Runner: Vitest (`pnpm test`) · Package manager: pnpm only

## Specs

- S1 "Poder añadir logos o texto para crear diseños con CTAs. Ejemplo en la imagen 2" (image 2: logo top-left, large headline "Premiamos tus compras", pill button "DESCARGAR APP", one phone on the right over a gradient).
- S2 Assumption: three overlay kinds: Text, Button (text on a filled pill) and Logo (uploaded PNG/SVG/JPEG).
- S3 Assumption: overlays are placed freely (drag), sized proportionally to the stage so they keep their look at 1x/2x and across aspect ratios, and always sit above the device screens.
- S4 Assumption: overlays stay still while an animation preset moves the screens.
- S5 "También quiero que añadas al plan la edición de texto directamente sobre el canvas." (applies to Text and Button overlays).

## Tasks

- [ ] T1 S2-S3 Domain: `Overlay` types and defaults, sizes in % of stage width, `restoreSettings` default `overlays: []`, unit tests — route: inline — Risk: item 1 (persisted format) — own commit
- [ ] T2 S1-S3 Store + persistence: unified selection `{ kind: 'screen' | 'overlay', id }`, add/update/remove/duplicate/reorder, keyboard (Delete, arrows nudge, Ctrl+D), logo blobs in ProjectRecord — route: inline — Risk: item 1 — own commit
- [ ] T3 S1, S3-S4 Stage: render overlays above the screens and outside the animation group, drag + corner resize handles outside the exported node — route: inline
- [ ] T4 S1-S2 Sidebar "Text & logos" group: add Text / Button / Logo, inspector per kind, curated fonts — route: inline — Risk: item 5 (new font dependencies) — own commit
- [ ] T5 S5 Inline text editing on the stage (double-click to edit, commit on blur / click outside, Escape cancels) — route: inline
- [ ] T6 S1, S5 CTA templates (e.g. "CTA Left", "Hero Headline") + headless Chrome verification + independent verifier (items 1, 5) — route: inline + delegated verifier

## Log

- L1 (2026-11-20) "Vamos con la siguiente fase del proyecto. Quiero que crees planes de implementación para las siguientes tareas: [...] - Poder añadir logos o texto para crear diseños con CTAs. Ejemplo en la imagen 2 [...]"
- L2 (2026-11-20) Plan.
  - Model (T1): `Settings.overlays: Overlay[]`, each `{ id, kind, x, y, width, rotation, opacity }` with `x/y/width` in % of the stage. Text: `{ text, font, size, weight, italic, color, align, lineHeight, letterSpacing, uppercase }` with `size` in % of stage width (scales with export like the watermark does today: `width * 0.022`). Button: text props + `{ fill, textColor, radius, padX, padY, border }`. Logo: `{ size: { width, height } }`; the image itself lives in the store as a blob URL, like the uploaded background.
  - Why a separate list from screens: overlays above screens covers both reference images; one z-order across screens and overlays is not needed yet and would complicate the animation group.
  - Selection (T2): extends phase 6 `selectedScreen` to `selection: { kind, id } | null`. Clicking empty stage clears it. The window paste handler already has to ignore text inputs (phase 6 L2); also ignore keyboard shortcuts while typing.
  - Persistence: `ProjectRecord.overlayImages?: Record<overlayId, Blob>`; `openProject` recreates the URLs and `releaseUrls` revokes them.
  - Stage (T3): overlays render in a layer after `sceneFront`, before the watermark, outside the pose wrapper (S4). Text wraps at `width`; the corner handle changes `width` (Text/Logo) or scales `size` with Shift. Handles live in the same non-exported overlay used by phase 6.
  - Fonts (T4): a curated set bundled locally with `@fontsource-variable/*` (the project already uses `@fontsource-variable/hanken-grotesk`), nothing fetched from Google at runtime (product principle "local and private"). Candidates: Inter, Hanken Grotesk, DM Sans, Space Grotesk, Fraunces, Instrument Serif (the italic serif in image 4). Before committing, verify that modern-screenshot embeds each @font-face in PNG and video exports (a font that falls back is a silent bug).
  - Inspector (T4): textarea for content (Enter = new line), font, weight, size, colour, align, letter spacing, uppercase; button adds fill, text colour, radius, padding; logo: replace image, width, opacity. The textarea stays as a second way to edit (S5 adds the inline one).
  - Templates (T6): CTA templates ship placeholder text ("Your headline", "Download app") plus one phone screen placed right, ratio 16:9; applying a template keeps the user's screen media (current rule).
  - Verification (T6): export PNG 2x and MP4 of a CTA design and compare fonts visually; save, reload, reopen (overlays + logo blob); a design without overlays exports pixel-identical to phase 6; inline edit -> export shows the new text with no caret or outline.
  - Out of scope (not asked): snapping guides, text effects (shadow, gradient text), rich text with mixed styles, overlays behind screens.
- L3 (2026-11-20) "También quiero que añadas al plan la edición de texto directamente sobre el canvas." Added S5 and T5; templates/verification moved to T6.
- L4 Plan for T5 (inline editing):
  - Double-click a selected Text/Button overlay (or Enter while selected) turns its text node into `contentEditable="plaintext-only"` in place, so the caret sits in the real font, size and wrap width; the stage `scale(fit)` transform does not affect editing. Focus and select all on entry.
  - Commit on blur or click outside (writes `text` through the store, one update); Escape restores the original text; Enter inserts a new line; pasting inserts plain text only.
  - While editing: drag/resize handles are hidden, the window paste handler and the Delete/arrow/Ctrl+D shortcuts ignore the event (target is editable), and the export/preview buttons are disabled, so the caret and focus ring never reach an export.
  - Empty text after commit keeps the overlay with a placeholder in the editor only ("Type something"), never exported; deleting stays explicit (Delete key or button).
  - Test: store-level unit test for commit/cancel; headless Chrome check: double-click, type, click outside, export, read the text from the exported image visually.
