# 🎭 Count Lucian's Jester System - Entertainment Command Reference

## Overview

The Jester system provides entertainment features for the Discord server. Count Lucian dispenses memes and roasts with aristocratic disdain.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    🎭 THE JESTER                                 │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Discord    │◄───│   Drive      │───►│   Google     │      │
│  │   Commands   │    │   Service    │    │   Drive      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │   Bridge     │───►│   Core AI    │                           │
│  │   Service    │    │   Analysis   │                           │
│  └──────────────┘    └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commands Overview

| Command | Purpose | Access |
|---------|---------|--------|
| `!meme auto` | Start automatic meme posting | Everyone |
| `!meme stop` | Stop automatic meme posting | Everyone |
| `!meme now` | Post a meme immediately | Everyone |
| `!roast [target]` | Roast a user, PGN, or position | Everyone |

---

## 🎭 `!meme` Command Group

### Syntax
```
!meme                              # Show subcommands
!meme auto [category] [interval] [#channel]
!meme stop
!meme now [category]
```

---

### `!meme auto` - Start Auto-Posting

#### Logic Flow

```
!meme auto [category] [interval] [#channel]
├── IF not in guild:
│   └── "Auto-meme requires a guild. Not here."
│
├── IF already running in guild:
│   └── "The meme fountain already flows. Use `!meme stop` first."
│
├── Validate interval:
│   ├── IF < 60 seconds:
│   │   └── "Minimum interval is 60 seconds."
│   └── IF > 86400 seconds (24h):
│       └── "Maximum interval is 24 hours."
│
├── Get folder ID for category
├── Create MemeTask with:
│   ├── channel_id (target or current)
│   ├── folder_id
│   ├── interval
│   └── category
├── Start background task
└── Send confirmation embed
```

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `category` | "default" | Meme category (chess, blunders, memes, default) |
| `interval` | 300 | Seconds between posts (min: 60, max: 86400) |
| `channel` | Current | Target channel for memes |

#### Examples
```bash
!meme auto                         # Default category, 5 min interval
!meme auto chess 120               # Chess memes every 2 minutes
!meme auto blunders 600 #memes     # Blunders every 10 min in #memes
```

#### Response
```
🎭 Meme Engine Activated
─────────────────────────
Category: **chess**

Interval  : 120 seconds (2m)
Channel   : #memes

Use !meme stop to cease the flood
```

---

### `!meme stop` - Stop Auto-Posting

#### Logic Flow

```
!meme stop
├── IF not in guild:
│   └── Return silently
│
├── IF no active task in guild:
│   └── "No memes are being dispensed. The fountain is dry."
│
└── ELSE:
    ├── Cancel background task
    ├── Remove from tracking
    └── "The meme fountain has been silenced. Peace... for now."
```

---

### `!meme now` - Post Immediately

#### Logic Flow

```
!meme now [category]
├── IF not in TextChannel:
│   └── "Memes must flow through a proper text channel."
│
├── Get folder ID for category
└── Send random meme from folder
```

#### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `category` | "default" | Meme category |

---

## 🔥 `!roast` Command

### Syntax
```
!roast                  # Roast current live position
!roast @user            # Roast a user
!roast <pgn>            # Roast a game by PGN
```

### Logic Flow

```
!roast [target]
├── IF no target:
│   └── Roast live position
│       ├── Get current state from BridgeService
│       ├── IF no state: "There is no live game to mock."
│       ├── Get roast commentary
│       └── Send embed with roast
│
├── IF target starts with "<@":
│   └── Roast user
│       ├── Extract user ID from mention
│       ├── Fetch user
│       ├── IF not found: "That mortal does not exist."
│       ├── Get/mock user stats
│       ├── Generate roast from stats
│       └── Send embed with roast + stats
│
├── IF target looks like PGN:
│   └── Roast PGN
│       ├── Analyze PGN via BridgeService
│       ├── Generate roast based on:
│       │   ├── Blunders count
│       │   ├── Missed wins
│       │   ├── Accuracy percentage
│       │   └── Worst move
│       └── Send embed with analysis + roast
│
└── ELSE:
    └── "I know not how to roast this."
```

### Examples
```bash
!roast                             # Roast live position
!roast @ChessPlayer                # Roast a user
!roast 1. e4 e5 2. Nf3 Nc6 ...    # Roast a game
```

---

