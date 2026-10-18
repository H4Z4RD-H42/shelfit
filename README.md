# shelfit.to

**shelfit.to** finds the best way to fit your board game collection into IKEA KALLAX shelves. Tell it which games you own and which shelves you have: it decides where every box goes, standing or lying flat, so that as many games as possible fit.

## Features

- **Smart packing engine** — every cube is split into columns of standing boxes ("books") and stacks of flat boxes. A beam search explores all the combinations and picks the one that wastes less room.
- **Orientation control** — vertical, horizontal or automatic, globally or per game.
- **Three goals** — _In order_ keeps your order (name, year, size, colour, date added; articles can be skipped) and every rule; _Balanced_ keeps the order but gives up the least important rules to fit every game; _Max space_ ignores the order to fit as many games as possible. The options panel tells what another goal would give, and the stats bar how many more standard boxes would still fit.
- **Priorities instead of trial and error** — the layout rules (strict order, whole sagas in a cube, sagas on one row, a cube per group, forced orientation, long side at the front, stack height) sit in a list with "every game on the shelves". When room runs out, the engine gives up the least important rules, only as many as needed, and says which; rules placed above "every game on the shelves" are never given up. Each rule shows what it costs in cubes or games left out.
- **Grouping** — keep together games of the same genre, designer, publisher, complexity, player count, playing time or language, on one or two levels, optionally starting each group in a new cube and colouring boxes by group.
- **On top and blocked cubes** — boxes that fit in no cube can be stored on top of the shelves; cubes used for drawers or other things can be excluded.
- **Sagas** — chapters of the same series (Zombicide, Pandemic Legacy, Ticket to Ride…) are detected from their names and kept together, even avoiding splitting them across two cubes.
- **Realistic 3D KALLAX** — the shelf is built procedurally from its real measurements, in every official size (1×1 to 5×5) and finish, and you can combine several units.
- **Custom shelves** — any other bookcase can be rebuilt column by column: each column has its own width and its own compartments, each with its own height, columns may differ in height (stepped shelves), and depth and panel thickness are yours to set.
- **Three views** — interactive 3D shelf, front view and a cube-by-cube list.
- **Maps and filters** — like the data views of a city builder: colour the boxes on a scale by year, complexity, playing time, rating… or by genre and publisher, and fade out the games that do not match filters such as "playable with 2", a range of years or a complexity range.
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

The app is published on Cloudflare Workers, privately until 1.0: see [docs/HOSTING.md](docs/HOSTING.md).

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
