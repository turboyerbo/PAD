# Changing units with prompts

Units are changed only by describing the change in words. There are no drawing tools. This keeps PAD an early design tool and not a drafting program.

## How it works

1. Click a unit, then Describe a change. A sheet of tracing paper slides over the unit.
2. Type a request, for example "Move the bed under the window and make the kitchen an L-shape".
3. The page sends the request and a compact description of the plan to `/api/revise`. That is the Netlify function in `netlify/functions/revise.mjs`, which asks Claude for a short list of small steps.
4. The page applies the steps with the same editing code the old drawing tools used, then runs the code checks (toilet clearance, kitchen area, tub sizes, dead-end halls, overlaps). If the checks find new problems, the page sends them back once and applies the corrected steps.
5. The result shows on the tracing paper over the original. Up to 5 requests per sheet. Review changes, then either Save as next iteration (v2, v3 and so on, earlier versions stay in the unit panel and can be restored) or Save as new unit, which adds a variation beside the original and leaves the original as it was.

## Checks and repairs (the layout guard)

**Rooms follow the walls.** A room is the space its walls enclose, with doorways counted as closed (`roomRegions`). After every change each room
snaps to its space and its colour fills that space, whatever its shape (`snapRooms`, `roomTints`). Several rooms may share one open space, such as a
kitchen open to the living room, as long as they do not sit on top of each other. A room that no longer sits in one enclosed space (a wall now runs
across it, say) is taken off, and the space is left blank with a dashed outline and "Tap to name". Tapping it offers the room names; the named room
fills the space. A plan with a blank space cannot be saved. The assistant sees the blank spaces and can name one with `name_space`.
A room keeps its printed area until its space changes size, then changes in proportion. Rooms that already sat loosely on a traced drawing are held
only to how they sat at the start.

Every plan is checked before it is saved, and every assistant answer is held to the same checks. Only a break stops a save:
a blank space, a wall in a door opening, or furniture in a wall (`GU_HARD`). The rest are warnings: the plan can be saved with them.

1. No furniture or fixture runs into a wall, another piece or a door swing.
2. Every room can be reached from the entry with 800 mm clear (600 mm inside a bath, laundry, closet or mechanical room).
3. No wall runs into a door opening or across a door swing.
4. The rooms agree with the walls: no wall through the middle of a room, no rooms half on top of each other.
5. Rooms meet their minimum area and width, and bedrooms and living rooms have a window.

Problems the sheet underneath already had (a traced drawing, say) are tolerated; only new ones count (`guAudit`, `guBase`, `guNew`).

When a request is made, the assistant's steps are applied and checked. What fails goes back to Claude with the reasons, up to four rounds
(about two and a half minutes at most), and the best answer is kept. Then `planGuard` repairs what is left, in this order: redraw the walls and
doors around the rooms, slide or flip doors clear of walls, place the furniture afresh, take out loose pieces (plants, chairs, tables, dressers,
nightstands, closet shelving, washer and dryer...), then closets, laundry and mechanical rooms, then a hall, dining room or den. Toilets, tubs,
showers, vanities, sinks, cooktops, fridges and beds are never taken out. If that is not enough, `guSearch` rearranges the rooms with the room
engine, repairs and checks each arrangement, and keeps the best one that passes with no room smaller than three quarters of what it was. The
search runs only for a break, for 20 seconds at most. If none passes, the plan stays as it was and the assistant says so. Warnings do not start it.

Room sizes are not warned about in the review (the owner decides them; see docs/VOICE.md, What is flagged). The review dialog lists the other warnings and offers up to three **small fixes** (`guSuggest`): each wall moved 100 to 300 mm, and each door slid
200 or 400 mm, is tried on a copy of the plan (furniture a moved wall runs into is left out, as the save does), and the moves that clear the most
warnings are offered, worded by the rooms on each side ("Move the wall between the hall and the bath 200 mm into the bath. Clears the way to the
bedroom."). Apply makes the move, runs the checks again and shows the review with the next fixes; Undo takes it back. **Rearrange all the rooms**
(the same search, 20 seconds) stays as a last resort when a room cannot be reached. Save stays available unless there is a break.

The way in starts at the free spot nearest the corridor door, within 900 mm of it, so a door near a corner does not count every room as unreachable.
A unit saved before these checks existed shows **Fix layout problems** in its panel; the fix is saved as a new iteration.

## Turning it on

The assistant needs an Anthropic API key. Until it is set, the Describe a change button is hidden.

1. Create a key in the Anthropic Console (console.anthropic.com), under API keys. In the Console, also set a monthly spend limit for the workspace.
2. In Netlify, open the site, then Site configuration, Environment variables. Add `ANTHROPIC_API_KEY` with the key. Keep "Contains secret values" on.
3. Leave `ANTHROPIC_WORKSPACE_ID` unset. Only add it if the assistant says the key is not scoped to a workspace, and then paste the workspace's ID from Console, Settings, Workspaces (it starts with `wrkspc_`). Never paste a key there: Anthropic rejects the request with "anthropic-workspace-id header must be a valid workspace ID".
4. Optional: add `PAD_MODEL` to choose a different model. The default is `claude-sonnet-5-5`.
5. Trigger a deploy (Deploys, Trigger deploy). The function only sees changed environment variables after a new deploy, so do this every time you change a key.

The key lives only in Netlify. It is never in `index.html` or in this repository.

## Limits and safety

- A request is at most 600 characters. The function allows 20 requests per hour per visitor (best effort) and 8 steps per request.
- The assistant can only name steps from a fixed list (move a wall, add or remove a door, slide or flip a door, balconies and bump-outs, a preferred kitchen layout). It works on the layout only. Furniture is not shown while tracing and is placed afresh when the layout is accepted. The page ignores anything else and never runs text from the assistant as code.
- The toilet, kitchen sink and entry door cannot be removed. Outer walls and windows cannot be moved.
- Steps that cannot be done (an id that does not exist, a wall that cannot move that far) are listed under the answer, and the rest still apply.

## Developers

- Add `?manualedit` to the address to get the old drawing tools back. The smoke test uses this for the editor checks.
- The smoke test also covers the prompt flow with a mocked `/api/revise`.
- Page side: search `prompt editing` in `index.html` (`aiPlan`, `aiOps`, `aiRun`, `aiPanel`).

Limits on assistant requests (both are off until you set them)

Set these in Netlify under Site configuration, Environment variables. They take effect on the next deploy or function restart.
- `PAD_PER_HOUR`: requests one person (one IP address) may make in an hour. Default 0, which means no limit. Set a number to turn it on. Counted in memory by each server instance, so it is approximate.
- `PAD_PER_DAY`: requests all people together may make in a day, by Toronto time. Default 0, which means no limit. Set a number to turn it on. The count is kept in Netlify Blobs (the `@netlify/blobs` dependency in package.json), so every server instance shares it. If Blobs cannot be reached, each instance keeps its own count instead.
- A request that fails validation does not count toward the day. The automatic repair retry is a second request and does count.
- Neither limit is a hard spend cap. A burst of requests at the same moment can slip a few past the daily count. Also set a monthly spend limit on the workspace in the Anthropic console.
- Suggest a variation, typed room sizes and room dragging make no requests.
