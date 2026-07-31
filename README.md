# Finance Digital Factory

Application full-stack de démonstration pour tests Playwright (UI + API), GitHub Actions et publication Xray Cloud.

## Prérequis

- Node.js 20+
- npm 10+

## Démarrage rapide

```bash
npm install
npm run db:init
npm run dev
npm run test
```

- Frontend : http://localhost:5173
- Backend API : http://localhost:3000

## Architecture

Monorepo npm workspaces :

- `frontend/` — React + TypeScript + Vite
- `backend/` — Express + SQLite + JWT
- `tests/` — Playwright UI & API
- `scripts/xray/` — publication des résultats vers Xray Cloud
- `.github/workflows/` — pipeline de démonstration

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Comptes de démonstration

| Username | Password | Role |
| --- | --- | --- |
| agent | agent123 | AGENT |
| analyst | analyst123 | ANALYST |
| manager | manager123 | MANAGER |

## Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre backend + frontend |
| `npm run build` | Build production |
| `npm run start` | Démarre les builds de production |
| `npm run db:init` | Initialise SQLite et les comptes démo |
| `npm run demo:reset` | Réinitialise les données de démonstration |
| `npm run test` | Exécute les tests Playwright |
| `npm run test:ui` | Tests UI uniquement |
| `npm run test:api` | Tests API uniquement |
| `npm run test:report` | Ouvre le rapport HTML |
| `npm run xray:import` | Importe les résultats JUnit dans Xray |

## Variables d'environnement

Copier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Variables principales :

- `APP_BASE_URL`, `API_BASE_URL`
- `DEMO_RESET_TOKEN`
- `JWT_SECRET`
- `XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`, `JIRA_PROJECT_KEY`
- `DRY_RUN=true` pour valider l'intégration Xray sans écriture

## Tests

Deux scénarios Playwright :

1. UI — création et soumission d'une demande (`tests/ui/...`)
2. API — rejet d'une demande sans montant (`tests/api/...`)

Détails : [docs/PLAYWRIGHT.md](docs/PLAYWRIGHT.md).

## Pipeline GitHub Actions

Workflow manuel : `.github/workflows/playwright-xray-demo.yml`

Paramètre `outcome` :

- `success` — exécution normale
- `failure` — échec contrôlé pour la démo Xray

Détails : [docs/GITHUB-ACTIONS.md](docs/GITHUB-ACTIONS.md).

## Intégration Xray

Mode dry-run par défaut :

```bash
DRY_RUN=true npm run xray:import
```

Détails : [docs/XRAY.md](docs/XRAY.md) et [scripts/xray/README.md](scripts/xray/README.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](docs/API.md)
- [Playwright](docs/PLAYWRIGHT.md)
- [Xray](docs/XRAY.md)
- [GitHub Actions](docs/GITHUB-ACTIONS.md)
