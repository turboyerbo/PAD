# Building shape, wings and end units

A building in PAD is a corridor with units on both sides. It can be one straight run, an L (two wings) or a U (three wings around a courtyard). The shape is chosen when the building is created and can be changed in the keyplan (the pencil button).

## The shape

`SHAPE` (saved with the building as `shape`):

- `kind`: `bar`, `L` or `U`.
- `names`: one name per wing, in order along the corridor.
- `len`: the length of each wing, metres, measured along the corridor centreline from end to corner, corner to corner.
- `turns`: the angle at each corner, degrees. Positive is a turn to the right when walking along the corridor in wing order.
- `head`: the direction of the first wing, degrees clockwise from north.
- `depth`: the unit depth the keyplan draws for the building outline.

The U is set to 5180 Ninth Line, taken from the A3-3 overall plan (corridor centrelines, 1.6 m corridor):

| Wing | Length | Then turns |
| --- | --- | --- |
| West wing, walking north from the south end | 44.5 m | 97.4 degrees right |
| North bar, skewed 7.4 degrees off square | 50.3 m | 82.6 degrees right |
| East wing, walking south to the south end | 35.5 m | |

Units on the outside of the U are about 10.5 m deep. The drawing's up direction is taken as north.

## Wings in the strip

The strip shows one wing at a time (`wing`). It walks along the corridor in wing order with the window wall up, so it shows the units on the left of the walk: on the U, the outer ring. The keyplan mirrors them across the corridor, as it does for a straight building.

Every unit has a `leg`: the wing it is on, counted from 0. A new unit goes on the wing in view. Saved units without a `leg` are on the first wing.

The wing bar (top left) names the wing, steps to the next or previous one and shows a north arrow. The north arrow's angle on screen is `90 - heading`: walking north shows as walking to the right.

## Turning a corner

Going to the next wing turns the drawing. At a right turn the next wing runs down the screen, so the view rotates by the corner's angle the other way to lay it flat, and the strip carries on left to right. The animation is two halves: the old wing turns half way and fades, the new wing comes in from the other half and settles. The north arrow turns at the same time. With reduced motion the wing just changes.

The view turns:

- when a corner unit is added at an end of a wing that meets another wing (the end of the West wing, say),
- from the red arrow at the end of a wing (it reads Turn the corner),
- from the arrows in the wing bar,
- when a unit on another wing is tapped in the keyplan.

## End units and corner units

The keyplan marks a zone at each end of the building and at each corner, on both sides of the corridor: on the U, eight zones. An end zone is one unit depth long, or the corner unit's width once one is designed. A corner zone runs as far along each wing as the outer face of the corner reaches (`depth + 0.8` times the tangent of half the angle).

An empty zone is dashed. Tapping it goes to that wing and opens a new unit at that end with Corner unit ticked. A corner unit is the first unit of its wing (`corner: 'L'`) or the last (`corner: 'R'`) and fills its zone in the keyplan.

For now a corner unit is a rectangular plan with windows on its side wall. The real end units at Ninth Line (3Ca and 3Cb on A3-3, A3-1 at the north-west corner) wrap the corner and follow the 7.4 degree skew; drawing those shapes is the next step.

## Export

Each unit's export says the building's shape and, on an L or U, its wing and the wing's heading (docs/EXPORT.md).

## Finding a unit

The jump bar (top left, beside the wing bar) goes straight to a unit:

- Type its number (12 or PAD-12) and press Enter, or pick it from the list.
- The two end buttons jump to the first and last unit of the building. Home and End do the same from the keyboard.
- The keyplan numbers every unit. Tapping one goes to it. On a phone the keyplan then folds back to its small map so the plan is in view.
- On a phone, zoom buttons for the strip sit under the small keyplan. On a computer they are in the navbar.
- Closed, the keyplan stays in the corner as a small map, with the unit in view outlined on a phone. Tapping it opens it full size. It hides while a unit's details are open.

A unit on another wing turns the view to that wing first. From the West wing to the East wing the view turns through both corners in one move. On a computer the unit's details open and it is outlined. On a phone the strip steps to it and the details stay closed, so the plan stays in view.
