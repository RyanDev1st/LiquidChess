# Statusline Investigation & Fix Report

**Date**: 2026-04-13  
**Status**: Resolved

---

## Root Causes Found

### 1. Daemon syntax error (critical)
`statusline-daemon.js:285` had malformed string literal:
```js
// BROKEN
'`------\\'

// FIXED
"`------\\'"`
```
Daemon crashed on start → `statusline.ans` never written → fast-path never activated.

### 2. Fast-path exited before reading stdin (critical)
`statusline-combined.js` fast-path called `process.exit(0)` at startup — BEFORE stdin was read or `ctx.json` written.

Result: ctx%, token count, model **never updated** from Claude Code's payload. Daemon always rendered 21+ minute stale data. Statusline frozen at initial values.

Fix: moved ctx.json write + fast-path check inside `go()`, after stdin parsed.

### 3. `refreshInterval` not supported (confirmed v2.1.104)
Field absent from `settings.json` schema. Silently ignored.  
Verified: invocation log showed zero calls during 5s idle with `refreshInterval: 500` set.  
Statusline updates on CLI frame events only (prompt submit, tool calls). Field removed from config.

---

## Fixes Applied

| File | Change |
|------|--------|
| `statusline-daemon.js` | Fixed syntax error on line 285 |
| `statusline-daemon.js` | Added effort level + caveman level reading |
| `statusline-daemon.js` | Opens `\\.\CONOUT$`; writes `\x1b]0;...\x07` title every 500ms |
| `statusline-combined.js` | Fixed fast-path: ctx.json written BEFORE fast-path check |
| `statusline-combined.js` | Fast-path threshold tightened: `<500ms` (was `<2s`) |
| `statusline-combined.js` | Added effort + caveman to full-render fallback |
| `settings.json` | Removed non-functional `refreshInterval` field |
| `settings.json` | `autoUpdatesChannel` → `latest` |

---

## Real-time Status

| Mechanism | Works | Notes |
|-----------|-------|-------|
| ctx% / token / model update on events | ✅ | Fixed — stdin now always read before exit |
| Daemon writes `statusline.ans` every 500ms | ✅ | Daemon stays running |
| Terminal title bar updates every 500ms | ✅ | Via `CONOUT$` — visible in Windows Terminal tab |
| Statusline ticks between events | ❌ | `refreshInterval` not implemented in CC v2.1.104 |

---

## Statusline Layout

```
Sonnet-4.6 | ████░░░░░░ 43% | token: 86k | 00:17:09          [duck art]
effort:high | Caveman:full                                     [duck line 2]
```

- **effort** — reads `effortLevel` from `~/.claude/settings.json`
- **Caveman** — reads `~/.claude/.caveman-active`; dimmed when off, orange (#d75f00) when active

---

## Architecture

```
Claude Code (frame event: prompt submit / tool call)
  └── statusline-combined.js
        ├── parse stdin → write ctx.json (ALWAYS, before any exit)
        ├── [fast-path] statusline.ans age <500ms → output daemon render → exit
        └── [fallback]  full render from stdin JSON + file reads

statusline-daemon.js (background, always running)
  ├── every 500ms: reads ctx.json → renders → writes ~/.claude-buddy/statusline.ans
  └── every 500ms: writes \x1b]0;{compact}\x07 to \\.\CONOUT$ (terminal title)
```
