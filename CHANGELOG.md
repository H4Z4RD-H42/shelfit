# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.16.0] - 2026-10-18

### Added

- Rule priorities, in Options → "When room runs out": the active layout rules (strict order, whole sagas in a cube, sagas on one row, each group in its own cubes, every box standing or lying, long side at the front, stack height) are listed with "Every game on the shelves" in order of importance, and arrows change the order. When games are left out for want of room, the engine gives up rules from the bottom of the list, only as many as needed, keeping the more important ones. Rules above "Every game on the shelves" are never given up: some games stay out instead.
- Each rule in the list tells what it costs: the cubes it takes, the games it leaves out, or nothing. Rules given up are struck through, marked "given up" next to their switch, and counted in a chip of the stats bar that opens the list.
- Under the two strategies, a line tells what the other one would do: e.g. "With Max space 12 cubes would do instead of 16".

### Changed

- The options panel starts from the goal (ordered or max space) and has fewer sections: Order (sorting, grouping, filling order, strict order), Sagas, Zones, When room runs out, Boxes (orientation, long side, alignment, margin, stacks).
- "Fill gaps with later games" became "Strict order", on by default (the same as gaps not filled). With the default priorities, strict order is the first rule given up when games would be left out.
- The layout is computed once for the whole page instead of once for each part of the screen showing it.

## [0.15.4] - 2026-10-18

### Fixed

- A game joins the saga typed by hand on its other chapters when its title starts with that saga: "The Thing: The Boardgame" now stands with the expansions marked "The Thing" instead of on its own.
- Inside a saga every game is followed by its own expansions: "Nemesis: Lockdown – Stretch Goals" comes after "Nemesis: Lockdown" and no longer before it, and "Black Rose Wars: Duel – Lex" no longer sits between "Rebirth" and its expansions. An expansion goes under the game whose title starts its own, otherwise under the latest base game released before it.
- In the list view the "Maps and filters" button no longer covers the first cubes.
- The saga field of a game shows the saga found from the title (e.g. "Automatic: Black Rose Wars") instead of a bare "Automatic".

## [0.15.3] - 2026-10-18

### Changed

- The default margin around each box is 0.5 cm instead of 0.3 cm. Margins already set are kept.

## [0.15.2] - 2026-10-17

### Changed

- The fill figure in the stats bar reads "used cubes 44% full" instead of "44% filled", and explains on hover how it is measured: volume of the boxes over the inner volume of the cubes holding at least one game; empty cubes and boxes on top do not count.

## [0.15.1] - 2026-10-17

### Fixed

- On phones the maps and filters panel no longer covers most of the shelves: it is docked under them, so the shelves shrink but stay whole in sight, and a tap on its title folds it to one line with the legend and the number of matching games.

## [0.15.0] - 2026-10-17

### Added

- Maps and filters: a panel over the shelves (3D, front and list views), opened from the "Maps and filters" button, that colours the boxes by their data, like the data views of a city builder. It floats on the right on wide screens and rises from the bottom on phones.
- Maps: colour every box on a scale by year, complexity, playing time, maximum players, rating, plays, weight or box volume, or with one colour per genre, designer, publisher or language, with a legend. Games without the data are grey.
- Filters: players the game must be playable with, ranges (year, complexity, playing time, rating, plays, weight) on two-handle sliders, expansion / for trade / never played, and genres, BGG categories, designers, publishers, languages and tags. Games matching every filter stay lit; the others fade out (see-through ghosts in 3D). Filters and map work together: the map scale is measured on the games left.
- Only the data the collection actually has is offered. The lens is not saved: reloading the page shows the shelves as usual.

## [0.14.0] - 2026-10-17

### Added

- Custom shelves: in the Shelves tab a unit can be "KALLAX" (standard IKEA sizes, the default for new units) or "Custom". A custom unit starts from the current KALLAX grid and is rebuilt compartment by compartment: tap a compartment to set the width of its column and its own height, add compartments above or below, add columns on either side, remove them, or exclude the compartment. Columns may have different heights, giving stepped shelves; depth and the thickness of outer and inner panels are set per unit.
- Boxes go only into compartments large enough for them; a box too large for the current compartment waits for the next one it fits in, while the following games move up.
- On a stepped unit, boxes stored on top lie on its highest part.
- "By rows" filling reads a custom unit from the highest compartment down, treating compartments whose tops are within 1 cm as one row.
- The front view draws the real outline of each unit; the cube pickers of the zones and the printed map are drawn to scale.

### Changed

- The cube size is no longer one setting shared by every unit: KALLAX units always have the standard sizes. Units saved with a different cube size become custom units with those sizes, so nothing moves.
- Backups no longer carry a shared cube size (backup format version 4; older backups still load and are converted the same way).

## [0.13.0] - 2026-10-17

### Changed

