# Editing a unit by rooms

Click a unit, then Change this unit. A sheet of tracing paper opens over the unit on its own. The original shows faintly underneath.

While you trace, the sheet shows only the layout: rooms (name and area), walls, doors and windows. There is no furniture, no appliances and no dimension text, because none of it would stay tidy while rooms move.

## How it works

1. **Drag a room.** Press on a room and drag it onto another room. Drop it in the middle of the other room to swap the two. Drop it near an edge of the other room to put it beside that room. While you drag, dashed outlines show where every room would end up.
2. **The other rooms make way.** Every room keeps its area as far as it can. The walls, doors, windows and furniture are rebuilt around the new room positions. Furniture keeps its distance from the wall it was against. Small rooms (closets, laundry, mechanical) stay inside the room they sit in and move with it.
3. **Red rooms.** A room turns red when it no longer meets its minimum: its area or narrowest width (bedroom 7 m2 and 2.4 m, bath 3 m2 and 1.5 m, kitchen 3.7 m2 or 4.2 m2, and so on), a room that needs a window and is no longer on the front wall, a room with no door to it, or a room too small for its toilet, tub or other fixtures. Click the room to see the reasons. Problems the original drawing already had stay quiet, so only your changes turn rooms red.
4. **Type a size.** Click a room and type an area, a width, a depth, or any mix, then Apply size. The room takes that size and the others shrink to make space. If an exact width or depth cannot fit, the room keeps its area and finds its own shape.
5. **The footprint can change a little.** When the rooms cannot fit or would shrink a lot, the unit grows: up to 1.0 m deeper first, then up to 0.4 m wider. The review card says how much it grew. The footprint does not shrink on its own.

Each drag or typed size uses one of the 5 changes on a sheet. Undo takes the last one back, and Start over clears the sheet. The prompt box works on the same sheet, so you can drag rooms and then describe a finer change in words. Saving works as before: the next iteration of the unit, or a new unit beside it.

## Furnishing on accept

When you review and accept the new layout (next iteration or new unit), PAD places furniture and appliances afresh in every room, so each piece fits:

- Beds against a wall with nightstands, a dresser when there is space. A queen bed, or a double or twin if the room is tight.
- A sofa, TV, coffee table, rug and armchair in the living room. A dining table where there is a dining room.
- A kitchen from the four templates (U, L, two rows, one row), or a single run along the longest clear wall. Pieces stay clear of walls and door swings.
- A standard 60 in tub (or a shower), a toilet at least 457 mm from the walls and fixtures beside it, and a vanity. Washers in laundry rooms, shelving in closets.
- Pieces that cannot fit are left out. The review card shows the code check on the furnished layout first, for example if no tub fits.

Accepting always replaces the furniture, even if you only moved a door. The original drawing's furniture is not kept.

## What it does not do

- Rooms become rectangles after the first change. An L-shaped living and kitchen area, for example, is split at a straight line. The first move re-lays the whole unit from its room structure, so it can look different from the original drawing even for rooms you did not touch.
- Windows are placed again by rule: one for each bedroom, living, den, kitchen or dining room on the front wall.
- The kitchen arrangement is chosen when you accept. Say "make the kitchen an L-shape" in the prompt box to prefer one of the four templates.
- There are no tools to draw walls, doors or furniture one by one.

## Where it lives

`index.html`, search for `room editing`: `rmBuild` reads the plan as rooms and a tree of cuts, `rmLay` and `rmSolve` lay the rooms out, `rmApply` rebuilds the plan, `rmDown`, `rmMove` and `rmUp` handle the drag, and `rmTyped` handles typed sizes. A saved plan keeps its size in `dim` and its places for people in `nd`.

## Rooms follow the walls

Each room is the space its walls enclose (doorways count as closed) and its colour fills that space. When a wall or door change leaves a room
outside one enclosed space, the room is taken off and the space shows as blank with "Tap to name"; tap it and choose a name. The unit cannot be
saved while a space is blank. See docs/PROMPTS.md, Checks and repairs.
