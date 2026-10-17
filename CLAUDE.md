# Project conventions

- **Product**: web app (PWA) that plans where to put board game boxes in IKEA KALLAX shelves. "Shelf Planner" is a working title; the name lives in `src/config.ts`, `index.html`, `vite.config.ts` (manifest) and `README.md`.
- **Language**: code, comments, commits and docs in English; UI strings in `src/i18n/it.ts` and `src/i18n/en.ts` (every key in both).
- **Units**: all lengths are centimetres.
- **Architecture**: `src/domain` is pure TypeScript (no React) and must stay unit-tested; UI in `src/components`; state in `src/store/appStore.ts` (Zustand persisted to IndexedDB).
- **Checks**: run `npm run check` and `npm run build` before committing.
- **Git**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). Commit and push to `main` without asking.
- **Versioning**: SemVer, bumped autonomously. Pre-1.0: new features → minor, fixes → patch. Update `package.json`, `CHANGELOG.md`, then tag `vX.Y.Z` and push the tag.
- **Secrets**: the BGG token never goes in the repo or in the client bundle (see `docs/BGG.md`).
