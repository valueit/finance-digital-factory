# Architecture

## Vue d'ensemble

```text
Browser (React/Vite :5173)
        │
        ▼
Express API (:3000)
        │
        ▼
SQLite (data/finance.db)
```

## Packages

| Package | Rôle |
| --- | --- |
| `frontend` | UI authentifiée par rôle (Agent, Analyste, Manager) |
| `backend` | API REST, JWT, règles métier, SQLite |
| `tests` | Playwright UI + API |
| `scripts/xray` | Auth Xray + import JUnit |

## Flux métier

1. Agent crée une demande `DRAFT`
2. Agent soumet → `SUBMITTED`
3. Analyste démarre l'analyse → `UNDER_REVIEW`
4. Analyste décide → `APPROVED` ou `REJECTED`
5. Manager consulte les KPI globaux

## Sécurité

- Mots de passe hashés avec bcrypt
- JWT signé avec expiration (8h)
- Reset démo protégé par `DEMO_RESET_TOKEN`
- Aucune dépendance cloud obligatoire au runtime

## Stockage

Base SQLite fichier local `data/finance.db`, réinitialisable via :

```bash
npm run demo:reset
# ou
POST /api/demo/reset
```
