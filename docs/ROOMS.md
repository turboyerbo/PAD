# Editing a unit by rooms

Click a unit, then Change this unit. A sheet of tracing paper opens over the unit on its own. The original shows faintly underneath.

## How it works

1. **Drag a room.** Press on a room and drag it onto another room. Drop it in the middle of the other room to swap the two. Drop it near an edge of the other room to put it beside that room. While you drag, dashed outlines show where every room would end up.
2. **The other rooms make way.** Every room keeps its area as far as it can. The walls, doors, windows and furniture are rebuilt around the new room positions. Furniture keeps its distance from the wall it was against. Small rooms (closets, laundry, mechanical) stay inside the room they sit in and move with it.
3. **Red rooms.** A room turns red when it no longer meets its minimum: its area or narrowest width (bedroom 7 m2 and 2.4 m, bath 3 m2 and 1.5 m, kitchen 3.7 m2 or 4.2 m2, and so on), a room that needs a window and is no longer on the front wall, a room with no door to it, or a room too small for its toilet, tub or other fixtures. Click the room to see the reasons. Problems the original drawing already had stay quiet, so only your changes turn rooms red.
4. **Type a size.** Click a room and type an area, a width, a depth, or any mix, then Apply size. The room takes that size and the others shrink to make space. If an exact width or depth cannot fit, the room keeps its area and finds its own shape.
5. **The footprint can change a little.** When the rooms cannot fit or would shrink a lot, the unit grows: up to 1.0 m deeper first, then up to 0.4 m wider. The review card says how much it grew. The footprint does not shrink on its own.

Each drag or typed size uses one of the 5 changes on a sheet. Undo takes the last one back, and Start over clears the sheet. The prompt box works on the same sheet, so you can drag rooms and then describe a finer change in words. Saving works as before: the next iteration of the unit, or a new unit beside it.

## What it does not do

- Rooms become rectangles after the first change. An L-shaped living and kitchen area, for example, is split at a straight line. The first move re-lays the whole unit from its room structure, so it can look different from the original drawing even for rooms you did not touch.
- Windows are placed again by rule: one for each bedroom, living, den, kitchen or dining room on the front wall.
- The kitchen counter run is moved with the kitchen, not redrawn. Use the prompt box ("make the kitchen an L-shape") to rebuild it.
- There are no tools to draw walls, doors or furniture one by one.

## Where it lives

`index.html`, search for `room editing`: `rmBuild` reads the plan as rooms and a tree of cuts, `rmLay` and `rmSolve` lay the rooms out, `rmApply` rebuilds the plan, `rmDown`, `rmMove` and `rmUp` handle the drag, and `rmTyped` handles typed sizes. A saved plan keeps its size in `dim` and its places for people in `nd`.
