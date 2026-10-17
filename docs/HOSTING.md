# Hosting

The app is served by **Cloudflare Workers** (static assets only for now; the BGG worker and the stats will join the same Worker later).

- Worker: `shelf-planner` (account of the project owner), configured in [`wrangler.jsonc`](../wrangler.jsonc).
- Address: https://shelf-planner.mirko-gubinelli.workers.dev (temporary, until the final name and domain are chosen).
- What is published: the `dist/` folder produced by `npm run build`.

## Private until 1.0

The address is guarded by **Cloudflare Access** (Zero Trust → Access controls → Applications → _Shelf Planner_):

- destination: the `shelf-planner` Worker (production and preview URLs);
- policy _Solo Mirko_: allow, only the owner's email; login with a one-time code sent by email;
- session: 1 month.

Anyone else is redirected to the Cloudflare login page. To let someone in, add their email to the policy. On launch day delete the Access application: the site becomes public.

Because of Access, the web manifest is requested with credentials (`useCredentials` in `vite.config.ts`), otherwise the app could not be installed on phones.

Preview URLs are off (`preview_urls: false`). `workers_dev` must stay `true`: a deploy with `false` switches the address off.

## Deploying

- **Automatic**: Workers Builds is connected to the GitHub repository; every push to `main` runs `npm run build` and `npx wrangler deploy`.
- **By hand**: `npm run build && npx wrangler deploy` (needs `npx wrangler login` once).

## Data on a new address

Collections live in the browser storage of each address, so data saved on the development server does not appear on the published site. Move it with the app's JSON backup (export there, import here), once per device.
