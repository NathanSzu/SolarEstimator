# Solar Estimator

Estimate when a planned solar installation pays for itself. Enter a location, system size, costs and optional loan terms, then view payback timelines, production, and what-if scenarios. Up to 3 plans are stored in your browser's localStorage; there is no backend or database.

## Data sources

- **Production:** historical hourly irradiance from [Open-Meteo](https://open-meteo.com/) (keyless).
- **Location search:** Open-Meteo geocoding (keyless).
- **Local rate and price trend (US, optional):** [EIA](https://www.eia.gov/opendata/) residential prices, if a key is set. Otherwise you enter your own rate and escalation.

## Development

```
npm install
npm run dev
npm test
npm run lint
npm run build
```

### Optional API keys

Copy `.env.example` to `.env.local` and fill in any keys. `.env.local` is git-ignored. Vite bundles `VITE_*` values into the public JavaScript, so only use free or referrer-restricted keys.

## Deploying to Firebase Hosting

One-time setup:

1. Create a Firebase project and enable Hosting.
2. From the repo root run `firebase init hosting:github` (choose the existing `dist` public directory and SPA rewrite), or create a service account manually. This creates the `FIREBASE_SERVICE_ACCOUNT_<PROJECT>` GitHub secret used by `.github/workflows/deploy.yml`.
3. In the GitHub repo settings add:
   - Secret `VITE_EIA_API_KEY` (optional)

Pushes to `main` deploy to the live channel; pull requests get a preview URL. Manual deploy: `npm run build && firebase deploy --only hosting`.

To serve from a subdomain, add a custom domain in the Firebase Hosting console and create the DNS records it lists.

## Disclaimer

Results are estimates for planning only, not financial advice. They assume full offset of purchased electricity at your retail rate and do not model net-metering rules, taxes or inflation.
