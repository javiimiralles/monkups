# MCP design bridge — let Claude Code design in Monkups through an MCP server
Branch: feat/mcp-design-bridge · Delivery: ask-on-risk (forecast ~450 authored lines) · Runner: Vitest (`pnpm test`) · Package manager: pnpm only
Architecture: Streamable HTTP MCP endpoint mounted on the Vite dev server (`/mcp`), forwarding tool calls to the open tab over the HMR channel.

## Specs

- S1 "quiero añadir un chat de IA. El usuario podrá poner su api key (de momento probemos con la de anthropic) y chatear con la IA para que le haga el diseño según sus preferencias" — superseded by S2.
- S2 "en vez de poner como un chat de IA ahí no se podría hacer un MCP?" / "es para mí, así que hagamos el mcp" — Claude Code edits the current design through MCP tools; dev server only.
- S3 Tool `get_design`: current settings as JSON (no blob URLs) plus which screens hold an image and its aspect.
- S4 Tool `apply_design`: zod-validated partial settings patch. Screens map by index and keep their ids (media survives); text/button overlays are replaced, logos kept; image backgrounds and logos are out of scope.
- S5 Tool `get_preview`: PNG capture of the stage returned as an image.
- S6 No open tab → error after a timeout telling the user to open Monkups in the browser.
- S7 `.mcp.json` registers the server for Claude Code; short doc note.

## Tasks

- [x] T1 S3-S4 Domain `src/domain/designPatch.ts` (schema, applyDesignPatch, describeDesign) + tests — route: inline — 29f5220
- [x] T2 S3-S5 Browser bridge `src/mcp/bridge.ts` (HMR listener, re-validation, selection cleanup, preview capture) — route: inline — 25a6480
- [x] T3 S2, S6 Vite plugin `src/mcp/vitePlugin.ts` + `vite.config.ts` — route: inline — Risk: item 2 (local endpoint), item 5 (new dependencies) — 25a6480
- [x] T4 S7 `.mcp.json`, doc note, end-to-end check, independent verifier — route: inline + delegated verifier — 25a6480 + verifier fixes

## Log

- L1 (2026-11-20) "quiero añadir un chat de IA. El usuario podrá poner su api key (de momento probemos con la de anthropic) y chatear con la IA para que le haga el diseño según sus preferencias"
- L2 (2026-11-20) "bueno y en vez de poner como un chat de IA ahí no se podría hacer un MCP?" → "es para mí, así que hagamos el mcp. Haz el plan de implementación" → "apruebo el plan"
- L3 Decision: MCP inside the Vite dev server (no extra process, reuses HMR websocket); Vite host check + localhost-only CORS guard the endpoint. No undo yet: save the project before letting Claude edit.
- L4 (2026-11-20) Verification. `pnpm test` 117 passed, `tsc` clean, build has no bridge/MCP/zod. End to end with headless Chrome: tools/list exposes the device enums; apply_design (iPhone, 16:9, tilt, dark gradient, headline) rendered as expected in get_preview; invalid ratio → validation error; no tab → error after 10 s (S6). Endpoint: foreign Host → 403, foreign-origin preflight gets no Allow-Origin, text/plain POST → 415, body > 4 MB → 413, HMR socket needs Vite's token.
- L5 Independent verifier (items 2, 5): no blockers. Fixed: bridge loaded only in DEV (zod out of the build), duplicate overlay ids rejected, rotation/radius ranges match the UI. Accepted advisories: logos move below text when overlays are patched; schema allows some values wider than the UI sliders; every open tab applies a patch (first answer wins); GET /mcp keeps an idle SSE stream.
- L6 Usage: `pnpm dev` (port 5173), open the app, then in Claude Code the `monkups` server from `.mcp.json` exposes get_design / apply_design / get_preview. Save the project first: there is no undo.
- L7 (2026-11-20) User: /mcp showed "SDK auth failed: Dynamic Client Registration rejected (HTTP 404)". Cause: Vite SPA fallback answered OAuth discovery (/.well-known/oauth-*) with 200 index.html, so Claude Code attempted OAuth. Fix: those paths return 404; tools/list unaffected, tsc clean, 117 tests pass.
