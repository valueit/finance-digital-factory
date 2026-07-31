# Playwright

## Configuration

Fichier : `playwright.config.ts`

- `baseURL` depuis `APP_BASE_URL`
- captures d'écran en cas d'échec
- traces au retry
- reporters HTML + JUnit
- projet Chromium
- retries activés en CI

## Tests

### UI

`tests/ui/create-and-submit-financing-request.spec.ts`

Scénario : login agent → création → soumission → statut `SUBMITTED`.

### API

`tests/api/reject-request-without-amount.spec.ts`

Scénario : login API → POST sans montant → `AMOUNT_REQUIRED`.

## Commandes

```bash
npm run test
npm run test:ui
npm run test:api
npm run test:report
```

## Attributs data-testid

Les sélecteurs stables sont documentés dans le prompt d'origine et implémentés dans le frontend (`login-*`, `agent-dashboard`, `applicant-*`, `submit-request`, etc.).

## Échec contrôlé

```bash
DEMO_OUTCOME=failure npm run test:ui
```

Utile pour démontrer un Test Execution Xray en échec.
