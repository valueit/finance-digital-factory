# Xray Cloud

## Objectif

Publier les résultats JUnit Playwright vers Xray Cloud.

## Mode dry-run

```bash
DRY_RUN=true npm run xray:import
```

Affiche :

- paramètres détectés
- clés Xray configurées
- fichier JUnit
- Test Execution cible
- actions qui seraient exécutées

Aucune écriture Jira/Xray.

## Mode live

Configurer :

```text
XRAY_CLIENT_ID
XRAY_CLIENT_SECRET
JIRA_PROJECT_KEY
XRAY_TEST_EXECUTION_KEY   # optionnel
DRY_RUN=false
```

Puis :

```bash
npm run test
npm run xray:import
```

## Mapping des tests

```text
tests/ui/create-and-submit-financing-request.spec.ts → FDF-TEST-UI
tests/api/reject-request-without-amount.spec.ts      → FDF-TEST-API
```

Remplacer via `XRAY_TEST_KEY_UI` / `XRAY_TEST_KEY_API`.

## Scripts

Voir [scripts/xray/README.md](../scripts/xray/README.md).
