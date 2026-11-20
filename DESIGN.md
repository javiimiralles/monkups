---
name: Monkups
description: A private, browser-only editor that hangs a screenshot like a framed print and exports it.
colors:
  wall: "#eceef0"
  panel: "#ffffff"
  mat: "#f8f8f7"
  ink: "#1b1d1f"
  muted: "#5f6469"
  faint: "#9a9fa4"
  line: "#d9dcdf"
  hover: "#f2f3f4"
  accent: "#2c5a4a"
  accent-strong: "#234a3d"
  accent-soft: "#e6eeea"
  danger: "#a3342b"
  frame: "#cfd2d4"
  placeholder: "#e9ebed"
  preview-wall-light: "#c9ced3"
  preview-wall-dark: "#9aa1a8"
  preview-media-light: "#dfe6ef"
  preview-media-dark: "#b4c2d3"
  preview-sky: "#9cc3e4"
  preview-field: "#6f8f6a"
  preview-forest: "#4d6b4a"
typography:
  headline:
    fontFamily: "'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 550
    letterSpacing: "-0.01em"
    lineHeight: 1.45
  title:
    fontFamily: "'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
    lineHeight: 1.45
  body:
    fontFamily: "'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  caption:
    fontFamily: "'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Hanken Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.06em"
    fontFeature: "tnum"
rounded:
  none: "0px"
  sm: "6px"
  md: "7px"
  lg: "12px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    height: "32px"
  button-hover:
    backgroundColor: "{colors.hover}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: "6px 18px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  segment-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    height: "30px"
  choice-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
    height: "32px"
  tab:
    textColor: "{colors.muted}"
    height: "44px"
  tab-active:
    textColor: "{colors.ink}"
  modal:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.lg}"
    padding: "16px 20px 20px"
    width: "min(880px, 92vw)"
  tag:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

# Design System: Monkups

## Overview

**Creative North Star: "The Passe-partout"**

The editor is a gallery wall and the stage is a matted print hung on it. Everything that is not the print is wall, mat, or label: a cool gallery-white field, white panels separated by one-pixel hairlines, and a single wall label under the work that states what will be exported. The interface recedes so the canvas reads first; the product is the picture, not the tool.

Density is quiet and compact. Controls sit at 13px on a 32px row, inspector groups are separated by hairlines rather than cards, and the chrome is light, flat and achromatic. Colour is spent once: a deep gallery green marks the active choice, keyboard focus and the Export action, and nothing else. The editor deliberately refuses the dark left sidebar of stacked sections that mockup tools usually ship; the inspector is a light, tabbed panel on the right.

**Key Characteristics:**
- Light, cool, achromatic chrome; one reserved green.
- The stage is framed by a bevelled mat drawn entirely with stacked box-shadow rings.
- Hairline separation (1px) instead of cards or fills.
- Small-caps, letter-spaced labels in the manner of a museum wall label, with tabular figures.
- System UI sans throughout; hierarchy by weight and case, not size.

## Colors

A cool gallery-white neutral range with one deep green accent held in reserve.

### Primary
- **Gallery Green** (accent): the only chromatic UI colour. Fills the Export button, outlines and tints the active inspector choice, underlines the active tab, rings the selected swatch and the focused slider thumb, and draws the global 2px focus outline. Also recolours the mat while a file is dragged over the stage.
- **Deep Gallery Green** (accent-strong): hover state of the primary button only.
- **Green Wash** (accent-soft): fill of the active choice, text selection, the focus halo on slider thumbs, and the mat face during drag.

### Neutral
- **Gallery Wall** (wall): the page background behind the stage; the wall the print hangs on.
- **Panel White** (panel): top bar, inspector, dialog, and default control fill.
- **Mat Board** (mat): the warm off-white mat around the stage.
- **Gallery Ink** (ink): all primary text, and the fill of the active top-bar segment.
- **Label Grey** (muted): secondary text, inactive tabs, slider values, section labels, link buttons, placeholders.
- **Faint Grey** (faint): disabled text and the project-name separator.
- **Hairline** (line): every 1px border and divider, slider tracks, the outer mat edge.
- **Hover Grey** (hover): hover fill for default buttons; disabled slider thumb.
- **Frame Grey** (frame): the inner frame rings of the mat.
- **Placeholder Grey** (placeholder): empty image fill on the stage and in library cards.
- **Oxide Red** (danger): text colour of destructive buttons only (Delete).