- Overhang, the side boxes stick out from and the use of the top are now settings of each shelf unit, in the Shelves tab, instead of options of the whole collection: a unit against the wall and one with free room behind it, or one with a TV on top, can live side by side. Existing settings are carried over to every unit.
- A box too deep for a unit waits for the first unit it can stick out of, while the next games move up.
- Games that fit in no cube go on top of the units with a free top ("Free top", on by default); the "put on top" option is gone.
- The "Space and sizes" options section is now "Clearance and stacks".

## [0.12.0] - 2026-10-17

### Added

- Zones: parts of the shelves reserved to some games, taken out of the normal order (Options → Zones). Several zones can be created; when a game belongs to more than one, the first in the list wins. Each zone has:
  - a rule: small games, large boxes, children's games, party games, solo, two-player, favourites (rated 8+), to play (no plays), for sale or trade, heavy boxes, a tag, or games chosen by hand;
  - a place: at the end of the shelves (default), at the start, in the bottom row, at eye level (about 140 cm), or in cubes chosen by hand, which stay reserved even while empty;
  - a strategy inside the zone: fit the boxes together, or follow the sort order.
- "Small" and "large" have no fixed threshold: they are relative to the collection, from how many copies of each box a cube holds, split where the sizes separate most clearly. With sagas grouped, a saga follows its first chapter, so a small expansion stays next to its base game.
- Zone marks on the shelves: the back of the cubes tinted with the zone colour and a label with the zone name on the panel under them, in the 3D and front views; zone names in the list view, the printed instructions, the collection list and the game card.
- Game card: tags, number of plays, "for sale or trade", and per-zone Auto / Yes / No choices that override the rules.
- The BGG collection CSV import reads the plays (`numplays`) and the games for trade (`fortrade`); a `tags` column is read too.
- Backups include the zones (backup format version 3; older backups still load).

## [0.11.0] - 2026-10-17

### Added

- "Do not wrap sagas onto the next row" option: a saga taking several cubes stays on one shelf row (or column, when filling by columns). If it would wrap, it starts on the next row and the cubes left at the end of the row stay empty. Sagas longer than a row wrap anyway.

### Fixed

- Cubes left empty on purpose no longer count as used in the statistics.

## [0.10.0] - 2026-10-17

### Changed

- Long titles on the boxes wrap onto up to three lines instead of shrinking or being cut, in the 3D and front views. Lines break where the text can be largest, preferably at a subtitle (after ":" or at a dash, which is dropped) and never right after a short word such as "La" or "of".

## [0.9.0] - 2026-10-17

### Added

- "Stick out" option next to the overhang: boxes deeper than a cube can stick out at the back instead of the front, for shelves with free room behind them. At the front they then stay flush.

## [0.8.1] - 2026-10-17

### Changed

- Games that physically fit in no cube now go on top of the shelves by default, instead of among the games without a spot. Saved settings are updated too; the option can still be turned off.

## [0.8.0] - 2026-10-17

### Added

- Phone layout: one full-screen page at a time (Shelf, Collection, Shelves, Options) chosen from a bottom navigation bar, instead of a cramped split between the shelves and the panels.
- "Show on the shelf" button in the collection list on phones: selects the game and opens the shelf view.

### Changed

- Collection list actions are icon buttons, always visible on touch screens (they were hover-only, so invisible on phones).
- The 3D camera fits the whole scene to the canvas proportions, so portrait screens no longer crop the shelves.

## [0.7.1] - 2026-10-17

### Changed

- Collection list: box sizes and sagas are shown as badges with an icon (ruler, layers); sizes use the decimal separator of the interface language; missing sizes get a warning badge.

## [0.7.0] - 2026-10-17

### Added

- "Lying boxes: long side at the front" option, for a bookshelf look (stacks take more width).

### Changed

- Redesigned options panel: five collapsible sections (Layout, Order, Grouping, Sagas, Space and sizes), each with a live one-line summary of its values, a dot when it differs from the defaults and a per-section reset. Open sections are remembered.
- Explanations are shown on demand behind an info button instead of always.
- With "Max space", order and grouping explain why they do not apply instead of being silently greyed out.

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

[Unreleased]: https://github.com/H4Z4RD-H42/kallax/compare/v0.16.0...HEAD
[0.16.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.15.4...v0.16.0
[0.15.4]: https://github.com/H4Z4RD-H42/kallax/compare/v0.15.3...v0.15.4
[0.15.3]: https://github.com/H4Z4RD-H42/kallax/compare/v0.15.2...v0.15.3
[0.15.2]: https://github.com/H4Z4RD-H42/kallax/compare/v0.15.1...v0.15.2
[0.15.1]: https://github.com/H4Z4RD-H42/kallax/compare/v0.15.0...v0.15.1
[0.15.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/H4Z4RD-H42/kallax/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/H4Z4RD-H42/kallax/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.3...v0.5.0
[0.4.3]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/H4Z4RD-H42/kallax/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/H4Z4RD-H42/kallax/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/H4Z4RD-H42/kallax/releases/tag/v0.1.0
