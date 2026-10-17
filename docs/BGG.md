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

Dimensions live on **versions** (editions), not on games: `GET /xmlapi2/thing?id=<id>&versions=1` returns `<version>` items with `width`, `length`, `depth` (inches) and `weight` (pounds). Many versions have no dimensions, so manual entry and a community-maintained size database remain necessary fallbacks. To be verified against a live response once the token is available.

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
