# 🔌 LocaLedger RESTful API v1

LocaLedger provides a standardized API for integrating with 3rd party tools while maintaining 100% data privacy. By default, the API is accessible on `http://localhost:3000`.

## 🔐 Authentication
All requests (except authentication) require a standard `authenticate` check. In this local environment, authentication is managed via session/localStorage, but can be integrated with API keys in future versions.

Required Headers:
- `x-user-id`: The unique ID of the user profile.
- `x-identity-id`: (Optional for some) The ID of the taxable entity (Personal, Sole Trader, etc).

## 📊 Endpoints

### Identities
- `GET /api/identities`: List all taxable identities for a user.
- `POST /api/identities`: Create a new identity (Personal/Business).

### Transactions
- `GET /api/transactions`: Fetch transactions for the active identity.
- `POST /api/transactions`: (Via Import) Submit batch transactions.
- `PATCH /api/transactions/:id`: Update a specific transaction (Category, Status).
- `POST /api/transactions/bulk-verify`: Verify all pending review items.

### AI Accountant
- `POST /api/ai/chat`: Send a prompt to the local Ollama LLM with financial context.
- `GET /api/rules`: Fetch learning rules for the active identity.
- `POST /api/rules`: Create or update a categorization rule.

### System & Plugins
- `GET /api/plugins/mappers`: Fetch available bank statement mappers from `data/plugins/mappers`.
- `GET /api/system/logs`: Fetch the last 200 system events (Audit Trail).

## 🧩 Plugin SDK (Mappers)
You can extend LocaLedger's import capabilities by adding a JSON file to `data/plugins/mappers/`.

**Structure:**
```json
{
  "name": "Bank Name",
  "version": "1.0.0",
  "mapping": {
    "date": "CSV_Header_For_Date",
    "description": "CSV_Header_For_Desc",
    "amount": "CSV_Header_For_Amount"
  },
  "description": "Short description of the bank format."
}
```

LocaLedger will automatically pick up these files and provide them as single-click presets in the **Import Bank** view.

---
*LL API: Building an open, local-first ecosystem.*
