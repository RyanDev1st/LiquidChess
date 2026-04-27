# LiquidChess — Implementation Reference

**LiquidChess** is a high-frequency, low-latency chess analysis system with an aristocratic vampire persona ("Count Lucian"). It bridges live Chess.com data to Discord and a React web UI.

---

## Trinity Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      LIQUIDCHESS                               │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  src/app/backend/src/discord/   src/app/frontend/src/          │
│  ─────────────────────────────  ───────────────────────────    │
│  "The Hand"                     "The Face"                     │
│   cogs/ + services/              React + Vite                  │
│        │                              │                        │
│        └──────── BridgeService ───────┘                        │
│                        │                                       │
│                src/app/backend/src/core/                       │
│                "The Brain"                                     │
│                 watcher/ → brain/ → soul/                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Core (backend/src/{brain,watcher,soul})

| Module | Class | Responsibility |
|--------|-------|----------------|
| `watcher/poller.py` | `GamePoller` | Poll Chess.com every 1 s |
| `watcher/tcn_decoder.py` | `decode_tcn()` | Decode TCN notation to moves |
| `brain/engine.py` | `StockfishService` | Stockfish analysis (0.1 s budget) |
| `brain/heuristics.py` | — | Mobility, tension positional evals |
| `soul/generator.py` | `PersonaGenerator` | Groq LLM commentary |
| `soul/renderer.py` | — | Board image rendering |
| `soul/vision.py` | `BoardEye` | Vision-model board analysis |

### Discord (backend/src/discord)

| Module | Class | Responsibility |
|--------|-------|----------------|
| `bot.py` | `LiquidChessBot` | Bot lifecycle |
| `cogs/arena.py` | `ArenaCog` | `!live`, `!switchlive`, `!listlive` |
| `cogs/guild.py` | `GuildCog` | `!info`, `!push`, `!pop`, `!settings` |
| `cogs/jester.py` | `JesterCog` | `!meme`, `!roast` |
| `cogs/utility.py` | `UtilityCog` | `!save`, `!codex` |
| `services/bridge_service.py` | `BridgeService` | Core ↔ Discord bridge |
| `services/guild_service.py` | `GuildService` | Guild data persistence |
| `services/drive_service.py` | `DriveService` | Google Drive meme storage |

### Web (frontend/src)

| Technology | Purpose |
|------------|---------|
| React 18 + Vite | UI framework & build |
| TypeScript | Type safety |
| Framer Motion | Cinematic animations |
| TailwindCSS | Utility styling |
| React Router | SPA routing |

---

## Data Flow

### Live Game

```
Chess.com API
     │ poll 1 s
     ▼
GamePoller → GameState
     │
     ▼
StockfishService → Evaluation
     │
     ▼
PersonaGenerator → Commentary
     │
     ├──► BridgeService ──► Discord embed
     └──► WebSocket     ──► Web dashboard
```

### Guild Dashboard

```
Discord command
     │
     ▼
GuildCog (permission check)
     │
     ▼
GuildService (singleton, in-memory)
     │
     ▼
data/guild/{dashboard,settings}.json
```

---

## Key Patterns

### Singleton

```python
class GuildService:
    _instance: Optional[GuildService] = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
```

### Cog + Service layering

```
Cog (command handler)
  └── Service (business logic)
        └── Core module (domain logic)
```

### Async rules

1. No blocking calls in the core loop.
2. HTTP via `aiohttp`.
3. Stockfish in `ProcessPoolExecutor`.
4. Background jobs via `asyncio.create_task()`.

---

## Configuration

**`app/backend/config/settings.yaml`**

```yaml
discord:
  prefix: "!"
chess:
  poll_interval: 1.0
  analysis_depth: 20
  analysis_time: 0.1
persona:
  model: "llama-3.1-70b-versatile"
  temperature: 0.9
web:
  host: "0.0.0.0"
  port: 8000
```

**`app/backend/config/secrets.env`** ← never commit

```env
DISCORD_BOT_TOKEN=...
GROQ_API_KEY=...
GOOGLE_DRIVE_CREDENTIALS_PATH=...
```

---

## Running

From `src/`:

```bash
npm run bot          # Discord bot only
npm run dev          # Web frontend (Vite dev server)
npm run observe      # Full system (bot + watcher)
npm run test         # pytest suite
```

From `src/app/frontend/`:

```bash
npm install && npm run dev
```

---

## Deployment

| Layer | Target |
|-------|--------|
| Frontend | Vercel (auto-deploy from `main`) |
| Backend / Bot | Railway or Fly.io |
| Data | JSON files → PostgreSQL (future) |

---

## Error Strategy ("Glass Jaw Defense")

Chess.com API is undocumented. All poll calls return `_last_known_state` on failure and back off exponentially.

---

## Testing

```bash
# From src/
npm run test

# Specific suites
pytest app/backend/tests/test_engine.py -v
pytest app/backend/tests/test_heuristics.py -v
pytest app/backend/tests/test_integration.py -v
```

---

## Roadmap

| Phase | Goal |
|-------|------|
| 1 ✅ | Discord bot + static web UI |
| 2 | Real-time WebSocket game streaming |
| 3 | Multi-game parallel analysis |
| 4 | User accounts & saved preferences |
| 5 | Voice commentary via TTS |
