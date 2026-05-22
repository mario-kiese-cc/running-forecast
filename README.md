# Running Forecast 🏃‍♂️

Predict race performance based on training data, historical results, and physiological models.

## Status

🚧 **Early development** — project scaffolding and harness setup phase.

## Features (Planned)

- Race time prediction using established models (Riegel, Cameron, VO2max)
- Training load analysis and readiness scoring
- Historical performance tracking
- Taper optimization suggestions

## Getting Started

## Getting Started

```bash
pnpm install
pnpm dev       # Start dev server at http://localhost:5173
pnpm test      # Run tests
pnpm build     # Production build
```

Requires Node.js v26+ and pnpm.

## Deployment

The site is auto-deployed to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

**Live URL:** https://mario-kiese-cc.github.io/running-forecast/

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Tech Stack

- **Vue 3** (Composition API, `<script setup>`)
- **Vite** — build tool
- **TypeScript** — strict mode
- **Vitest** — test runner
- **Open-Meteo** — free weather API (no key required)

## Project Structure

See [AGENTS.md](AGENTS.md) for detailed project conventions and architecture.

## License

TBD
