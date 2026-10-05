# Baseline layouts

The baseline units and the "Browse baseline layouts" gallery come from the DXF plans in the Digital Toolkit
(`08 Digital Toolkit - PAD/DXF Baseline unit options`). They are converted to PAD's own plan format and stored in `index.html`
as the `LAYOUTS` constant, so the app does not read DXF files at run time.

## What is imported

- 19 plans: A1-1 variants 1 to 9, A1-4 variants 1 to 3, A2-1 variants 1 to 6 and A2-5.
- Walls, doors with their swings, furniture and fixtures, room names and areas, the balcony, and the entry door on the corridor wall.
- Each plan is turned so the windows are at the top and the corridor is at the bottom, as in the rest of PAD.
- The outer walls are redrawn to PAD's standard thicknesses (0.3 m front, 0.2 m corridor, 0.1 m sides). Inside the unit the plan follows the DXF.
- Where the DXF draws no glazing, one window is placed for each habitable room on the front wall.

## What is not imported

- A1-3, A1-5, A1-6, A1-7, A2-3, A2-4, A3-1, A3-2 and A3-3. They have angled walls or L-shaped outlines, which PAD's rectangular unit model cannot hold.
- A1-2, A1-8 and A2-2. These sheets contain only title blocks, with no plans.
- Sliding and barn closet doors are left as open doorways. Kitchen upper cabinets, range hoods, dishwashers and dining chairs are not drawn separately.

## Regenerating

```bash
node tools/dxf-to-layouts.mjs "<folder with the DXF files>"
node tools/inject-layouts.mjs
```

Then bump `VERSION` in `sw.js`, run `node tests/smoke.mjs`, and open a pull request. To add a plan to the sample building, add its id to `BASELINE` in `index.html`.

Each variation made by a prompt starts from one of these layouts and is saved as a new iteration, or as a new unit beside it.
