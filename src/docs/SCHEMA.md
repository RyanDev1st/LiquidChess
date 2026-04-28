# LiquidChess — Project Schema

Canonical directory structure for `src/`. Excludes `node_modules/` and `rag_storage/`.

```
src/
│
├── .env                          # Root environment vars (Firebase, API keys)
├── .firebaserc                   # Firebase project aliases
├── firebase.json                 # Firebase hosting + functions config
├── package.json                  # Root npm scripts (run from here)
├── package-lock.json
├── claude-flow.config.json       # Claude-flow pipeline config
├── main.py                       # Legacy observer entry point
│
├── app/
│   ├── assets/
│   │   └── Materials/            # Raw design assets (textures, refs)
│   │
│   ├── backend/                  # Python monorepo
│   │   ├── main.py               # Master launcher (delegates to src.cli)
│   │   ├── run_bot.py            # Discord-bot-only launcher
│   │   ├── run_benchmarks.py     # Benchmark runner
│   │   ├── pytest.ini            # Test config
│   │   ├── requirements.txt      # Python dependencies
│   │   │
│   │   ├── config/
│   │   │   ├── settings.yaml     # Runtime config (non-secret)
│   │   │   └── secrets.env       # Secrets — NOT committed
│   │   │
│   │   ├── data/
│   │   │   ├── guild/            # Guild dashboard + settings JSON
│   │   │   ├── gatekeeper/       # Onboarding / verification data
│   │   │   ├── progression/      # XP + ranking data
│   │   │   └── user_saves/       # Per-user saved games
│   │   │
│   │   ├── functions/            # Firebase / slash-command registration
│   │   │   ├── main.py
│   │   │   ├── command_definitions.py
│   │   │   ├── handlers.py
│   │   │   ├── register_commands.py
│   │   │   ├── signature.py
│   │   │   └── constants.py
│   │   │
│   │   ├── src/                  # Application source
│   │   │   ├── __init__.py
│   │   │   ├── brain/            # Stockfish analysis engine
│   │   │   │   ├── engine.py     # StockfishService (singleton)
│   │   │   │   └── heuristics.py # Positional evals (mobility, tension)
│   │   │   ├── cli/              # CLI entry points
│   │   │   ├── core/             # Event loop & orchestration
│   │   │   │   ├── controller.py
│   │   │   │   ├── event_loop.py
│   │   │   │   ├── models.py
│   │   │   │   ├── turns.py
│   │   │   │   └── components.py
│   │   │   ├── discord/          # Discord bot ("The Hand")
│   │   │   │   ├── bot.py        # LiquidChessBot class
│   │   │   │   ├── main.py       # Entry point
│   │   │   │   ├── runtime.py    # Process runtime helpers
│   │   │   │   ├── constants.py
│   │   │   │   ├── cogs/         # Command modules (arena, guild, jester, utility)
│   │   │   │   └── services/     # Business logic (bridge, guild, drive)
│   │   │   ├── soul/             # AI persona generation
│   │   │   │   ├── generator.py  # PersonaGenerator (Groq LLM)
│   │   │   │   ├── renderer.py   # Board image rendering
│   │   │   │   └── vision.py     # Board vision analysis
│   │   │   ├── utils/            # Shared helpers (logger, tracing)
│   │   │   └── watcher/          # Chess.com data ingestion
│   │   │       ├── poller.py     # GamePoller (async)
│   │   │       └── tcn_decoder.py
│   │   │
│   │   └── tests/
│   │       ├── conftest.py
│   │       ├── test_engine.py
│   │       ├── test_heuristics.py
│   │       ├── test_integration.py
│   │       └── test_tracing_runtime.py
│   │
│   └── frontend/                 # Vite + React web app ("The Face")
│       ├── index.html            # Dark mode forced: class="dark"
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── public/
│       │   └── models/            # Static 3D assets (FBX)
│       │   └── videos/            # Video assets
│       │   └── commentations/     # Audio assets
│       └── src/
│           ├── App.tsx           # Hook gate + landing root
│           ├── main.tsx          # Entry point
│           ├── index.css         # Global CSS (design tokens, dark theme)
│           ├── components/       # Shared UI components
│           │   ├── ui/           # ShadCN base components + 21st.dev blocks (ContainerScroll)
│           │   ├── landing/      # Landing-page-specific components
│           │   ├── three/        # R3F/Spline 3D components
│           │   └── layout/       # Layout components (Header)
│           ├── pages/            # Route-level page components
│           │   └── landing/
│           │       └── index.tsx # LandingPage export
│           ├── hooks/            # Scroll and interaction hooks
│           └── lib/              # Utilities (cn, etc.)
│
├── Claude/                       # Obsidian vault (design research + wiki)
│   ├── Welcome.md
│   ├── raw/                      # Raw research notes
│   └── wiki/                     # Structured wiki pages
│
├── design/                       # Design system references
│   ├── CONTEXT.md                # Design rules for agents
│   └── desktop-web/              # Desktop web mockups + specs
│
├── docs/                         # System documentation
│   ├── IMPLEMENTATION.md         # Architecture, patterns, deployment
│   ├── SCHEMA.md                 # This file — directory structure
│   ├── ARENA_SYSTEM.md           # !live / !switchlive command reference
│   ├── GUILD_SYSTEM.md           # !info / !push / !pop / !settings reference
│   ├── JESTER_SYSTEM.md          # !meme / !roast command reference
│   ├── DISCORD_COMMANDS_AUDIT.md # Target command schema v2.1
│   ├── WEB_FRONTEND.md           # Frontend design system & components
│   ├── STATUSLINE.md             # Claude Code statusline fix log
│   └── agents/                   # Agent workflow docs
│       ├── README.md
│       ├── workflow.md
│       ├── implementation-guide.md
│       └── reports/              # Per-task agent reports
│
└── LightRAG/                     # LightRAG submodule (opt-in RAG layer)
    └── (upstream repo files)
```

---

## Ignored Directories

| Path | Reason |
|------|--------|
| `src/node_modules/` | npm install output |
| `src/rag_storage/` | LightRAG vector store (runtime, large) |
| `src/app/frontend/node_modules/` | npm install output |
| `src/app/frontend/build/` | Vite build output |
| `src/app/backend/src/__pycache__/` | Python bytecode |
| `src/LightRAG/` | Third-party submodule |

---

## npm Entry Points

All scripts run from `src/`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (frontend) |
| `npm run bot` | Discord bot |
| `npm run observe` | Full system (bot + watcher) |
| `npm run test` | pytest suite |
| `npm run build:web` | Production frontend build |
| `npm run bench` | Stockfish benchmarks |
| `npm run register:commands` | Register Discord slash commands |
