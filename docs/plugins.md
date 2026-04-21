# Plugin System Documentation

LocaLedger is designed to be highly modular.

## Creating a Plugin
Plugins can be added by extending the `src/lib/` logic or adding new API routes in `server.ts`.

### Core Extension Points
1. **Import Mappers**: Custom logic for specific bank CSV formats.
2. **AI Models**: Support for different local LLMs via the Ollama API.
3. **Report Generators**: Beyond BAS, you can add custom P&L or specialized tax reports.

## Connection to Banks
Currently, manual CSV import is the primary method to ensure "on-premise" security. Auto-sync via third-party APIs (like Plaid or Salt Edge) is possible but would require an internet connection, violating the core local-first principle unless using a local connector.
