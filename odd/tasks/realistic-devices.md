# Realistic devices — 3D laptop and phone rendered with real lighting
Branch: feat/phase-8-realistic-devices (stacked on feat/phase-7-text-logos) · Delivery: ask-on-risk (forecast ~900 authored lines) · Runner: Vitest (`pnpm test`) · Package manager: pnpm only
Status: approach A (three.js) confirmed by the user (L4). Implement last, after multi-screen.md and text-and-logos.md.

## Specs

- S1 "poder hacer diseños más realistas con dispositivos (de momento con un portatil y un movil me sirve). Estos son algunos ejemplos: [Image #3] [Image #4]" (image 3: laptop + phone together, soft light, reflections, contact shadows; image 4: open laptop seen at an angle on a surface, keyboard visible).
- S2 Assumption: realistic devices are new device options that plug into the phase 6 screens, so a laptop and a phone can share one canvas (image 3).
- S3 Assumption: each realistic device has camera angle presets (Front, 3/4 Left, 3/4 Right, Low hero, Top) and a colour (Silver, Space Black).

## Tasks

- [ ] T1 S1 Spike (go/no-go): WebGL canvas inside the stage is captured by PNG/JPEG export and by per-frame video export at 2x; measure frame render time — route: inline — Risk: item 5 (new dependency `three`)
- [ ] T2 S1, S3 Procedural phone model (rounded body, camera island, glass screen with the screenshot as texture, PBR materials, contact shadow) — route: inline (parallel writer with T3 only if both start together)
- [ ] T3 S1, S3 Procedural laptop model (lid + base hinge, drawn keyboard and trackpad, screen texture) — route: inline (see T2)
- [ ] T4 S2-S3 Integration: `kind: '3d'` devices in the catalog, lazy-loaded renderer chunk, Sidebar angle/colour controls, transparent canvas over existing backgrounds/scenes — route: inline
- [ ] T5 S1-S3 Animation presets drive the 3D camera, video export, headless Chrome verification + independent verifier (item 5) — route: inline + delegated verifier

## Log

- L1 (2026-11-20) "Este cambio sería para lo último: poder hacer diseños más realistas con dispositivos (de momento con un portatil y un movil me sirve). Estos son algunos ejemplos: [Image #3] [Image #4]"
- L2 (2026-11-20) Analysis. Today's frames are flat CSS (DeviceFrame.tsx, em geometry) with a CSS 3D rotation; the references are photographic renders (material, reflections, depth, visible keyboard, contact shadow) that CSS cannot reach. Three approaches:
  - A (recommended) Real-time 3D with `three`: devices modelled in code (no third-party model files, respecting the PRODUCT.md rule against copied frame assets), `MeshPhysicalMaterial` + `RoomEnvironment` for studio lighting without an HDR file, screenshot as screen texture. Any angle, works with existing rotation/animation. Cost: one dependency (~170 kB gzip, lazy-loaded only when a realistic device is used), the most code, and the export path must capture WebGL (T1 spike).
  - B Better CSS: hinged lid/base planes, CSS keyboard, phone side thickness, gradient lighting. No dependency, stays in today's pipeline, but realism stays well below the references, and nested `preserve-3d` may flatten in modern-screenshot's foreignObject export.
  - C Photo mockups: device photos with a known screen quad; the screenshot is warped with CSS `matrix3d`. The most photographic and least code, but fixed angles, each photo needs a licence that allows it, and it conflicts with the "drawn by us" rule.
- L3 Plan for A:
  - Rendering: one transparent WebGL canvas per realistic screen, sized to its layout rect at export resolution (re-rendered at 2x before a 2x export), so backgrounds, scenes, overlays and the watermark keep working as DOM layers. Six contexts stay under the browser limit (~16).
  - Export (T1): modern-screenshot must copy canvas pixels; WebGL needs `preserveDrawingBuffer: true` or an explicit render right before capture. Fallback if capture fails: export composites the canvas into the frame with `drawImage`. Video: the per-frame `flushSync` playhead loop must also trigger a synchronous 3D render.
  - Models (T2-T3): built from `RoundedBoxGeometry`/`ExtrudeGeometry`; keyboard and trackpad drawn once to a `CanvasTexture`; screen = emissive texture + a thin clearcoat glass layer for reflections; contact shadow = blurred shadow plane (`ContactShadows`-style render target) under each device.
  - Integration (T4): `DeviceKind` gains `'3d'` with `model: 'phone' | 'laptop'`; `deviceAspect` uses the projected bounds for the chosen angle; the existing CSS 3D rotation is disabled for 3D devices (camera angle replaces it). Renderer module is a dynamic import like the video exporter.
  - Tests: unit tests for angle presets -> camera pose and aspect; geometry is checked visually (headless Chrome screenshots of each angle) because no unit test can catch "looks wrong" (item 6 noted).
- L4 (2026-11-20) "La opción de threejs me parece bien." Approach A confirmed; B and C discarded.
