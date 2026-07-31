# API

Base URL locale : `http://localhost:3000`

## Health

```http
GET /api/health
```

```json
{ "status": "UP", "service": "finance-digital-factory" }
```

## Auth

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "agent", "password": "agent123" }
```

Réponse :

```json
{
  "accessToken": "...",
  "user": { "username": "agent", "role": "AGENT" }
}
```

## Financing requests

Toutes les routes suivantes nécessitent `Authorization: Bearer <token>`.

| Méthode | Endpoint | Rôle |
| --- | --- | --- |
| POST | `/api/financing-requests` | AGENT |
| GET | `/api/financing-requests` | selon rôle |
| GET | `/api/financing-requests/:id` | selon rôle |
| PATCH | `/api/financing-requests/:id` | AGENT propriétaire, DRAFT |
| POST | `/api/financing-requests/:id/submit` | AGENT propriétaire |
| POST | `/api/financing-requests/:id/start-review` | ANALYST |
| POST | `/api/financing-requests/:id/decision` | ANALYST |
| GET | `/api/financing-requests/stats/agent` | AGENT |
| GET | `/api/financing-requests/stats/manager` | MANAGER |

### Création

```json
{
  "applicantName": "Demo Applicant",
  "applicantIdentifier": "DEMO-CIN-001",
  "amount": 100000,
  "durationMonths": 36,
  "purpose": "Vehicle financing",
  "monthlyIncome": 15000
}
```

### Décision

```json
{
  "decision": "APPROVED",
  "reason": "Request meets eligibility criteria"
}
```

## Demo reset

```http
POST /api/demo/reset
x-demo-reset-token: demo-reset-token
```

## Erreurs métier

| Code | HTTP | Cas |
| --- | --- | --- |
| `AMOUNT_REQUIRED` | 400 | Montant absent |
| `INVALID_AMOUNT` | 400 | Hors plage 10 000–500 000 MAD |
| `INVALID_DURATION` | 400 | Durée hors 12/24/36/48/60 |
| `INVALID_TRANSITION` | 400 | Transition de statut interdite |
| `UNAUTHORIZED` | 401 | Token manquant/invalide |
| `FORBIDDEN` | 403 | Rôle insuffisant |
