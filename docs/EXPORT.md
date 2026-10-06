PAD unit plan export, draft 0.1

For the team writing the reader. Everything here describes one file per unit plan, exported from PAD with the Export JSON button in the unit's panel (a file named like PAD-01-v1.pad.json). It is a draft: tell us what to change and the next version will follow. Breaking changes raise the first number of `version`.

Files
- pad-unit-plan.schema.json: the schema (JSON Schema 2020-12).
- sample-A1-4.1.pad.json: a real export of a one bedroom plus den unit (catalog A1-4.1, 547 ft2 net), made by PAD's own code, not written by hand.
- tools/validate-export.mjs: checks a file against the schema, and checks that the ids it refers to exist. `node tools/validate-export.mjs file.pad.json`
- tools/preview-export.mjs: draws a file as an SVG so it can be checked by eye. `node tools/preview-export.mjs in.json out.svg`

Coordinates
- Metres. x runs left to right. y runs down the page from the window wall (y = 0) to the corridor wall (y = depth, in `coordinateSystem.depth`). The origin is the outer face of the unit's left wall at the window wall.
- To draw in DXF, use x' = x and y' = depth - y. A rotation of r degrees clockwise on the page becomes -r in DXF. A door arc that runs clockwise on the page (`clockwiseOnPage`) runs counter-clockwise after the flip.
- Every polygon is a closed ring with the first point not repeated.

What is in a file
- plan: id (unit name plus version, like PAD-01-v2), name, unit type, bedrooms, variation (version number, what was changed, when it was saved), the catalog layout it started from, and the areas as PAD computes them. footprint is width and depth.
- rooms: name, the Revit tag it maps to, polygon (with holes), PAD's area, the area in ft2 as Revit shows it, the polygon's own area, and the point where PAD puts the name.
- walls: straight runs with centreline start and end, thickness, kind, and the solid segments (each with a polygon). Gaps between segments are doorways and window openings.
- doors: the wall it sits in, width, centre on the wall, offset along the wall, hinge, hinge side, the direction it opens, the arc, and which rooms it connects.
- windows: the wall, from and to, width, offset along the wall.
- furniture: a stable id, type and name, centre, width, depth, rotation, room, layer, and a Revit block name suggestion.
- floors, balconies (balcony, den, nook, recessed balcony, entry vestibule), and dimensions a person added in PAD.
- layerMap: the Revit export layer each kind of object is meant to land on.

Layers (from the Revit DXF samples)
- Walls A-WALL, with hatch A-WALL-PATT. Windows A-GLAZ. Door swings A-DETL-GENF (sliding doors A-DOOR-HDLN).
- Room outlines A-AREA. Room names and areas A-AREA-IDEN, as MTEXT with the name (LIVING) and the area text (125 SF). Floors A-FLOR. Dimensions A-ANNO-DIMS.
- Furniture I-FURN. Plumbing fixtures P-SANR-FIXT. Casework Q-CASE and Q-CASE-HDLN. Appliances Q-SPCQ.

Room tags
PAD name to Revit tag: Living LIVING, Kitchen KITCHEN, Bedroom BEDROOM, Den DEN, Bath W/C, Hall HALL, Closet CLOSET, Laundry LAUNDRY, Mech HVAC, Dining DINING. A PAD name with no Revit tag is sent in capitals and `tagMatchesRevit` is false.

Areas
- `plan.areas.netM2` is the net area PAD shows. It is the sum of PAD's room areas, less the area a recessed balcony or entry vestibule takes out. For a plan imported from a drawing, each room's area is the printed area from that drawing, so the net matches the drawing (547 ft2 in the sample).
- Gross is to the wall centrelines. `grossWithCorridorM2` adds half of a 1.6 m shared corridor across the unit width, which is what PAD's efficiency uses.
- Room `areaM2` is the number to print on the plan. `polygonAreaM2` is the area of the exported polygon. On a plan imported from a drawing the two differ by up to about 25%, because PAD stores rooms as rectangles with smaller rooms cut out, not true outlines (see the limits below). On a plan generated in PAD's Layout mode the two agree closely.

Doors
- `hingeSide` says which end of the opening the hinge is at, going along the wall from left to right (or from top to bottom on a vertical wall). `openDirection` is the unit vector from the hinge along the open leaf, which says which side of the wall the door swings into. `arc` gives the same thing as points: draw an arc of `radius` around `centre`, from `from` (closed leaf) to `to` (open leaf).
- A door with `wallId` null sits in a gap where the imported drawing had no wall. See `wallNote`.

Furniture and blocks
- Ids look like PAD-01-v1-F07. They stay the same for one saved version. When a layout changes, PAD places furniture afresh, so the numbers start again in the next version.
- `revitBlock` is null for now: PAD does not keep the block names from the source drawings. `revitBlockSuggested` gives the block name stem from the Revit samples that suits the piece (for example UFS - Couch - 3-Seater 2290 x 915), written the way it appears in the DXF, without the trailing Revit element id. It is null where the samples have no suitable block (dresser, rug, plant, dining table, tub).
- width and depth are the body of the piece along its own axes before rotation. Clearance zones, such as the chairs round a dining table, are not included.
- A rotation of 0 puts the back of the piece toward the window wall.

Known limits in 0.1
- Room polygons for plans imported from a drawing come from PAD's room rectangles, clipped to the unit and cut by walls, with smaller rooms cut out of larger ones. They are a good base for room outlines and name placement but are not true Revit area boundaries. We expect to import the real boundaries (A-AREA) from the source DXF in the next version.
- Wall kinds are inferred. exterior is the window wall, the walls of balconies and bump-outs, and the side wall of a corner unit. demising is the corridor wall and the side walls shared with the next unit. partition is everything else. PAD does not model structure, so nothing is marked bearing (`structural` says "not modelled").
- The source drawings sometimes carry overlapping walls of slightly different thickness. PAD joins ones on the same line within 50 mm and keeps the thickest. Walls from different runs can still overlap each other, such as a thin end wall inside a thick side wall, so union the wall polygons if a clean outline is needed.
- `fromRoomId` and `intoRoomId` on doors come from the room polygons, so they are approximate on imported plans, and null means the corridor.
- Windows have a position and width only. There is no sill height or window block yet.
- One unit per file. A building-level file (several units in a row with the keyplan) is not part of 0.1.

Questions we would like answered
- Should furniture ids carry a Revit element id when the piece came from a block? We would keep it if the reader can match it.
- Should rooms come with a Revit room number as well as a tag?
- Do you want one DXF-ready flip (y' = depth - y) done in the file, as a second set of coordinates?
