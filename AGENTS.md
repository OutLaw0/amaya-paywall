# Amaya paywall

- Nuxt 4, Vue 3, TypeScript, npm (`package-lock.json`), plain CSS. Node 24.15+.
- `app/app.vue`: screen; `app/components/OfferCard.vue`: accessible native radio card; `app/composables/usePaywall.ts`: client state and requests.
- `app/assets/css/main.css`: mobile-first styles and Figma tokens. Local Inter fonts; SVGs in `public/images` exported from Figma.
- `shared/types`: API contracts. `server/api`: Nitro routes. `server/utils`: offers, purchase validation, calendar expiry and Supabase repository.
- `supabase/migrations`: SQL. RLS enabled; no anonymous access. All database access stays on the server.
- Commands: `npm ci`, `npm run dev`, `npm run check`, `npm run test:e2e`, `npm run visual:compare`. Install test browsers with `npx playwright install chromium webkit`. Build before E2E.
- Canonical reference: `design/figma-ready.png`, 390×844 at DPR 1. `design/state.json` records actual Figma IDs. Pixelmatch threshold 0.1, mismatch ≤1%; mobile grayscale text rendering.
- Keep secrets in ignored `.env` and host environment. Never log them, include them in README, or expose them in public runtime config.
- Read relevant files before editing; user works in VS Code concurrently. Preserve their changes. No unrelated refactors or extra dependencies.
- Before each state-changing Git action or GitHub auth check, describe exact commands, repository and purpose, then obtain explicit user confirmation. No automatic Git init, branches or worktrees.
