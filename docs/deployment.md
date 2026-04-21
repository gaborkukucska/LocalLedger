# LocaLedger Deployment & Security Guide

LocaLedger intentionally avoids SaaS infrastructure. We emphasize **Local-First**, ensuring standard business privacy rules govern your financial statements, avoiding tracking pixels, SaaS leaks, or cloud subscriptions.

---

## The Stack

- **Node.js + Express**: Handles the main backend mechanics and `better-sqlite3` operations securely behind standard firewalls.
- **Vite + React (Tailwind / Recharts)**: Generates the highly responsive frontend layer.
- **SQLite Database**: LocaLedger utilizes `better-sqlite3` running in WAL mode to write high-frequency inputs efficiently without typical IO-lock.
- **AI Backend**: Connects to `Ollama` seamlessly via REST, or uses `@google/genai` purely on your API key permission.

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
      - DB_ENCRYPTION_KEY=your_key_here_must_be_32_bytes_
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
The `DB_ENCRYPTION_KEY` variable must be an exact **32-byte string**.
When configured, it invokes the standard Node.js `crypto` module:

```typescript
// Sample encryption standard used internally
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
```

### Important Warning ⚠️
If you lose your `DB_ENCRYPTION_KEY` or try to re-deploy without it, the encrypted rows inside `data/localedger.db` will remain unreadable. Ensure your `.env` flags are properly backed up alongside your data files.

---

## Upgrades & Backups

LocaLedger stores its entire state in the `/data` and `/logs` directories.
To ensure you never lose your history:

1. Backup the `data/localedger.db` file regularly.
2. (Optional) Run the UI-based "Export Data" command embedded locally to download the full readable JSON representation of your profile.
