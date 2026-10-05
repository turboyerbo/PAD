# Working on PAD

PAD is one static page (`index.html`) hosted on Netlify at https://padufs.netlify.app.
`main` is the live site. Every change goes through a pull request so it can be
previewed and checked before it goes live.

## The loop

1. **Start from the latest `main`.** `git checkout main && git pull`
2. **Make a branch** named for the change: `git checkout -b fix/studio-bath-door` or `feat/corner-corridor-turn`.
3. **Edit, then try it locally:** run `python3 -m http.server 8000` in the repo folder and open http://localhost:8000.
   Add `?debug` to the URL for the test hooks.
4. **Bump the offline cache.** Change `VERSION` in `sw.js` (`pad-v8` to `pad-v9`, and so on) whenever app files change.
   CI fails the pull request if you forget.
5. **Push and open a pull request** into `main`. The template asks for what changed and why.
6. **Review the preview.** Netlify posts a deploy preview link on the pull request within a minute.
   Open it on a desktop and on a phone. Leave review comments on the pull request.
7. **Wait for the check.** The `check` workflow runs a headless smoke test: it builds units through the real dialog at desktop and phone size,
   and fails on script errors or occupants standing inside walls or furniture.
8. **Merge** with "Squash and merge" once the preview looks right and the check is green. Netlify publishes `main` in a few seconds.

Never push straight to `main`. Two people (or two Claude sessions) editing the one big file at once
is how work gets overwritten, and the pull request is where that collision shows up safely.

## Ideas and bugs

Use GitHub Issues with the templates provided. Reference a unit tag (PAD-07) or a sheet number where you can.
Link the issue from the pull request that resolves it (`Closes #12`).

## Running the smoke test yourself

```
npm install --no-save --no-package-lock playwright@1
npx playwright install chromium
node tests/smoke.mjs
```

## Where things live in `index.html`

| What | Search for |
|---|---|
| Printed-set baseline units | `BASELINE` |
| Studio and bedroom layout generators | `planStudio`, `planMulti` |
| Size and placement rules | `solveSize`, `sizeReq` |
| Corner units | `addSideWindows` |
| Furniture drawings and colours | `function piece`, `--mt-` |
| Occupants, walking and collision grid | `gridOf`, `findPath`, `makeUnit` |
| Desktop strip | `function render` |
| Phone view (the same strip, middle unit in focus, neighbours showing) | `mobSync`, `mobFocus`, `mobGo`, and the phone branch of `computeScale` |
| Delete a unit and undo it | `deleteUnit`, `undoDelete`, `removedBase` |
| New-unit dialog | `openModal`, `readSize` |
| Quick add (one-click standard unit) | `quickAdd` |
| Building code limits | `BED1_W`, `STUDIO_A`, `solveStudio`, `solveOneBed`, `wcClear` |
| Unit editor (move walls, add or remove furniture and fixtures) | `openEditor`, `wallGroups`, `moveWall`, `moveDoor`, `deadEnds`, `PAL`, `applyCustom` |
| Prompt editing (words change plans; Netlify function holds the key, see docs/PROMPTS.md) | `aiPlan`, `aiOps`, `aiRun`, `aiPanel`, `netlify/functions/revise.mjs` |
| The catalog of starting layouts (gallery, sample building, new units; see docs/LAYOUTS.md) | `LAYOUTS`, `useLayout`, `layoutCard`, `tools/dxf-to-layouts.mjs` |
| Tracing paper session (change budget, ghost layer, review, iterations) | `TRACE_BUDGET`, `edPush`, `edReview`, `edSummary`, `restoreIter` |
| Kitchen templates (U, L, galley) and kitchen code checks | `kTemplate`, `kitchenIssues`, `kitchenNeed`, `applyKitchen` |
| Balcony, bump-outs (den, nook) and bump-ins (recessed balcony, entry vestibule) | `BUMPS`, `syncBumps`, `addBump`, `netArea`, `grossArea` |
| Resting people (lying on the sofa, getting out of bed) | `seatPeople`, `restSetup`, `restAct` |
| Accounts, buildings and chat data layer (Supabase or demo) | `window.PADBE`, the first script block |
| Landing page, building list, open and save a building | `showLanding`, `showProjects`, `openProject`, `snapshot`, `loadData` |
| Chat and sharing | `chatInit`, `chatIncoming`, `openShare` |

Accounts and sharing run in demo mode (browser only) until Supabase is connected. See `docs/SETUP.md` and `supabase/schema.sql`.

## Writing style for on-screen text

Plain, short sentences in the first person or the imperative. No em-dashes.
