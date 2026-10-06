# Design notes: portfolio redesign (branch design/portfolio-pro)

## What changed
- `/` (homepage) rebuilt as static HTML + `assets/site.css` + `assets/site.js`. The old page was a minified React bundle (no source) that loaded Tailwind from a CDN at runtime, React/Three/recharts from esm.sh, and three Google font families. The new page has zero external requests and no framework; first paint is a ~22 KB HTML file plus ~12 KB CSS.
- `/workspace/` hub restyled with the same system (links and URLs unchanged).
- New card images in `images/work/*.webp` (16:10 crops, 592-800 px wide, 14-50 KB each). Originals in `images/` are untouched.
- Old bundle (`assets/index-rentify-live-20260904.js`, `ocurp-3d.js`) is left in place but no longer referenced by `/`. Delete when satisfied.

## Design system
- One accent (#FF5F1F) on near-black, as before. Contrast: body text 7.9:1, labels 5.6:1, button text on accent 7:1.
- 8px spacing grid, radii 8/16/24, one shadow, system type stack (Segoe UI Variable / system-ui) plus ui-monospace for small labels. No web fonts, so nothing blocks render. If you want a custom display face later, self-host one woff2 and change `--font-display`.
- Motion: gentle fade-up on scroll, hover lift on cards, all disabled under `prefers-reduced-motion`. Content is visible without JS, and a timer force-reveals anything the observer misses.
- Mobile-first; checked at 390, 768, 1280, 1920: no horizontal scroll, buttons/links >= 44px, visible focus rings, skip link, semantic landmarks.

## Content decisions (owner please confirm)
- Hero: "Software people actually use." (taken from your own founder quote). Primary CTA: See the work; secondary: Open the workspace.
- Fake contact form removed: the old form only ran a 2-second timer and sent nothing. Replaced by real email/phone lines and a form that opens the visitor's email app with the message prefilled (mailto).
- Dropped the radar chart ("Competency Matrix": Logic 96, Intelligence 94...) because the scores were invented numbers, and the per-project "System Capabilities" lists (e.g. "Virtual 3D Tour Integration", "Stripe/PayPal"), which I could not verify. Kept your three Discipline pillars, tags and quote.
- Added Ederdrone as a 7th project, labelled honestly: "builds and runs in simulation; it has not flown yet" (from your build log in PORTFOLIO-REWORK-RECAP.md). Remove the card if you would rather not show it.
- Rentify copy follows websites-data.js (events marketplace), not the older "rental platform" text. WearBenin now links to the GitHub Pages site (live, 200) instead of the repo.
- Tool/game/website counts come live from the registry files (static fallback shown if fetch fails).
- Personal portrait: NOT used. Commit c9be9c38 deliberately removed it, and the page now credits "Led by Ocurp". A founder avatar monogram is used instead. A best-effort 4:5 crop of pfp_f exists at `../design_review/owen-portrait-candidate_4x5.jpg`, but the source photo is only ~400 px, so a new higher-resolution photo is needed before it belongs on a professional page.

## Left alone
`workspace/games|tools|covers`, `/ocurp/profile`, `/ocurp/signin`, `/ocurp/portfolio/createproject` (still Tailwind-CDN pages: next candidates), `.htaccess`, `sitemap.xml`, robots, all URLs. Old homepage anchor ids (#home, #portfolio...) no longer exist; `#work`, `#workspace`, `#about`, `#contact` do.
Note: some `tools/verify_*.js` scripts probe the old React DOM and will need updating.

## Known weaknesses
- System fonts render differently on Mac/Android; fine but not a distinctive typeface.
- Phone-screenshot card images are small (508-648 px wide) so they look soft on large cards; real 16:10 desktop captures of each site would be better. NGO and Mission Control images are weak.
- Tool/game tiles use initials, not artwork (existing logos were placeholder monograms).
- Not tested in Safari/Firefox, only Chromium.

## Screenshots
`../design_review/before_home_{390,768,1280,1920}.png` and `after_home_*`, `after_workspace_*`, `before_workspace_*`.

## Preview / merge (commands only)
```
python -m http.server 5181 --directory "C:\Users\ZEPHYRUS G14\Documents\ocurp-workspace\appsite_portfolio"
git -C "C:\Users\ZEPHYRUS G14\Documents\ocurp-workspace\appsite" merge design/portfolio-pro
```

## v2 (2026-10-05, owner feedback)
- Hero: the original Ocurp point-cloud globe is back (`assets/globe.js`, canvas 2D re-implementation of the old Three.js sphere: 45x45 points over a 30x30 wireframe), with no additive glow and no glowing buttons. Centred "THE OCURP" headline as in the original.
- Kept from v1: wordmark/logo, everything from Selected work down, Mission Control (In the lab).
- Work grid is 2-1-2-2: Livan | Ederdrone (drone card, top right), Rentify Events (wide featured), WearBenin | The Book of Layers, NGO | Restaurant. On phones the pairs stay side by side as compact cards, so the shape still reads.
- Footer and contact use real GitHub / X / LinkedIn SVG logo buttons, like the original footer.
- Type: self-hosted Space Grotesk, Inter, JetBrains Mono (assets/fonts, latin subsets, OFL).
- Screenshots: ../design_review/v2/before_home_*.png and after_home_*.png.
