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
- Bump-outs and bump-ins: balcony, den, nook, recessed balcony, entry vestibule.
- Footprint: width and depth change 100 mm at a time, up to 1 m from the original. Walls, floors and rooms that touch the changed side stretch with it (`fpMove`).
- Leaving Drafting, or confirming, drops any furniture a wall now cuts through (`edFinalize`).

Layout (AI)
- Rooms only. Drag a room, click a room and type an area or a width by depth, or describe a change in words. See ROOMS.md and PROMPTS.md.
- A person walks from the entry through every room of 3 m2 or more (`edRoute`, using the same path finder as the occupants, with a slimmer body and open doors). A room the person cannot reach is named in the panel.
- Leaving Layout, or confirming, places furniture afresh to fit (`rmFurnish`). A piece that does not fit is left out.

`?manualedit` still opens the old combined tools. It is for tests only and shows no mode buttons.
