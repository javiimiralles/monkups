# Monkups — browser-only mockup generator inspired by Shots (shots.so)
Branch: one per phase, stacked (feat/phase-1-core -> feat/phase-2-devices) · Delivery: ask-on-risk · Runner: Vitest (`npm test`)
Stack: Vite + React + TypeScript, Zustand, modern-screenshot (DOM -> image export), Vitest.

## Specs

- S1 "funcionará solo en el navegador y solo para mi": no backend, no accounts, no payments, no analytics.
- S2 Phase 1 — Core: load a screenshot by file picker, drag & drop, or paste (Ctrl+V).
- S3 Phase 1 — "Screenshot" frame around the media with adjustable corner radius (Sharp/Curved/Round presets + slider) and shadow modes None/Spread/Hug with opacity.
- S4 Phase 1 — Background: Transparent, Solid color, Gradient (presets + custom colors).
- S5 Phase 1 — Frame aspect ratios: Default 4:3 (1920×1440), 1:1, 4:5, 3:4, 2:3, 9:16, 16:9, 3:2, 5:4.
- S6 Phase 1 — Export PNG or JPEG at 1x or 2x, download and copy to clipboard.
- S7 Phase 2 — Device frames (iPhone, iPad, MacBook, browser Safari/Chrome light/dark) drawn by us in SVG/CSS; Shots' frame assets must not be copied.
- S8 Phase 3 — Styles (Glass Light/Dark, Inset Light/Dark, Outline, Border), 3D rotation, scenes (shadow/shape overlays), watermark, image backgrounds and Unsplash.
- S9 Phase 4 — Presets/templates and local project storage (IndexedDB).
- S10 Phase 5 — Animation (zoom + presets) and video export MP4/WebM/GIF via WebCodecs.

## Tasks

- [x] T1 S1-S6 Phase 1 core editor — route: inline — commit: see L5
- [x] T2 S7 Phase 2 device frames — route: inline — commit: see L6
- [ ] T3 S8 Phase 3 styles & scenes — route: inline — commit: pending
- [ ] T4 S9 Phase 4 templates & local storage — route: inline — commit: pending
- [ ] T5 S10 Phase 5 animation & video export — route: inline — commit: pending

## Log

- L1 (2026-11-18) "Usa REA para entender cómo funciona la aplicación de generación de mockups Shots, cuya web está abierta en Chrome (CDP en http://127.0.0.1.9222). Genera una implementación por fases de una aplicación que haga sus funciones principales llamada Monkups. Haz las preguntas que necesites y escoge un stack"
- L2 (2026-11-18) "funcionará solo en el navegador y esolo para mi"
- L3 REA findings: Shots renders the scene as DOM + CSS 3D transforms and exports via SVG foreignObject -> canvas -> toBlob; video via WebCodecs. Engram: "Shots.so reverse-engineering findings".
- L4 Decision: Vite instead of Next.js (no SSR need); Phase 6 (accounts/payments) dropped per L2.
- L5 (2026-11-18) T1 done. Evidence: 6 Vitest tests green (frameSize, shadowCss, backgroundCss); tsc + vite build OK; in-Chrome run via CDP: paste -> media shown; Export 1x PNG 1920x1440, 2x PNG 3840x2880, 1x JPEG 1920x1440, 9:16 PNG 1080x1920. Bug found and fixed: modern-screenshot sized the export from the CSS-scaled preview (708x531); now passes offsetWidth/offsetHeight. Copy-to-clipboard not exercised (needs a focused page + permission). Next: T2 device frames on branch feat/phase-2-devices.
- L6 (2026-11-19) "Continua con la fase 2". T2 done on feat/phase-2-devices: 12 devices in 5 families (Screenshot; Safari/Chrome light/dark; iPhone 17 Pro, 17 Pro Max, 16; iPad Pro 11/13; MacBook Air 13, Pro 14), all drawn in CSS with em geometry (device = 100em wide). Evidence: 13 Vitest tests green (fitBox, deviceAspect, catalog); tsc + vite build OK; headless Chrome (own profile, port 9333 — user's 9222 Chrome was closed) rendered each family and exported iPhone 17 Pro and Screenshot at 1920x1440 correctly. Border section hidden for hardware frames (fixed corners). Not done: orientation toggle, device colors, more models (Watch, iMac, Pixel). Next: T3 styles & scenes.
