# The Patry catalog

The catalog is the set of layouts that every new unit starts from. A new unit with N bedrooms begins as one of the catalog layouts
with N bedrooms, and the user then describes small changes to make variations (see PROMPTS.md). The catalog also fills the sample
building and the "Browse the catalog" gallery. If the catalog has no layout for a bedroom count yet, PAD still generates a unit as before.
Asking for a specific size or area, or a corner unit, also builds from scratch.

## What is in it now

Nine layouts. Every one is a 1 bed + den plan; the printed net area comes from the drawing's own title text.

| Id | Counts as | Type line | Printed net area |
| --- | --- | --- | --- |
| 1B-01 | 1 bedroom | 1 bed + den, 1 bath | 668 ft2 |
| 1B-02 | 1 bedroom | 1 bed + den, 1 bath | 668 ft2 |
| 1B-03 | 1 bedroom | 1 bed + den, 2 bath | 668 ft2 |
| 1B-04 | 1 bedroom | 1 bed + den, 1 bath | 668 ft2 |
| 1B-05 | 1 bedroom | 1 bed + den, 1 bath | 670 ft2 |
| 1B-06 | 1 bedroom | 1 bed + den, 1 bath | 678 ft2 |
| 1B-07 | 1 bedroom | 1 bed + den, 1 bath | 670 ft2 |
| 1B-08 | 1 bedroom | 1 bed + den, 1 bath | 670 ft2 |
| A1-1_5 | 2 bedroom (example) | 1 bed + den, 1 bath | 668 ft2 |

The printed net area counts the partitions inside the unit, so it is larger than the sum of the room areas. Each layout carries
the difference, so PAD shows the same net area as the drawing and keeps it correct as walls move.

## Adding to the catalog

1. Put the DXF in the Digital Toolkit folder. Convert the folder:
   `node tools/dxf-to-layouts.mjs "<folder with the DXF files>"`
   This writes `tools/layouts.json` with every plan it could convert.
2. Add the plan to `tools/catalog.json`: its id (the file name without spaces and the plan number, such as `1B-03_1`), a name, and the bedroom count it counts as
   (`n`). The printed net area is read from the drawing; add `netSF` only to override it.
3. `node tools/inject-layouts.mjs` puts the catalog into `index.html`. Bump `VERSION` in `sw.js`, run `node tests/smoke.mjs`, and open a pull request.

To change what the sample building shows, edit `BASELINE` in `index.html`.

## What the converter handles

- Rectangular plans: walls, doors with their swings, furniture and fixtures, room names and areas, the balcony, and the entry door on the corridor wall.
- Each plan is turned so the windows are at the top and the corridor at the bottom.
- The outer walls are redrawn to PAD's standard thicknesses (0.3 m front, 0.2 m corridor, 0.1 m sides). Inside the unit the plan follows the DXF.
- Where the DXF draws no glazing, one window is placed for each habitable room on the front wall.
- Not handled: plans with angled walls or L-shaped outlines (A1-3, A1-5, A1-6, A1-7, A2-3, A2-4, A3-1, A3-2, A3-3), and sheets with only title blocks (A1-2, A1-8, A2-2).
  Sliding and barn closet doors become open doorways. Upper cabinets, range hoods, dishwashers and dining chairs are not drawn separately.
