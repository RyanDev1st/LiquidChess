# 🏟️ Count Lucian's Arena System - Live Chess Command Reference

## Overview

The Arena system manages live chess observation. Count Lucian watches Chess.com games in real-time, providing commentary and analysis through both Discord and web interfaces.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    🩸 THE ARENA                                  │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Discord    │◄───│   Bridge     │───►│    Core      │      │
│  │   Commands   │    │   Service    │    │   Watcher    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────┐                             │
│                    │    Web       │                             │
│                    │   WebSocket  │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commands Overview

| Command | Purpose | Access |
|---------|---------|--------|
| `!live [link]` | Start or re-hook a live session | Everyone |
| `!live stop [scope]` | Stop the live session | Everyone |
| `!switchlive <n>` | Switch focus to game at index | Everyone |
| `!listlive` | List all active sessions | Everyone |

---

## 🩸 `!live` Command

### Syntax
```
!live                              # Re-hook to existing session
!live <chess.com_url>              # Start new session
!live stop                         # Stop all connections
!live stop <scope>                 # Stop specific scope
```

### Logic Flow

```
!live (no arguments) - "The Nudge"
├── IF no active session:
│   └── "There is no blood to hunt. Give me a link."
│
└── ELSE (session exists):
    ├── Re-hook Discord to existing session
    ├── IF user is in VC and bot is not:
    │   └── Join user's voice channel
    ├── IF no active thread:
    │   └── Create live thread
    └── Push current state update
```

```
!live <url> - Start New Session
├── Validate URL format
├── Call BridgeService.start_session(url)
├── IF user is in voice channel:
│   └── Join voice channel
├── Create live thread from message
└── Send confirmation embed with:
    ├── Game title
    ├── Web view link
    ├── Voice channel (if joined)
    └── Thread (if created)
```

```
!live stop [scope]
├── scope = "discord" | "web" | "all" (default: "all")
├── Call BridgeService.stop_session(scope)
├── IF scope includes discord:
│   └── Disconnect from voice channel
└── Send confirmation embed
```

### Examples
```bash
!live https://chess.com/game/live/123456789    # Start tracking game
!live                                           # Re-hook (The Nudge)
!live stop                                      # Stop everything
!live stop discord                              # Stop Discord only
!live stop web                                  # Stop web only
```

### Response Embeds

**Start Session:**
```
🩸 The Hunt Begins
─────────────────────────
I have locked onto **Player1 vs Player2**.

🌐 Web View    : liquidchess.club/watch
🎙️ Voice       : General (if joined)
💬 Thread      : #🔴 Live: Player1 vs Player2

The board is set. The pieces move.
```

**Re-hook (No Changes Needed):**
```
🧛 I am already watching. Patience, mortal.
```

**Stop Session:**
```
🦇 The Hunt Concludes
─────────────────────────
Severed connections: **discord, web**

Until the next summons...
```

---

## 🔄 `!switchlive` Command

### Syntax
```
!switchlive <index>
```

### Logic Flow

```
!switchlive <n>
├── IF no queue:
│   └── "The queue is empty. There is nothing to switch."
│
├── IF index out of range:
│   └── "Index {n} is beyond my sight. I see {count} games."
│
└── ELSE:
    ├── Set focus to game at index
    ├── Send confirmation embed
    └── Push state update for new focus
```

### Examples
```bash
!switchlive 1    # Focus on first game
!switchlive 3    # Focus on third game
```

### Response
```
👁️ Focus Shifted
─────────────────────────
Now observing: **Player1 vs Player2**

Index   : [2]
Status  : active
```

---

## 📋 `!listlive` Command

### Syntax
```
!listlive
```

### Logic Flow

```
!listlive
├── IF no queue:
│   └── "The hunting grounds are barren."
│
└── ELSE:
    └── List all sessions with:
        ├── Index number
        ├── Focus marker (👁️) for current
        ├── Game title
        ├── Status
        └── Web view link
```

### Response
```
🩸 Active Hunts
─────────────────────────
Monitoring **3** game(s)

[1] 👁️ Magnus vs Hikaru
    Status: active
    Web View

[2] Anish vs Ian
    Status: active
    Web View

[3] Fabiano vs Ding
    Status: paused
    Web View

Use !switchlive <n> to change focus
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Invalid URL | "You summon me without a proper link? My time is eternal, yours is not. Fix it." |
| Missing argument | "You forgot: `{param}`. Details matter, even to mortals." |
| Bad argument type | "Your argument offends my sensibilities. Try again." |
| Unknown error | "Something has gone wrong. Even I am... surprised." |

---

## Technical Integration

### BridgeService Methods Used

| Method | Purpose |
|--------|---------|
| `start_session(url)` | Initialize new game tracking |
| `stop_session(scope)` | Terminate tracking |
| `get_current_state()` | Get current game state |
| `get_persona_comment(fen)` | Get AI commentary |
| `set_discord_vc(id)` | Register voice channel |
| `set_discord_thread(id)` | Register thread |
| `is_in_vc()` | Check if bot in voice |
| `has_thread()` | Check if thread exists |

### Voice Channel Behavior

1. Bot only joins if user is in a voice channel
2. Bot only joins `VoiceChannel`, not `StageChannel`
3. Bot disconnects from previous VC before joining new one
4. Uses `force=True` for clean disconnection

### Thread Behavior

1. Thread created from the `!live` message
2. Thread name: `🔴 Live: {game_title}`
3. Auto-archive: 24 hours
4. Thread ID stored in BridgeService for updates

---

## Configuration

Hardcoded values — move to `app/backend/config/settings.yaml` in future:

```yaml
arena:
  lucian_red: 0x880000
  web_base_url: "https://liquidchess.club"
  thread_archive_duration: 1440  # 24 hours in minutes
```

---

## Testing Checklist

- [ ] `!live` without link when no session → Error message
- [ ] `!live` with valid link → Session starts
- [ ] `!live` without link when session exists → Re-hook
- [ ] `!live stop` → Stops all connections
- [ ] `!live stop discord` → Stops Discord only
- [ ] `!switchlive` with valid index → Focus shifts
- [ ] `!switchlive` with invalid index → Error message
- [ ] `!listlive` with sessions → Lists all
- [ ] `!listlive` without sessions → Empty message
- [ ] Voice channel join when user in VC
- [ ] Thread creation on new session
