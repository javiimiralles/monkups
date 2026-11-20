---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/components/Sidebar.tsx","src/styles.css"]
---

# Editor surface

Scope: the single-screen Monkups editor (top bar, stage, inspector, library dialog). Mode: Operate.
Job: paste or drop a screenshot, adjust frame and background, export. Constraint: editor chrome never enters the exported stage node.

## Direction contract

THESIS: The mockup is hung like a framed print on a gallery wall; the interface is the wall, the mat and one wall label. Refuses the dark left-sidebar-of-stacked-sections editor every mockup tool ships.
OWN-WORLD: Cool gallery-white wall (#eceef0), white panels, ink #1b1d1f, muted #6b7075, 1px hairlines #d9dcdf, one reserved gallery green (#2c5a4a) used only for the active choice, focus and Export. Small-caps wall-label headings, system UI sans, tabular figures.
STORY: The user sees their mockup first, understands at a glance what will be exported, changes it from one inspector without scrolling through everything, and exports from one place.
FIRST VIEWPORT: 52px top bar (Monkups, New, Templates, Projects left; format segment, scale segment, Copy, Export right). Stage centered on the wall inside a bevelled mat. Wall label under the mat: dimensions, ratio, format. 300px right inspector with tabs Frame, Background, Extras. Empty stage is the drop target.
FORM: Passe-partout (museum mat board and gallery wall labels), position 3 of 7 on the grounded list, seed:0f613bede2911f35. Raises: one reserved colour (orienteering), rows that never shift (split-flap), one-pixel hairlines and three values (centre-rail).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