### Named Rules
**The One Reserved Colour Rule.** Gallery Green appears only on the active choice, focus, and Export (plus the drag-over mat). It never decorates, never fills a panel, never colours an idle control. Sliders stay neutral until focused.

**The Ink-for-Segments Rule.** The top-bar segmented controls (format, scale, library tabs) mark the active option in solid Gallery Ink with white text; inspector choices mark it in green. Mode switches are ink; content choices are green.

## Typography

**Display Font:** none (no display face)
**Body Font:** Hanken Grotesk (variable, self-hosted from @fontsource-variable/hanken-grotesk; falls back to system-ui, -apple-system, Segoe UI)

**Character:** One clean neo-grotesk, close to a museum's label face, at small sizes, given hierarchy by weight, uppercase tracking and tabular figures rather than by scale. It should feel like a gallery's printed labels, not a marketing page.

### Hierarchy
- **Headline** (550, 18px, 1.45, -0.01em): the empty-stage prompt only.
- **Title** (600, 15px, -0.01em): the Monkups wordmark in the top bar.
- **Body** (400, 13px, 1.45): every control, tab, and body text; the root size.
- **Caption** (400, 12px): hints, the Replace image button, card tags.
- **Label** (600, 11px, 0.06em, uppercase, tabular figures): inspector section headings and the wall label under the stage. Qualifiers inside a label (counts, status) drop back to sentence case without tracking.

### Named Rules
**The Wall Label Rule.** Uppercase tracking is reserved for labels that name or measure (section headings, dimensions, ratio, format). It is never used for prose, buttons, or decorative lead-ins.

**The Export Face Rule.** The exported stage keeps the system stack (`.stage`), so changing the editor face never changes exported images or watermarks.

**The Tabular Figures Rule.** Every number the user reads as a value (slider outputs, the wall label) uses tabular figures so rows never shift as values change.

## Layout

A fixed two-column application grid: a 52px top bar across the top, the wall filling the remaining width, and a 300px inspector on the right. The stage is centred on the wall with generous padding (96px top and sides, 64px bottom) so the mat and its shadow have room; the wall label sits centred beneath it. The inspector scrolls internally; groups stack with 16px padding and 10px internal gaps, divided by hairlines.

Spacing runs on small steps (4, 6, 8, 12, 16, 20px): 6px between choice buttons and swatches, 8–12px between top-bar clusters, 16px group padding, 20px row gap in library cards.

Below 860px the inspector moves under the wall: the grid becomes a single column, the wall takes `minmax(340px, 55vh)`, the top bar wraps, and stage padding tightens to 88px / 52px / 56px.

## Elevation & Depth

The chrome is flat: panels, the top bar and controls carry no shadow and are separated only by hairlines. Depth is reserved for the things that are physically "hung": the matted stage and the library dialog. The mat itself is drawn as concentric box-shadow rings (frame, bevel, frame, 40px mat face, mat edge) with one soft drop shadow beneath.

### Shadow Vocabulary
- **Hung print** (`0 28px 48px -16px rgba(27, 29, 31, 0.3)`): the drop shadow under the stage mat.
- **Floating dialog** (`0 24px 64px -16px rgba(27, 29, 31, 0.4)`): the library modal over a 35% ink backdrop.
- **Thumb lift** (`0 0 0 1px #a9aeb3, 0 1px 2px rgba(27, 29, 31, 0.15)`): slider thumbs only.

### Named Rules
**The Flat-Chrome Rule.** Interface surfaces never cast shadows. Only the print and the dialog are lifted off the wall.

**The Mat-Ring Rule.** Frames and mats are drawn with stacked spread-only box-shadow rings (no blur), never with borders or nested wrappers. Library card previews use the same device at small scale.

## Shapes

Gently rounded controls (7px) on square-cornered artwork. The mat, the stage, the empty drop zone and card previews are square (0 radius), as a print in a mat is. The colour input uses 6px, the dialog 12px, and template tags are full pills. Slider thumbs are circles. Dashed 1px borders mark drop and upload targets.

## Components

