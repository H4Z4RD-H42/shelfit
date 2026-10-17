# BoardGameGeek integration — research notes

_Last reviewed: 2026-10-17._

## Access rules

- Since 2025 the XML API2 requires a **registered application** (https://boardgamegeek.com/applications) and an `Authorization: Bearer <token>` header on every request. Requests must go to `boardgamegeek.com` (no `www`).
- The free licence is **non-commercial only**. Any monetisation (payments, ads) needs a commercial licence; ad-supported apps usually get it free up to 1,000 users.
- **One token per application**: tokens must not be shared between projects. This project must be registered as its own application — the token of another project (e.g. a Discord bot) must not be reused.
- Public apps must show the **"Powered by BGG"** logo linking to boardgamegeek.com and credit BGG as the data source. Data must not be modified when presented as BGG data, nor used to train AI models.
- Expected etiquette: server-side requests, aggressive caching, about **one request every 2 seconds**, jittered backoff on 429/503. Third-party services that proxy BGG data to other applications are not allowed.

Sources: [Using the XML API](https://boardgamegeek.com/using_the_xml_api), [XML API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use), [Commercial use](https://boardgamegeek.com/wiki/page/BGG_XML_API_Commercial_Use).

## Where the box sizes are

Dimensions live on **versions** (editions), not on games: `GET /xmlapi2/thing?id=<id>&versions=1` returns `<version>` items with `width`, `length`, `depth` (inches) and `weight` (pounds). To be verified against a live response once the token is available.

The **collection CSV export** contains no sizes and no version id: only `version_nickname`, `version_publishers`, `version_languages`, `version_yearpublished`. The XML collection endpoint with `version=1` should return the version id.

### Field test (2026-10-17, a real 54-item Italian collection)

Sizes were read from the public versions pages (`/boardgame/<id>/<slug>/versions?pageid=1&language=<id>`; Italian = 2193, English = 2184, German = 2188). The page marks the owned edition with "Own".

- 19 items: the owned edition has a size.
- 30 items: the owned edition has no size, but another edition of the same game does (usually identical boxes) → good fallback.
- 5 items: no edition has a size → manual entry.

Takeaways for the importer: prefer the owned version, fall back to the most common size among the other editions, flag the source (`own` / `alt`) so the user knows which sizes to double-check, and keep manual entry first-class.

## Expansion links

The collection CSV only says whether an item is an expansion (`itemtype`), not which game it expands. `GET /xmlapi2/thing?id=<id>` lists `<link type="boardgameexpansion">` entries: on an expansion they point to the base games (marked `inbound="true"`), on a base game to its expansions. An expansion may expand several games, and usually a specific edition (e.g. a first-edition expansion while the owned base is the second edition), so match the links against the owned ids and keep every match. To be verified against a live response once the token is available.

## Planned architecture

```
browser (PWA) ──► our edge worker (Cloudflare) ──► boardgamegeek.com/xmlapi2
                  - holds the token (secret)
                  - caches responses (KV)
                  - rate-limits to ~0.5 req/s
```

- The token can never ship in the client bundle, hence the small backend.
- The worker serves only this app (no public proxy), with CORS restricted to our origin.
- Flow: user enters a BGG username → collection (`/collection?username=…&own=1&version=1`) → for each game, the version dimensions → sizes stored locally.

## Next steps

1. Register a dedicated non-commercial application on BGG for this project and wait for approval.
2. Store the token as a worker secret (`wrangler secret put BGG_TOKEN`), never in the repo.
3. Implement the worker with caching and the import flow in the app.
