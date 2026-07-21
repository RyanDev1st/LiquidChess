# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run full system (Web + Discord bot)
npm run dev

# Run Discord bot only
npm run bot

# Run web UI only
npm run web

# Build web for production
npm run build:web

# Register Discord slash commands
npm run register:commands

# Run all tests
pytest

# Run a single test file
pytest tests/test_heuristics.py -v

# Run tests with coverage
pytest --cov=src.brain --cov-report=html

# Run performance benchmarks
python -m tests.benchmarks

# Firebase local emulation
npm run firebase:emulate
```

## Architecture: Trinity Pattern

The system is built around three strictly separated tiers:

1. **`src/core/`** — Platform-agnostic orchestration (`LiquidChessController`). Owns the game "Truth". No Discord or web imports allowed here.
2. **`src/discord/`** — "The Hand". Discord bot with 8 cogs + 3 services. Reads from Core, never writes game state directly.
3. **`src/web/`** — "The Face". React/TypeScript frontend with WebSocket for real-time updates.

**Data flow pipeline:**
```
Chess.com API → GamePoller → StockfishEngine → Heuristics → PersonaSpeaker → BridgeService → Discord / Web
```

## Key Components

| Component | File | Role |
|-----------|------|------|
| `LiquidChessController` | `src/core/event_loop.py` | Main async orchestrator |
| `GamePoller` | `src/watcher/poller.py` | Adaptive Chess.com polling (0.5–2s intervals) |
| `TCNDecoder` | `src/watcher/tcn_decoder.py` | Chess.com move notation → python-chess |
| `StockfishEngine` | `src/brain/engine.py` | Async Stockfish wrapper, **strict 100ms limit** |
| `Heuristics` | `src/brain/heuristics.py` | Mobility, tension, dominance metrics (<10ms each) |
| `PersonaSpeaker` | `src/soul/generator.py` | Groq/Llama-3.3-70B commentary as "Count Lucian" |
| `BridgeService` | `src/discord/services/bridge_service.py` | Core ↔ Discord bridge |
| `GuildService` | `src/discord/services/guild_service.py` | Guild data persistence (Singleton) |
| `LiquidChessBot` | `src/discord/main.py` | Bot lifecycle + cog loader |

## Discord Cogs (src/discord/cogs/)

- `arena.py` — Live game commands
- `guild.py` — Dashboard commands
- `match.py` — Match management
- `progression.py` — Player progression
- `fate.py` — Fate system
- `gatekeeper.py` — Access control
- `jester.py` — Entertainment
- `utility.py` — Utilities

## Configuration

- `config/settings.yaml` — API URLs, poll intervals, Stockfish time limit (100ms), Groq model settings
- `config/secrets.env` — `DISCORD_BOT_TOKEN`, `GROQ_API_KEY`, `GOOGLE_DRIVE_CREDENTIALS_PATH`, `STOCKFISH_PATH`

## Engineering Mandates

- **No blocking calls in async loops.** Use `aiohttp`, `asyncio`, `ProcessPoolExecutor` for Stockfish.
- **"Glass Jaw" defense** — Chess.com API is undocumented. All polling must have exponential backoff, try/except, and fallback to last-known state.
- **Heuristics performance:** Must stay under 10ms. Tests enforce this.
- **Stockfish time limit:** Hard 100ms cap — never increase without explicit reason.
- **Singleton pattern** for `GuildService` and `StockfishEngine`.
- **Service layer** separates business logic from Discord command handlers — put logic in `services/`, not in cogs.

## Testing Notes

- 40 tests total: 17 heuristics, 16 engine (skipped without Stockfish binary), 7 integration
- Stockfish tests require the binary at `STOCKFISH_PATH` or system path
- `pytest.ini` sets `asyncio_mode = auto` — all async tests work without extra decorators
- Benchmarks are in `tests/benchmarks.py`, not in the pytest suite