### Buttons
Restrained and flat; hover is a tonal shift, never a lift.
- **Shape:** gently rounded (7px), 32px minimum height, 1px Hairline border.
- **Default:** Panel White fill, Gallery Ink text; hover to Hover Grey. Transitions 120ms ease-out on background, border and colour.
- **Primary (Export):** Gallery Green fill and border, white 600 text, wider padding (6px 18px); hover to Deep Gallery Green. Disabled is a pale green-grey with white text.
- **Ghost:** transparent border and fill (top-bar navigation).
- **Icon:** 32px square, transparent border, inline SVG at 16px stroke 1.5.
- **Link:** no border or padding, Label Grey underlined text; hover to Ink.
- **Danger:** default button with Oxide Red text.

### Segmented control
A single hairline-bordered capsule (7px) of flush buttons divided by hairlines. The active segment fills solid Gallery Ink with white text. Used for format, scale and library tabs.

### Choice group
Equal-width bordered buttons in an auto-fit grid with 6px gaps. The active choice takes a green border, an inset 1px green ring, Green Wash fill and green 550 text.

**Preview tiles.** Where an option changes how the mockup looks (device, aspect ratio, style, corner, shadow, fill, scene), the choice becomes a tile: a 48px thumbnail above a 12px caption. Thumbnails are rendered by the same code as the stage (`DeviceFrame`, `shadowCss`, `sceneLayer`, `backgroundCss`) inside a virtual scene scaled down, so a tile always shows what the option applies; style, corner and shadow tiles crop to the frame's top-left corner. The `preview-*` colours are only the neutral wall and sample media painted inside thumbnails, never UI colour. Disabled tiles grey their thumbnail out. Animation presets stay text-only.

### Inputs / Fields
- **Style:** Panel White, 1px Hairline, 7px radius, 32px tall. Selects use a custom 12px chevron in Label Grey.
- **Focus:** the global 2px Gallery Green outline, offset 2px.
- **Sliders:** 2px Hairline track and a 14px white thumb with a grey ring; hover rings it in Ink, focus rings it in green with a Green Wash halo, disabled greys it out.
- **Colour wells:** 44 x 28px, 6px radius, hairline border.
- **Swatches:** square tiles in a 6-column grid; selected gets a 2px white gap and a 1px green ring.

### Navigation
- **Top bar:** 52px, Panel White with a bottom hairline. Wordmark (Title) with the project name after a faint slash; ghost buttons for New, Templates, Projects; segments and Export pushed right.
- **Inspector tabs:** flat, 44px, Label Grey; the active tab is Ink 600 with a 2px green underline drawn as an inset shadow.

### Stage mat (signature)
The bevelled passe-partout around the stage: Frame Grey ring, 6px bevel, Frame Grey ring, 40px Mat Board face, Hairline edge, and the Hung print shadow. While a file is dragged over, every ring recolours to green and Green Wash (180ms). The empty stage is a square dashed drop target over the mat with a Headline prompt and a muted hint. The wall label below states dimensions, ratio and format in Label style.

### Library cards
Unbordered buttons whose preview is a miniature mat (hairline, 5px Mat Board, hairline) at 4:3; hover or the active project recolours the rings green (160ms). Name below in Body, metadata in Label Grey.

## Do's and Don'ts

### Do:
- **Do** spend Gallery Green only on the active choice, focus, Export and the drag-over mat.
- **Do** separate regions with 1px Hairline (#d9dcdf) borders, not fills or cards.
- **Do** draw frames and mats with spread-only box-shadow rings and keep artwork corners square.
- **Do** use 11px uppercase labels with 0.06em tracking and tabular figures for anything that names or measures.
- **Do** keep controls at 13px on a 32px row with a 7px radius.
- **Do** disable all transitions under `prefers-reduced-motion: reduce`.

### Don't:
- **Don't** colour idle controls, slider tracks or panels with the accent.
- **Don't** put shadows on the top bar, inspector, groups or buttons.
- **Don't** introduce a display face or large type in the chrome; the largest editor text is the 18px empty-stage prompt.
- **Don't** use uppercase tracking for prose, buttons or lead-in lines above headings.
- **Don't** let editor chrome styles reach the export stage; rules below the "Export stage" comment in `src/styles.css` render into images and are not part of this system.
