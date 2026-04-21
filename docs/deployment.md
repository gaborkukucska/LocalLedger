# LocaLedger Deployment & Security Guide

LocaLedger intentionally avoids SaaS infrastructure. We emphasize **Local-First**, ensuring standard business privacy rules govern your financial statements, avoiding tracking pixels, SaaS leaks, or cloud subscriptions.

---

## The Stack

- **Node.js + Express**: Handles the main backend mechanics and `better-sqlite3` operations securely behind standard firewalls.
- **Vite + React (Tailwind / Recharts)**: Generates the highly responsive frontend layer.
- **SQLite Database**: LocaLedger utilizes `better-sqlite3` running in WAL mode to write high-frequency inputs efficiently without typical IO-lock.
- **AI Backend**: Connects to `Ollama` seamlessly via REST APIs locally.

---

## 🐋 Deploying with Docker
We officially recommend Docker and Docker Compose as the standard execution path.

```yaml
# docker-compose.yml extract
services:
  localedger:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - OLLAMA_URL=http://ollama:11434
    depends_on:
      - ollama

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
```

1. Deploy using `docker-compose up -d`.
2. Access the network on port `3000`.
3. Stop using `docker-compose down`.

---

## 🛡️ Database Encryption Model

Your dataset stores exact financial amounts, vendor descriptions, and personal accounting rules. 

LocaLedger operates using **Column-Level Encryption**. We encrypt fields at runtime *before* they pass to SQLite.
On initial install, the framework auto-generates a secure payload token saved to `data/master.key`. The backend automatically hashes this token via SHA-256 to securely generate the exact 32-byte requirement for standard block cipher manipulation.

When configured, it invokes the standard Node.js `crypto` module securely derived from your passkey:

```typescript
// Safely ensure the key is always 32 bytes by hashing the input using SHA-256
ENCRYPTION_KEY = crypto.createHash('sha256').update(rawKey).digest();
```

### Important Warning ⚠️
If you lose or corrupt `data/master.key` and try to re-deploy with a completely different sequence, the encrypted rows inside `data/localedger.db` will remain mathematically unreadable. Ensure you back up this file alongside your database backups.

---

## Upgrades & Backups

LocaLedger stores its entire state in the `/data` and `/logs` directories.
To ensure you never lose your history:

1. Backup the `data/localedger.db` AND your `data/master.key` files securely.
2. (Optional) Run the UI-based "Export Data" command embedded locally to download the full readable JSON representation of your profile.
