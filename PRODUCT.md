# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single user: the developer who built it. They use it to turn screenshots of their own projects into presentable mockup images and short videos, quickly, between other work.

## Product Purpose

Monkups turns a screenshot into a finished mockup: device frame, background, frame style, 3D rotation, scene overlays, watermark and optional animation, then exports PNG/JPEG (1x/2x, download or clipboard) or MP4/WebM/GIF. Success is going from a pasted screenshot to an exported asset in seconds, without hunting for controls.

## Positioning

A private, browser-only alternative to hosted mockup tools: no backend, no accounts, no payments, no analytics. Everything runs and stays on the user's machine.

## Operating Context

Desktop browser. Input arrives by file picker, drag and drop, or Ctrl+V paste. Templates and projects are stored locally (IndexedDB). Unsplash backgrounds need the user's own API key.

## Capabilities and Constraints

- Frames: screenshot, iPhone, iPad, MacBook, Safari/Chrome browser windows (light/dark), drawn in SVG/CSS; third-party frame assets must not be copied.
- Aspect ratios: 4:3 default (1920×1440), 1:1, 4:5, 3:4, 2:3, 9:16, 16:9, 3:2, 5:4.
- Export renders the stage DOM, so editor chrome must never leak into the exported image.
- Video export uses WebCodecs and is only offered when an animation preset is active.

## Product Principles

1. The canvas is the product; the interface stays out of its way.
2. The shortest path is paste → adjust → export.
3. Local and private by default; nothing leaves the machine unless the user asks (Unsplash).
