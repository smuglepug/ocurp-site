# Cover image sources — website section

Every image in `workspace/covers/` was downloaded from the site's own published
`og:image`/banner, or from Wikimedia Commons where the site publishes nothing.
Attribution is recorded here because several belong to third parties.

| file | source | licence / note |
|---|---|---|
| `rentify.jpg` | `https://rentifyevents.com/ourbanner.png` | Owner's own site — Owen |
| `toolstack.jpg` | `https://yt3.googleusercontent.com/...` (Toolstack Labs YouTube channel banner, channel `UC1ejAqLHk1TrFypqgh1Hx5A`) | Owner's own channel — Owen |
| `neal-fun.jpg` | Wikimedia Commons `File:Neal.Fun Logo.svg`, composed onto a dark card | **Public domain** |
| `the-pudding.jpg` | `https://pudding.cool/common/assets/social/og-facebook.jpg` | The Pudding's own social card — third-party, used to link to them |
| `wonderland.jpg` | `https://wonderlandengine.com/images/wonderland-social-card.webp` | Wonderland Engine's own social card — third-party |
| `radio-garden.jpg` | `https://radio.garden/public/icons/rg-facebook-1.jpg` | Radio Garden's own icon — third-party |
| `window-swap.jpg` | `https://www.window-swap.com/TwitterCardImg.png` | Window Swap's own Twitter card — third-party |
| `zoomquilt.jpg` | `http://zoomquilt.org/img/zoomquilt.jpg` | Zoomquilt's own image — third-party |

The `fun` category links out to other people's sites, so their images appear as
identification for the link they belong to. If any of them object, delete the
file and the registry falls back to the generated pattern art — no breakage.

## Why self-hosted instead of hotlinked

`https://radio.garden/public/icons/rg-facebook-1.jpg` returns **403** to a plain
`curl` from this machine, and in-browser the external URLs rendered as blank cards.
Every cover is now downloaded once and served from `/workspace/covers/`, so the
section cannot break because a third party blocked a hotlink or changed their CDN.

All images are downscaled to 1200 px wide, quality 86–88, progressive JPEG.
Total for eight covers: **~700 KB**.

## Entries with no image yet

| slug | why |
|---|---|
| `wearbenin` | Site publishes only `/assets/og-default.svg` (a placeholder). Needs a real screenshot. |
| `patatap` | No `og:image`, nothing on Wikimedia Commons. |
| `thispersondoesnotexist` | No `og:image`; the site generates a new face per load, so any static still needs capturing. |
| `fun-websites` | Points at a Parade article; the article's imagery is not ours to use. |
| `jobhub` | `ready: false` — no URL yet. |
| `portfolio` | This site itself. |

These render the generated pattern art, which is the correct fallback — not a
broken image and not an invented picture.
