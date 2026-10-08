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
- Plans change through prompts (docs/PROMPTS.md) and room-level moves (docs/ROOMS.md): drag a room, type a size. The tracing sheet shows rooms, walls, doors and windows only; furniture is placed by `rmFurnish` when a layout is accepted. The editor has three modes (Furniture, Drafting, Layout (AI); see docs/MODES.md). Keep each mode to its own tools. Do not add free line drawing. `?manualedit` shows all the tools at once and exists for tests only.
- Rooms follow the walls: each room is the space its walls enclose (`roomRegions`, `snapRooms`) and its colour fills that space. A room that no longer fits is taken off and its space left blank for the owner to name. Every save goes through `planGuard` (docs/PROMPTS.md, Checks and repairs): no furniture in walls, no wall in a doorway, 800 mm clear to every room. Run the stress harness idea in that doc when you change the room engine.
- Never put an API key in `index.html`. The Anthropic key is a Netlify environment variable used by `netlify/functions/revise.mjs`.
- Colours follow the reference plan: hatched grey walls with a black outline on the unit's outer walls (window wall, corridor wall, walls between units) and lighter grey interior partitions, room tints limited to three faint colours (`--rm-*`: mauve bedrooms and dens, orange kitchens and closets, green baths and halls; living, dining, laundry and mechanical rooms white), shown only where a room fills a closed space of its own and switched off for now (`ROOM_TINTS`), cyan furniture and fixtures, green plants. People and pets are the only orange. Use the CSS variables, not new hex values.
- On-screen text: plain and short, no em-dashes.
- In the pull request description, say what you changed, what you tested, and anything you could not test.
- A unit exports as JSON for another team (docs/EXPORT.md). If you change the plan data, update `padExport`, the schema in docs/export/ and the sample, and run tools/validate-export.mjs.
