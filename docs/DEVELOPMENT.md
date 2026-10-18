# Development

## Requirements

Node.js 24 (see `.node-version`).

## Commands

```bash
npm install
npm run dev        # development server
npm run dev:lan    # development server reachable from other devices on the same network
npm run check      # typecheck, lint, format check and tests
npm run build      # production build in dist/
```

The app is not published yet.

## CSV import

A header row is required. Recognised columns (English or Italian names): `name` (required), `width`, `height`, `depth` (cm, decimal comma allowed), `saga`, `year`, `orientation` (`vertical`, `horizontal`, `auto`), `bggid`.

The BoardGameGeek collection export (_Collection → Export_) is recognised as is: owned games are imported with their BGG id, year, edition and expansion flag. BGG does not export box sizes, so those games are flagged as _size missing_ until you add the sizes (each game links to its BGG versions page) or import a CSV with the `width`, `height`, `depth` columns. Importing again updates the existing games instead of duplicating them.

```csv
name;width;height;depth;saga;year
Zombicide: Black Plague;30,5;30,5;9,5;Zombicide;2015
Azul;26.5;26.5;7.5;;2017
```

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · three.js via React Three Fiber · Zustand + IndexedDB · Vitest · vite-plugin-pwa.

The packing engine (`src/domain`) is framework-free and fully unit-tested.

## Versioning

The project follows [Semantic Versioning](https://semver.org/). Changes are listed in the [changelog](../CHANGELOG.md).
