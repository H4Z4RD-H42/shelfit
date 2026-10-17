# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0] - 2026-10-17

### Added

- Sizes typed by hand always win: a re-import never overwrites them, and the import message says how many were kept. The editor shows where the sizes of a game come from. Deleting a game (or clearing the collection) and importing it again restores the sizes of the file.

## [0.5.0] - 2026-10-17

### Added

- Grouping by year, in decades.
- Ascending or descending order for every grouping level (games without the value always go last).
- Box alignment: left (new default), centre or right, both for the columns in a cube and for the boxes of each stack; also on top of the shelves.

### Changed

- The sort direction is now a labelled button ("Ascending" / "Descending").
- Options saved by older versions are upgraded automatically.

## [0.4.3] - 2026-10-17

### Fixed

- After a CSV import, the "without size" count now refers to the collection, not to the file: sizes entered by hand and kept by the merge are no longer counted as missing.

## [0.4.2] - 2026-10-17

### Fixed

- Editing a game no longer rejects decimal values (e.g. 30.7 cm, complexity 2.26): the browser treated the arrow-key increment as a validity rule. Values are now checked by the app, with clear messages (complexity 1–5, rating 1–10, min players ≤ max players, complete positive sizes).

## [0.4.1] - 2026-10-17

### Fixed

- Stacks never put a box on top of a narrower or shallower one: every box must fit within the footprint of the box below (1 cm tolerance for same-size boxes with slightly different measurements). Applies to cubes and to the top of the shelves.

## [0.4.0] - 2026-10-17

### Added

- Printable instructions (Print button, or the browser's print / save as PDF): a numbered map of each unit, then cube by cube the games to place from left to right, stacks from the bottom up, with a tick box for every game; what goes on top of the shelves and what stays off them.

## [0.3.0] - 2026-10-17

### Added

- Grouping on one or two levels: genre, designer, publisher, complexity, number of players, playing time, language. Sagas stay together inside their group.
- Option to start every group in a new cube, and to colour boxes by group in all views; the list view shows the groups of each cube.
- Game details: genre, designer, publisher, language, players, playing time, complexity and personal rating, with suggestions from the collection. The BGG CSV import fills publisher, language, players, playing time, complexity and rating.
- New sort keys: complexity, playing time, personal rating.
- "On top of the shelf" per game, plus an option to put there every game that fits in no cube; drawn in all views.
- Cubes not to use (drawers, doors, other uses), chosen per unit and drawn as drawer inserts.
- Short explanations under every option.

## [0.2.0] - 2026-10-17

### Added

- Import of the BoardGameGeek collection CSV export: owned items only, BGG id, year, owned edition and expansion flag.
- Re-importing merges into the collection (matched by BGG id or name) instead of duplicating games, keeping sizes and choices made by hand.
- Games without a box size: flagged as "size missing", with a link to the BGG versions page of the game.
- Collection filters: all, without size, without a spot.
- Expansion flag and "keep off the shelves" option per game (e.g. expansions stored in the base box).
- Allowed overhang option: boxes deeper than the cube may stick out of the front.

### Changed

- Box sizes are optional; CSV files only require a name column.
- Backup format version 2 (games may have no size).

## [0.1.0] - 2026-10-17

### Added

- Packing engine: column/stack model per cube, beam search, vertical/horizontal/automatic orientation (global and per game).
- Ordered and max-space strategies, sorting by name, year, size, colour and date added, cube filling by rows or columns.
- Saga detection from game names, grouping, and option to avoid splitting a saga across cubes.
- Optional gap filling with later games and configurable clearance and stack height.
- Procedural 3D KALLAX shelf with every official size and finish, multiple units side by side.
- Front view and cube-by-cube list, details card for the selected game.
- Collection management: add, edit, delete, search, sample collection.
- JSON backup import/export and CSV import.
- Local persistence in IndexedDB, installable offline PWA.
- Italian and English interface, light and dark theme.

[Unreleased]: https://github.com/H4Z4RD-H42/kallax/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/H4Z4RD-H42/kallax/releases/tag/v0.1.0
