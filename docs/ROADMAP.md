# Roadmap

## 0.1 — Foundation ✅

Packing engine, procedural 3D KALLAX, front and list views, local collection, PWA.

## 0.2 — BoardGameGeek import

- Edge worker holding the BGG token, with caching and rate limiting.
- Import a collection from a BGG username, sizes taken from the owned version.
- Game search by name, thumbnails, "Powered by BGG" attribution.
- Sagas from BGG families as an extra signal.

## 0.3 — Better layouts

- Drag & drop to pin a game to a cube; the engine works around pinned games.
- Expansions stored inside the base box.
- Weight-aware stacking and shelf load warnings.
- Run the engine in a Web Worker for very large collections.

## 0.4 — Sharing

- Shareable read-only link to a layout.
- Printable PDF / image of the front view.
- Box textures from game images in the 3D view.

## 1.0 — Public release

- Final name and branding, public repository, hosting on a custom domain.
- Optional cloud sync between devices.
- Community database of box sizes.
