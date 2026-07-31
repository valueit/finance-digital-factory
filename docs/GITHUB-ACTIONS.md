# GitHub Actions

## Workflow

Fichier : `.github/workflows/playwright-xray-demo.yml`

Déclenchement : `workflow_dispatch`

### Input `outcome`

| Valeur | Effet |
| --- | --- |
| `success` | Exécute les tests normalement |
| `failure` | Force un échec contrôlé sur le test UI |

## Étapes

1. Checkout
2. Setup Node.js 20
3. `npm ci`
4. Install Playwright Chromium
5. `npm run db:init`
6. Démarrage backend + frontend
7. Attente `/api/health`
8. Reset démo
9. Exécution des tests
10. Upload artefacts HTML + JUnit
11. Publication Xray (`if: always()`)
12. Échec du job si les tests ont échoué

## Secrets recommandés

```text
DEMO_RESET_TOKEN
JWT_SECRET
XRAY_CLIENT_ID
XRAY_CLIENT_SECRET
JIRA_PROJECT_KEY
XRAY_TEST_EXECUTION_KEY
XRAY_TEST_KEY_UI
XRAY_TEST_KEY_API
XRAY_DRY_RUN
```

Ne jamais coder les secrets dans le workflow.
