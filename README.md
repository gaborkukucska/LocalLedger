# 🇦🇺 LocaLedger

**The Private, AI-Powered Offline Accountant for Australian Small Businesses** 🚀

LocaLedger is an open-source, local-first bookkeeping tool designed explicitly for freelancers, sole traders, and family households. By leveraging powerful local AI models (via Ollama) alongside local SQLite column-level encryption, LocaLedger guarantees that your sensitive financial data **never leaves your machine** natively!

## ✨ Features

- **🛡️ 100% Local-First & Encrypted**: Your data is stored securely in a local `SQLite` database with AES-256 column-level encryption. A master key is generated and stored locally on first install. No cloud, no subscription fees, no data harvesting.
- **🤖 Private AI Accountant**: Powered by [Ollama](https://ollama.com), the built-in conversational AI analyzes transactions, suggests categorization rules, and acts as your personal financial advisor using strict local RAG (Retrieval-Augmented Generation) running on `fuse.js`.
- **🗂️ Multi-Identity Architecture**: Manage multiple Tax Identities (Personal, Sole Trader, Company), each securely segregated so your household and business finances never mix.
- **🏦 CSV Bank Imports**: Import arbitrary bank statements. The AI evaluates mapping and auto-applies customized Learning Rules to categorize hundreds of rows instantly.
- **⚡ Bulk Reconciliation & BAS**: Reconcile items efficiently with built-in ATO (Australian Tax Office) logic determining your GST calculations automatically.
- **🌍 Dynamic Currency Conversion**: Handles multi-currency setups seamlessly via intelligent built-in exchange rate buffering with failovers.
- **🐳 One-Click Docker Deploy**: Batteries included. Run both the app and the intelligent LLMs inside Docker.

---

## 🛠️ Quick Start & Installation

### Option A: The Full Stack (Docker Compose)
This is the recommended method to run LocaLedger alongside its private, offline AI instance.

1. Ensure [Docker & Docker Compose](https://docs.docker.com/get-docker/) are installed.
2. Clone this repository.
3. Bring everything up:
   ```bash
   docker-compose up -d
   ```
4. Access the web interface at [http://localhost:3000](http://localhost:3000).

*Note: The `docker-compose.yml` launches both LocaLedger and `ollama` concurrently, linking them intelligently out of the box!*

### Option B: Native Node Setup
If you want to run LocaLedger natively without Docker:

1. **Prerequisites:** Node.js (v18+) and [Ollama](https://ollama.com/) (running on port `11434`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Establish your `.env` file (if deploying natively):
   ```env
   # OLLAMA URL: Set your local endpoint natively
   OLLAMA_URL=http://localhost:11434
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   Or build and run for production:
   ```bash
   npm run build
   npm start
   ```

---

## 📖 Deep Dives

Want to contribute, audit security, or learn about the architecture? Check out the full documentation suite:
- [API Reference 🧾](./docs/api.md)
- [Deployment & Security Guide 🚀](./docs/deployment.md)
- [Plugin System & Mapping 🧩](./docs/plugins.md)

---

## 🇦🇺 Built for Compliance
LocaLedger structures the Dashboard to closely track BAS requirements—including smart tax code assignments (`GST`, `FREE`, `ITS`, `EXM`). While LocaLedger aims to be highly accurate, **it does not replace certified tax advice**. Always verify outputs before submitting filings.

Made with ❤️ down under. 🦘
