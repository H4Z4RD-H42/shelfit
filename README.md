# Shelf Planner

> Working title — the final name is still to be chosen.

**Shelf Planner** finds the best way to fit your board game collection into IKEA KALLAX shelves. Tell it which games you own and which shelves you have: it decides where every box goes, standing or lying flat, so that as many games as possible fit.

## Features

- **Smart packing engine** — every cube is split into columns of standing boxes ("books") and stacks of flat boxes. A beam search explores all the combinations and picks the one that wastes less room.
- **Orientation control** — vertical, horizontal or automatic, globally or per game.
- **Two strategies** — _Ordered_ keeps your order (name, year, size, colour, date added) cube after cube; _Max space_ ignores the order to fit as many games as possible.
- **Grouping** — keep together games of the same genre, designer, publisher, complexity, player count, playing time or language, on one or two levels, optionally starting each group in a new cube and colouring boxes by group.
- **On top and blocked cubes** — boxes that fit in no cube can be stored on top of the shelves; cubes used for drawers or other things can be excluded.
- **Sagas** — chapters of the same series (Zombicide, Pandemic Legacy, Ticket to Ride…) are detected from their names and kept together, even avoiding splitting them across two cubes.
- **Realistic 3D KALLAX** — the shelf is built procedurally from its real measurements, in every official size (1×1 to 5×5) and finish, and you can combine several units.
- **Three views** — interactive 3D shelf, front view and a cube-by-cube list.
- **Printable instructions** — a step-by-step list to rearrange the shelves with pen and paper, no screen needed.
- **Local-first PWA** — installable on desktop and mobile, works offline, data stays on your device. Import/export as JSON backup or CSV.
- **Italian and English** interface.

## Getting started

Requirements: Node.js 22+.

```bash
npm install
npm run dev        # development server
npm run dev:lan    # development server reachable from other devices on the same network
npm run check      # typecheck, lint, format check and tests
npm run build      # production build in dist/
```

### CSV import

A header row is required. Recognised columns (English or Italian names): `name` (required), `width`, `height`, `depth` (cm, decimal comma allowed), `saga`, `year`, `orientation` (`vertical`, `horizontal`, `auto`), `bggid`.

The **BoardGameGeek collection export** (_Collection → Export_) is recognised as is: owned games are imported with their BGG id, year, edition and expansion flag. BGG does not export box sizes, so those games are flagged as _size missing_ until you add the sizes (each game links to its BGG versions page) or import a CSV with the `width`, `height`, `depth` columns. Importing again updates the existing games instead of duplicating them.

```csv
name;width;height;depth;saga;year
Zombicide: Black Plague;30,5;30,5;9,5;Zombicide;2015
Azul;26.5;26.5;7.5;;2017
```

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · three.js via React Three Fiber · Zustand + IndexedDB · Vitest · vite-plugin-pwa.

The packing engine (`src/domain`) is framework-free and fully unit-tested.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Next big step: importing collections and box sizes from BoardGameGeek ([notes](docs/BGG.md)).

## Versioning

The project follows [Semantic Versioning](https://semver.org/). Changes are listed in the [changelog](CHANGELOG.md).

## Legal

KALLAX is a trademark of Inter IKEA Systems B.V. This project is not affiliated with, endorsed or sponsored by IKEA.
Game data will be provided by [BoardGameGeek](https://boardgamegeek.com) under its XML API terms.

Released under the [MIT License](LICENSE).
