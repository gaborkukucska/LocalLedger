# LocaLedger API Documentation

LocaLedger provides a standard REST API for integration with other financial systems.

## Endpoints

### 1. Transactions
- `GET /api/transactions`: Retrieve all transactions.
- `POST /api/transactions`: Add a new transaction.
- `PATCH /api/transactions/:id`: Update a transaction (categorization, status).

### 2. AI & Rules
- `GET /api/rules`: Retrieve all learning rules.
- `POST /api/rules`: Create a new rule for automatic categorization.
- `POST /api/ollama`: Proxy for local Ollama LLM interactions.

### 3. Import
- `POST /api/import`: Import a CSV with mapping details.

## Security
All API calls are local to the host. External access should be restricted via reverse proxy or firewall.
Sensitive fields can be encrypted using the `security.ts` utility.
