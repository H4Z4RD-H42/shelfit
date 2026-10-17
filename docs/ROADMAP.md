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

## Planned

### BoardGameGeek API (pending the API request)

- Edge worker holding the BGG token, with caching and rate limiting.
- Import a collection from a BGG username, sizes taken from the owned version (fallback: other editions).
- Game search by name, thumbnails, "Powered by BGG" attribution.
- Genre, designer and families filled automatically; families as an extra saga signal.
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

### 1.0 — Public release

- Final name and branding, public repository, hosting on a custom domain.
- Optional cloud sync between devices.
- Community database of box sizes.
