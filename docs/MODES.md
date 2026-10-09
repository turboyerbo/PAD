Edit modes

The tracing sheet has three modes, chosen with the buttons beside the unit name. The same sheet, undo history and change budget carry across all three.

Furniture
- Move, rotate, duplicate or delete a piece, and add pieces from the lists.
- Kitchen layouts (U, L, galley) are here too.
- Only furniture can be selected. Walls and doors cannot.

Drafting
- Furniture is hidden. Only the building can be selected.
- Walls: drag, nudge, trim either end 100 mm at a time, delete, rotate a wall you added, add a wall, add an interior alcove (three walls that move together).
- Doors: slide, flip, change the swing, delete, and add one to a wall.
- Deleting a door closes its opening with wall at once (`relayWalls`); other openings in that wall stay open.
- A moved wall keeps the walls that met it: their ends move with it (`wallsMeeting`). An end that comes within 300 mm of a wall at right angles runs on to meet it, to its face at a T and right through at a corner, where the other wall runs on too so the corner is solid (`wallJoin`).
- On a phone, tapping a wall, a door or a room separation opens a small box: Delete? Yes deletes it. No shows two arrows that nudge it 50 mm a tap (a wall or separation across its length, a door along its wall) and Done. Dragging still works.
- Bump-outs and bump-ins: balcony, den, nook, recessed balcony, entry vestibule.
- Footprint: width and depth change 100 mm at a time, up to 1 m from the original. Walls, floors and rooms that touch the changed side stretch with it (`fpMove`).
- Leaving Drafting, or confirming, drops any furniture a wall now cuts through (`edFinalize`).

Room separations (Drafting)
- A room separation is a dashed line where one room ends and the next begins with no wall (Revit's room separation line). It runs straight, horizontally or vertically, from wall to wall. People and furniture pass through it.
- Add a room separation, then tap the open space: the line goes across the narrower way through that point. Tap a line to drag it, turn it the other way, or delete it. A separation does not use up one of the five changes.
- Separations close spaces for the room colours and the room outline in Layout mode. The checks (no wall in a doorway, 800 mm clear, rooms out of step) still go by the walls.
- Catalog plans get theirs when they load (docs/LAYOUTS.md, Tidying the traced plans).

Layout (AI)
- Rooms only. Drag a room, click a room and type an area or a width by depth, or describe a change in words. See ROOMS.md and PROMPTS.md.
- A person walks from the entry through every room of 3 m2 or more (`edRoute`, using the same path finder as the occupants, with a slimmer body and open doors). A room the person cannot reach is named in the panel.
- Rooms are coloured here and only here. Each space the walls enclose (doorways closed, `roomRegions`) takes the colour of the room with most of its rectangle in it: mauve bedrooms and dens, orange kitchens and closets, green baths and halls; living, dining, laundry and mechanical stay white. A space shared by two rooms (an open kitchen and living room) takes the larger one's colour. Tapping a room outlines its walled space, never the room engine's own box.
- Leaving Layout, or confirming, places furniture afresh to fit (`rmFurnish`). A piece that does not fit is left out.

`?manualedit` still opens the old combined tools. It is for tests only and shows no mode buttons.

How much may change (Layout (AI))

A slider from 1% to 100% sets how far a variation may go. It starts at 1%.
- Suggest a variation uses the slider without the assistant. Up to 40% it keeps the plan and changes a few things on it: the footprint proportion at the same net area (narrower and longer, or the reverse, as in a width of 6.5 m becoming 6.2 m and the depth growing), a wall nudged, a door slid. Over 40% the room engine re-fits the rooms after random moves, and from 90% the moves are many and the order of rooms is shuffled.
- Net area stays within the slider percentage of the sheet underneath (not above 90%). No room may turn red that was not red, and the walking person must still reach every room. When nothing qualifies the panel says so.
- The same number goes to the assistant with each request. It sets how many steps it may take, and the new `set_footprint` step changes width and depth, optionally keeping the gross area.

Circulation steps (sketch 2 to 3)
- Add a room: `addRoom` carves a laundry room or closet out of a corner of a larger room, with two new walls and a door back into the room it came from.
- A second door from the corridor: `addCorridorDoor` opens a door from the corridor straight into a room and rebuilds the corridor wall around it.
- Grow a room: `growRoom` moves the wall between a room and the hall beside it (then a closet or mechanical room, then a den or living room) so the room gets larger and the neighbour gives space up. The hall is never left narrower than 0.9 m.
- The assistant has the same three steps (`add_room`, `add_corridor_door`, `grow_room`). Suggest a variation uses them too, from about 3% (a room) and 8% (the door and growth) on the slider.

The clean-up pass (`cleanPlan`)
- Runs when a layout is imported, after any layout change, after a variation, and when you press Clean up the drawing.
- Walls: pieces that touch or overlap are joined, specks are removed, and ends that stop up to 150 mm short of the wall they meet are extended to it.
- Names: a name on a wall, a door swing or another name moves to the nearest clear spot in its room. If none exists the size text is dropped, then the area, and for a closet too small for any name the name is hidden.
- Dimension text on top of a name is hidden for that door or window.
- Whatever cannot be fixed is listed in the panel. In Drafting, click a wall (Tidy this wall, trim, delete, then add one again), a door (delete it or hide its dimension) or a room name (hide the size text, move it to a clear spot, drag it) to fix it by hand.

Dimensions
- Every plan is dimensioned as soon as it is created: the overall width above the window wall, with a chain to each partition that meets it, the overall depth (inside the unit, beside a demising wall), and the length of every interior wall that has room for one. A wall dimension that would sit on a room name, or whose text does not fit, is left out.
- On the plan, tap a dimension to delete it (Undo is offered), or drag it to move it. The unit panel has Restore dimensions to bring back the defaults. These changes are kept per unit (`dimx` in the building data). If a wall moves, its dimension comes back in its default place.
- Drafting shows the same dimensions, but they are edited on the plan, not on the tracing paper. The phone shows them too.
- To add one, open Drafting, press Add a dimension, and click two points on walls (a corner, or a point along a wall edge, which snaps within 300 mm). A dimension runs along the longer of the two directions, sits 400 mm outside, and shows its length in millimetres.
- Click a dimension in Drafting to flip it to the other side or delete it (or press Delete). It does not use up one of the five changes.
- A dimension is kept as two points on walls (`dms`). If a wall moves away from either point, the dimension is hidden and Drafting offers to remove it; confirming drops it.

Tool icons
- Every tool button in the editor's three modes has a small line icon: the header buttons (Undo, Start over, Discard, Review changes) and every button in the side panel, including each furniture, wall and bump-out in the lists. The arrow nudges keep their arrows, and the kitchen templates keep their own pictures.
- Icons live in `ICON_ED` in index.html (paths on a 24 by 24 grid) and are drawn as a CSS mask, so they take the button's colour and survive the label being rewritten. `iconKey` decides which icon a button gets from its `data-act`. A new tool needs an entry in both. The smoke test fails when a tool has no icon.
