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
- Colours follow the reference plan: hatched grey walls, cyan furniture and fixtures, green plants. People and pets are the only orange. Use the CSS variables, not new hex values.
- On-screen text: plain and short, no em-dashes.
- In the pull request description, say what you changed, what you tested, and anything you could not test.
