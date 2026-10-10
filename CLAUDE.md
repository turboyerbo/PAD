# Instructions for Claude sessions working on PAD

PAD (Patry Analysis & Design, Ninth Line) is a single static page, `index.html`, deployed by Netlify
from `main` to https://padufs.netlify.app. Several people and several Claude sessions work on it.
Follow CONTRIBUTING.md, plus these rules:

- Fetch before you edit: `git fetch origin main` and branch from `origin/main`. Other sessions push often.
- Never push to `main`. Push a branch and open a pull request with `gh pr create`. The owner merges.
- Never overwrite `index.html` wholesale from a copy made earlier in a conversation. Edit the current file in place.
  If a rebase conflicts in `index.html`, re-apply your change on top of the newer file rather than picking a side.
- Bump `VERSION` in `sw.js` in every pull request that changes app files. CI enforces it.
- Run `node tests/smoke.mjs` before opening the pull request and fix anything it reports.
- Keep it one self-contained file with no build step. External scripts only if unavoidable.
- Occupants must never overlap walls or furniture. Anything solid goes into `gridOf`.
  The one exception is a person lying on a bed or sofa, or getting up from it (`p.lie` above 0 or `p.tr` set). The smoke test skips them.
- Plans change through prompts (docs/PROMPTS.md) and room-level moves (docs/ROOMS.md): drag a room, type a size. The tracing sheet shows rooms, walls, doors and windows only; furniture is placed by `rmFurnish` when a layout is accepted. The editor has three modes (Furniture, Drafting, Layout (AI); see docs/MODES.md). Keep each mode to its own tools. Do not add free line drawing (room separations run straight from wall to wall, see docs/MODES.md). `?manualedit` shows all the tools at once and exists for tests only.
- Rooms follow the walls: each room is the space its walls enclose (`roomRegions`, `snapRooms`) and its colour fills that space. A room that no longer fits is taken off and its space left blank for the owner to name. Every save goes through `planGuard` (docs/PROMPTS.md, Checks and repairs): no furniture in walls, no wall in a doorway (these and a blank space stop a save). 800 mm clear to every room and room sizes are warnings: the review offers small wall and door moves (`guSuggest`) and still lets the owner save. Do not bring back a long search that blocks the save. Run the stress harness idea in that doc when you change the room engine.
- Never put an API key in `index.html`. The Anthropic key is a Netlify environment variable used by `netlify/functions/revise.mjs`.
- Colours follow the reference plan: the unit's outer walls (window wall, corridor wall, walls between units) solid dark blue (`--wall-out`) with a black outline, interior partitions hatched lighter grey, room tints limited to three faint colours (`--rm-*`: mauve bedrooms and dens, orange kitchens and closets, green baths and halls; living, dining, laundry and mechanical rooms white), shown only in Layout (AI) mode, where each space its walls enclose takes the colour of the room in it (`regionTints`), and off in the strip and the other modes (`ROOM_TINTS`), cyan furniture and fixtures, green plants. People and pets are the only orange. Use the CSS variables, not new hex values.
- On-screen text: plain and short, no em-dashes.
- A building has a shape: straight, L or U, set to 5180 Ninth Line (docs/BUILDING.md). Every unit is on a wing (`u.leg`), the strip shows one wing at a time, and turning a corner rotates the view with the north arrow. Corner and end units fill the zones the keyplan marks at the ends and corners.
- In the pull request description, say what you changed, what you tested, and anything you could not test.
- A tap on a unit opens it in Layout (AI) mode; its details are behind Details in the editor. Tapping a room there shows its stats in a floating box. Zoom is always on screen (strip and sheet); the page itself must never double-tap zoom. Balconies and other outdoor rooms (`isOutdoor`) never count in net or gross area.
- New unit: two choices, the catalog (grouped by feature, with room colours) or a unit type from studio to 3 bed. A tap adds the unit; who it is for is optional, set from the unit panel.
- A unit exports as JSON for another team (docs/EXPORT.md). If you change the plan data, update `padExport`, the schema in docs/export/ and the sample, and run tools/validate-export.mjs.
