# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/H4Z4RD-H42/kallax/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/H4Z4RD-H42/kallax/releases/tag/v0.1.0
