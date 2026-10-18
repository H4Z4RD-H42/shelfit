# Roadmap

Released versions are detailed in the [changelog](../CHANGELOG.md).

## Done

- **0.1** — Packing engine, procedural 3D KALLAX, front and list views, local collection, PWA.
- **0.2** — BGG collection CSV import, games without sizes, merge on re-import, overhang.
- **0.3** — Grouping (genre, designer, publisher, complexity, players, playing time, language), games on top of the shelves, cubes excluded from filling.
- **0.4** — Printable step-by-step instructions; tidy stacks; validation fixes.
- **0.5** — Grouping by decade, direction of every grouping level, box alignment.
- **0.6** — Sizes typed by hand always win over imported ones.
- **0.7** — Long side at the front for lying boxes; redesigned options panel.
- **0.8** — Phone layout with bottom navigation; 3D camera fitted to the screen.
- **0.9** — Deep boxes can stick out at the back; games that fit in no cube go on top by default.
- **0.10** — Box titles wrap onto several lines.
- **0.11** — Sagas can be kept on one shelf row.
- **0.12** — Zones: cubes reserved to small games, party games, games to play, tags and more, marked on the shelves.
- **0.13** — Overhang and free top set per shelf unit.
- **0.14** — Custom shelves built compartment by compartment.
- **0.15** — Maps and filters over the shelves.
- **0.16** — Rule priorities: the engine gives up the least important rules to fit every game, and tells what each rule costs; options regrouped around the goal.
- **0.17** — Three goals (in order, balanced, max space), room left counted in standard boxes, sorting without leading articles.

## Planned

### BoardGameGeek API (pending the API request)

- Edge worker holding the BGG token, with caching and rate limiting.
- Import a collection from a BGG username, sizes taken from the owned version (fallback: other editions).
- Game search by name, thumbnails, "Powered by BGG" attribution.
- Genre, designer and families filled automatically; families as an extra saga signal.
- Categories (children's and party zones), plays, trade status and box weights (heavy zone) filled automatically.
- Expansion → base game links (by BGG id): each expansion placed right after the game it expands, and the base game's box shown when locating an expansion stored inside it.

### Better layouts

- Drag & drop to pin a game to a cube; the engine works around pinned games.
- Expansions stored inside the base box (uses the BGG expansion links).
- Weight-aware stacking and shelf load warnings.
- Run the engine in a Web Worker for very large collections.

### Sharing

- Shareable read-only link to a layout.
- Printable image of the front view.
- Box textures from game images in the 3D view.

### Public stats page (with the edge worker)

A public `/stats` page in the spirit of a service status page, fed by anonymous events sent to the same Cloudflare worker as the BGG proxy (stored in D1).

- **Community**: shelves planned, boxes placed, KALLAX units by size (1×4, 2×2, 4×4…), average fill.
- **Service status**: BGG proxy health, import success rate, queue length, cache hit rate.
- **Curiosities**: most shelved games, most common shelf setup, largest collection.
- **Activity**: layouts computed per day (bar chart) and an anonymous feed of the latest plans (no usernames).
- **Privacy**: on by default, switchable off in the settings and explained on the page; no cookies, no IP stored, a random installation id only, aggregated per day.

### More languages

- Interface in languages other than Italian and English (the translations live in `src/i18n`).

### 1.0 — Public release

- Final branding, public repository, hosting on the custom domain shelfit.to.
- Optional cloud sync between devices.
- Community database of box sizes.
