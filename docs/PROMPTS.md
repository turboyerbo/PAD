# Changing units with prompts

Units are changed only by describing the change in words. There are no drawing tools. This keeps PAD an early design tool and not a drafting program.

## How it works

1. Click a unit, then Describe a change. A sheet of tracing paper slides over the unit.
2. Type a request, for example "Move the bed under the window and make the kitchen an L-shape".
3. The page sends the request and a compact description of the plan to `/api/revise`. That is the Netlify function in `netlify/functions/revise.mjs`, which asks Claude for a short list of small steps.
4. The page applies the steps with the same editing code the old drawing tools used, then runs the code checks (toilet clearance, kitchen area, tub sizes, dead-end halls, overlaps). If the checks find new problems, the page sends them back once and applies the corrected steps.
5. The result shows on the tracing paper over the original. Up to 5 requests per sheet. Review changes, then either Save as next iteration (v2, v3 and so on, earlier versions stay in the unit panel and can be restored) or Save as new unit, which adds a variation beside the original and leaves the original as it was.

## Turning it on

The assistant needs an Anthropic API key. Until it is set, the Describe a change button is hidden.

1. Create a key in the Anthropic Console (console.anthropic.com), under API keys. In the Console, also set a monthly spend limit for the workspace.
2. In Netlify, open the site, then Site configuration, Environment variables. Add `ANTHROPIC_API_KEY` with the key. Keep "Contains secret values" on.
3. If the Console says the key is not scoped to a workspace, either create the key inside a workspace (Console, Settings, Workspaces, then API keys), or add `ANTHROPIC_WORKSPACE_ID` in Netlify with that workspace's ID. PAD sends it with each request.
4. Optional: add `PAD_MODEL` to choose a different model. The default is `claude-sonnet-5-5`.
5. Trigger a deploy (Deploys, Trigger deploy). Netlify builds the function automatically.

The key lives only in Netlify. It is never in `index.html` or in this repository.

## Limits and safety

- A request is at most 600 characters. The function allows 20 requests per hour per visitor (best effort) and 8 steps per request.
- The assistant can only name steps from a fixed list (move, rotate, add or remove an item, move a wall, add or remove a door, balconies and bump-outs, kitchen layouts). The page ignores anything else and never runs text from the assistant as code.
- The toilet, kitchen sink and entry door cannot be removed. Outer walls and windows cannot be moved.
- Steps that cannot be done (an id that does not exist, a wall that cannot move that far) are listed under the answer, and the rest still apply.

## Developers

- Add `?manualedit` to the address to get the old drawing tools back. The smoke test uses this for the editor checks.
- The smoke test also covers the prompt flow with a mocked `/api/revise`.
- Page side: search `prompt editing` in `index.html` (`aiPlan`, `aiOps`, `aiRun`, `aiPanel`).
