# 🗺️ LocaLedger Project Plan

## 🎯 Vision
To create the ultimate private, local-first, AI-powered accounting suite for Australian families and small businesses. "Xero but better" and runs entirely on your own hardware. 

*Recent Audit Note: The initial foundation was built, but architectural flaws prevent scalability and robust performance. We are pivoting to true, production-grade local solutions.*

---

## 🛠️ Phases & Progress

### ✅ Phase 1: Core Foundation (Completed)
- [x] Full-stack Express + React architecture.
- [x] Responsive technical dashboard with Recharts.

### ✅ Phase 2: Database & Storage Refactor (Completed)
*Migrated from naive JSON to robust production-grade local solutions.*
- [x] **Migrate to SQLite**: Move from `db.json` to a robust local SQLite implementation using `better-sqlite3`.
- [x] **Proper At-Rest Encryption**: Encrypt sensitive fields (amounts, names) at the column level via AES-256.
- [x] **User-Scoped Isolation**: Ensure data context is strictly segregated at the database layer. 

### ✅ Phase 3: High-Fidelity RAG & AI (Completed)
- [x] **Vector Store / BM25 Search**: Implemented retrieval system using `fuse.js` for local keyword / fuzzy embeddings.
- [x] **Rebuild Core Knowledge Base**: Standardized the ATO GST rules in `data/knowledge` and restored `ato_gst_basics`.
- [x] **Hybrid LLM Handling**: Context window management and structural fallback between Gemini/Ollama.

### ⚠️ Phase 4: Bank Import Engine (Incomplete - Demoted)
*The plugin JSON files (`cba.json`, `westpac.json`) were deleted. The system needs a better way to map standard Australian banks.*
- [x] **Standardized Mappers**: Hardcode robust, native TS mappers for the Big 4 Aussie Banks (CBA, Westpac, NAB, ANZ) to prevent accidental deletion.
- [x] **Dynamic Plugin Upload UI**: Allow users to configure matching rules dynamically via the UI instead of relying on manually placing `.json` files in directories.

### ✅ Phase 5: Multi-Identity & Advanced Reporting (Completed)
- [x] **Multi-Taxable Identities**: Support for Personal, Sole Trader, and Company entities.
- [x] **Advanced BAS logic**: Handling different GST accounting methods (Cash vs Accrual).
- [x] **Inventory Tracking**: Stock management for Sole Traders/Products.

### 🚀 Phase 6: Features & Multi-Currency (Completed)
- [x] **Real Exchange Rates API**: Replace mocked API with a lightweight caching layer for real or daily-updated rates.
- [x] **Reconciliation Workflow**: A better UI workflow for matching transactions to expected statements.
- [x] **Multi-Currency UI Fixes**: Enhance `Transactions.tsx` and `Dashboard.tsx` to beautifully display conversions.

### ✅ Phase 7: Polish, Distribution & Mobile (Completed)
- [x] **Data Export**: Full JSON backup for external analysis.
- [x] **Mobile App PWA**: Polished manifest and metadata for "Add to Home Screen" support.
- [x] **Docker Compose**: Orchestrated easy Ollama + LocaLedger stack deployment.
- [x] **Tutorial Overlay**: Guided tour built-in through the intelligent empty states.

---

## 🏗️ Architecture Design (Target State)
- **Frontend**: React 19 + Tailwind CSS 4 + Lucide + Framer Motion.
- **Backend**: Express + SQLite (instead of naive JSON) + TSX.
- **AI**: Gemini Standard API (default) with local Ollama fallback.
- **Security**: SQLCipher / granular AES encryption.
- **Reporting**: Australian Tax Office (ATO) aligned logic for BAS.

## 📅 Roadmap 2026
- **Q2**: Database Refactor and AI Grounding improvements.
- **Q3**: Comprehensive Plugin UI and Ecosystem.
- **Q4**: Final distribution and Docker workflows.

