# Roadmap

Released versions are detailed in the [changelog](../CHANGELOG.md).

## Done

- **0.1** — Packing engine, procedural 3D KALLAX, front and list views, local collection, PWA.
- **0.2** — BGG collection CSV import, games without sizes, merge on re-import, overhang.
- **0.3** — Grouping (genre, designer, publisher, complexity, players, playing time, language), games on top of the shelves, cubes excluded from filling.
- **0.4** — Printable step-by-step instructions; tidy stacks; validation fixes.
- **0.5** — Grouping by decade, direction of every grouping level, box alignment.
- **0.6** — Sizes typed by hand always win over imported ones.

## Planned

### BoardGameGeek API (pending the API request)

- Edge worker holding the BGG token, with caching and rate limiting.
- Import a collection from a BGG username, sizes taken from the owned version (fallback: other editions).
- Game search by name, thumbnails, "Powered by BGG" attribution.
- Genre, designer and families filled automatically; families as an extra saga signal.

### Better layouts

- Drag & drop to pin a game to a cube; the engine works around pinned games.
- Expansions stored inside the base box.
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