### Roast Response Types

#### Live Position Roast
```
🔥 Position Roast
─────────────────────────
🧛 *Black's pieces are huddled in the corner 
like frightened peasants. White has achieved 
complete spatial domination.*

Game   : Magnus vs Hikaru
Move   : #32

The flames of critique burn eternal
```

#### User Roast
```
🔥 Roasting ChessPlayer
─────────────────────────
🧛 *1200 rating? I've seen better from pawns.*

Rating   : 1200
Games    : 150
Win Rate : 45%

Stats are mocked. The roast is eternal.
```

#### PGN Roast
```
🔥 PGN Analysis & Roast
─────────────────────────
🧛 *5 blunders. Were you playing blindfolded? 
Or just blind?

2 missed wins. Victory was served on a silver 
platter and you chose the floor.

62.3% accuracy. A random number generator 
would be proud.*

Blunders    : 5
Missed Wins : 2
Accuracy    : 62.3%

Every game is a lesson. Yours was a cautionary tale.
```

---

## Category Configuration

### Folder Mapping

Hardcoded mapping — move to `app/backend/config/settings.yaml` in future:

```python
_folder_mapping = {
    "chess": "mock_chess_folder_id",
    "blunders": "mock_blunder_folder_id", 
    "memes": "mock_general_folder_id",
    "default": "mock_default_folder_id"
}
```

### Category Icons

```python
CATEGORY_ICONS = {
    "chess": "♟️",
    "blunders": "💥",
    "memes": "😂",
    "default": "🎭"
}
```

---

## Technical Details

### MemeTask Class

```python
@dataclass
class MemeTask:
    channel_id: int       # Target channel ID
    folder_id: str        # Google Drive folder ID
    interval: int         # Seconds between posts
    category: str         # Category name
    task: Optional[Task]  # Background asyncio task
    running: bool         # Task running state
```

### Background Task Loop

```
_meme_loop(guild_id, meme_task):
├── Initial delay: 5 seconds
└── WHILE running:
    ├── Get channel by ID
    ├── IF channel valid:
    │   └── Send random meme
    ├── ELSE:
    │   ├── Log warning
    │   └── Break loop
    ├── Sleep for interval
    └── On CancelledError: break
        On other Error: back off 60s
```

### PGN Detection

Simple heuristics to detect PGN:

```python
pgn_indicators = [
    "1.", "1...", "e4", "d4", "Nf3", "O-O", "O-O-O",
    "[Event", "[White", "[Black", "Result"
]
```

---

## Services Used

### DriveService

| Method | Purpose |
|--------|---------|
| `get_random_file(folder_id)` | Get random file metadata |
| `get_random_file_as_bytes(folder_id)` | Get file content as bytes |

### BridgeService

| Method | Purpose |
|--------|---------|
| `get_current_state()` | Get current game state for roast |
| `get_persona_comment(fen, context)` | Get AI commentary |
| `analyze_pgn(pgn)` | Analyze PGN for roast |

---

## Error Handling

| Error | Response |
|-------|----------|
| Missing parameter | "Missing: `{param}`. Even jesters need proper instructions." |
| Bad argument | "Invalid argument. Your jest has fallen flat." |
| User not found | "That mortal does not exist. Or they have fled my gaze." |
| Unknown error | "The jest has backfired. How... ironic." |

---

## Mock Mode

When Google Drive is not configured:

```
🧛 *[Mock Mode]* Would display: **chess_blunder_001.jpg**
```

When live game not available:

```
🧛 *There is no live game to mock. Start one with `!live` first.*
```

---

## Testing Checklist

### Meme Commands
- [ ] `!meme` shows subcommands
- [ ] `!meme auto` starts posting
- [ ] `!meme auto` with custom interval
- [ ] `!meme auto` with channel mention
- [ ] `!meme stop` stops posting
- [ ] `!meme now` posts immediately
- [ ] Interval validation (min/max)
- [ ] Mock mode when Drive not configured

### Roast Commands
- [ ] `!roast` without live game → Error
- [ ] `!roast` with live game → Position roast
- [ ] `!roast @user` → User roast
- [ ] `!roast <pgn>` → PGN analysis roast
- [ ] Invalid roast target → Error message

### Edge Cases
- [ ] Multiple guilds with separate tasks
- [ ] Task cleanup on cog unload
- [ ] Channel deleted during auto-post
