# LocaLedger Plugin & Import System

Because banks export CSV data using frustratingly varied formatting (different headers, different date styles), LocaLedger avoids hard-coding mappings. Instead, we use an open **Dynamic Plugin System**.

## 1. Mapper Plugins

A Mapper Plugin is a lightweight JSON schema that tells the LocaLedger engine how to parse an incoming CSV header. 

You can define mapper plugins manually by creating a `.json` file inside `data/plugins/mappers/` or use the dynamic UI on the **Bank Import** page inside the Application to generate and save one.

### JSON Structure

```json
{
  "name": "ANZ Checking",
  "mapping": {
    "date": "Processing Date",
    "description": "Details",
    "amount": "Credit/Debit Amount"
  }
}
```

LocaLedger automatically consumes this file. When the user sets "Bank Profile: ANZ Checking", the underlying engine pulls exactly those columns out safely.

## 2. RAG Knowledge Expansion

You don't need a plugin to make the AI Accountant smarter. You can simply drag and drop `.md` (Markdown) or `.txt` (Text) files describing your business logic straight to the **Knowledge Base** directory (`data/knowledge/`).

The backend implements `fuse.js`. By simply dropping a text file (e.g., `freelance_rates.md`) in the folder, your AI accountant will read, parse, and instantly integrate those rules in discussions regarding categorization and accounting!
