# Deployment Guide 🚀

LocaLedger is designed for total local reliability.

## 🐳 Docker (Recommended)
The easiest way to deploy is via Docker Compose.
```bash
docker-compose up -d
```
All data is persisted in the `./data` volume.

## 🛠️ Bare Metal (Node.js)
1. Install Node.js 20+
2. Clone repository
3. `npm install`
4. `npm run build`
5. `npm start`

## 🐧 Multi-platform
LocaLedger runs anywhere Node.js or Docker runs:
- **Windows**: Use WSL2 or Docker Desktop.
- **macOS**: Native Node.js or Docker.
- **Linux/Raspberry Pi**: Perfect for low-power home servers.

## 🤖 AI Setup
LocaLedger looks for an Ollama instance at `http://localhost:11434`. 
If you are running in Docker, the `docker-compose.yml` uses `host.docker.internal` to talk to your host's Ollama instance.
