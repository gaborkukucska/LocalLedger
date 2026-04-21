# LocaLedger API Reference

LocaLedger provides a standard REST API that interacts with the underlying `better-sqlite3` database. Due to its architecture, the application serves requests asynchronously but ensures all data is persistently hashed via column-level AES-256 encryption.

---

## Global Headers

For all authenticated endpoints, the following custom headers are heavily enforced:

| Header Name       | Purpose                                                    | Enforcement            |
|-------------------|------------------------------------------------------------|------------------------|
| `x-user-id`       | Determines the base user querying the endpoint.            | **Required**           |
| `x-identity-id`   | Scopes queries to the specific sub-identity (Tax Profile). | **Required** on data*  |

*\*Endpoints spanning cross-identities like `/api/identities` only strictly demand `x-user-id`.*

---

## Endpoints

### 1. Unified Authentication
- `POST /api/auth/register` : Creates a user and wires up a base Personal Identity immediately. Needs `username` and `password`.
- `POST /api/auth/login` : Returns an authenticated user payload if logic validates.
- `GET /api/users` : Developer endpoint to list user stubs.

### 2. Identity Management
- `GET /api/identities` : Fetch all Tax Identities mapped against the current user ID.
- `POST /api/identities` : Open a new business profile context (e.g., Sole Trader or Company). Takes `name`, `type`, `abn`, and `accountingMethod`.

### 3. Ledger & Transactions
- `GET /api/transactions` : Retrieves all transactions filtered to the scope of an `x-identity-id`. Decrypts column-level secured items seamlessly for the frontend.
- `POST /api/transactions` : Ingest a solitary ledger row.
- `PATCH /api/transactions/:id` : Used for editing `status` (pending → reconciled) or overriding the `category`. Triggers an internal Database audit log trace.

### 4. Advanced AI & Conversational Search (RAG)
- `POST /api/ai/chat` : Primary conversational backbone. Triggers `Ollama` natively evaluated with historical `ledger` and `Rules` context.
- `GET /api/knowledge` : Fetch system-indexed RAG embeddings and knowledge base `.md` context items.
- `POST /api/knowledge/upload` : Drag and drop external `.txt`/`.md` files straight to your AI context cache.
- `POST /api/ollama` : Standard text generation bridge used safely decoupled from public APIs.

### 5. Learning Rules & Import Systems
- `GET /api/rules` : Retrieve learned pattern-recognition logic strings.
- `POST /api/rules` : Push a confirmed `Pattern -> Category` rule block back to the `SQLite` engine.
- `POST /api/import` : Core ingestion engine. Receives CSV contents and executes an iteration logic that simultaneously applies currency conversions and your defined NLP `Rules` to pre-categorize inputs.

---

## Environment & Security Flags
At launch time, an automated `data/master.key` crypto hash payload is dynamically stored offline inside the app ecosystem protecting SQLite binaries safely behind uncrackable CBC sequences natively without environment variable requirements.
