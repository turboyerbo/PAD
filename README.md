# Patry Analysis & Design (PAD) · Ninth Line

Live site: https://padufs.netlify.app

To contribute, read [CONTRIBUTING.md](CONTRIBUTING.md). Changes go through pull requests with a Netlify preview and an automated check.

Digital companion to the printed PAD set. A static site with no build step.

## Files
- `index.html`: the whole app (layout generator, drawing, dialog, people animation)
- `manifest.webmanifest`, `icon*.png`, `icon.svg`, `apple-touch-icon.png`: install-to-home-screen support
- `sw.js`: offline cache (bump `VERSION` on every deploy)
- `netlify.toml`: publish settings and headers

## Deploy on Netlify
Option A, drag and drop: open https://app.netlify.com/drop and drag this whole folder onto the page.

Option B, CLI from this folder:
```
npm i -g netlify-cli
netlify login
netlify deploy --prod --dir .
```
The first CLI deploy asks you to create or link a site.

## Replacing the placeholder baseline
In `index.html`, search for `BASELINE_IS_PLACEHOLDER`.
- Edit the `BASELINE` array to match the printed set (one entry per unit, in sheet order).
- Set `BASELINE_IS_PLACEHOLDER` to `false` to remove the badge.

Each entry looks like `{n:1, pri:'balanced', seed:34}`. Optional `W` and `D` (metres) fix the width and length.
`n` is bedrooms (0 to 4), and `pri` is one of `storage`, `bath`, `bedroom`, `balanced` or `other`.

## Android app (TWA, optional)
After the site is live, Bubblewrap can wrap it:
```
bubblewrap init --manifest https://YOUR-SITE.netlify.app/manifest.webmanifest
bubblewrap build
```
Then add the generated `assetlinks.json` to a `.well-known` folder here and redeploy so the app opens without a browser bar.

## Notes
- Units added by the owner are saved in their own browser only.
- Fonts load from Google Fonts. Everything else is in this folder.
