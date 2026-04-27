# 🧛 Count Lucian's Guild System v2.0 - Complete Command Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    🏰 CASTLE STATUS (Public)                     │
│  Visible to: Everyone                                            │
│  Push access: Admin Role only                                    │
│  Categories: event, partners, links                              │
├─────────────────────────────────────────────────────────────────┤
│                    📌 PIN BOARD (Role-Gated)                     │
│  Visible to: Users with Pin Role                                 │
│  Push access: Users with Pin Role                                │
│  Categories: Any custom category (tasks, ideas, bugs, etc.)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Commands Overview

| Command | Purpose | Access |
|---------|---------|--------|
| `!info` | View dashboard | Everyone |
| `!info <category>` | View specific category | See below |
| `!push <category> <content>` | Add item to category | Role-based |
| `!pop <category> [index]` | Remove item from category | Role-based |
| `!settings` | Configure settings | Admin only |

---

## 📊 `!info` Command

### Syntax
```
!info [category]
```

### Logic Flow

```
!info (no arguments)
├── Show Castle Status (public section)
│   ├── 📅 Event    - if exists
│   ├── 🤝 Partners - if exists  
│   └── 🔗 Links    - if exists
│
└── IF user has Pin Role:
    └── Show Pin Board section
        └── All custom categories
```

```
!info <category>
├── IF category is "event", "partners", or "links":
│   └── Show to everyone (public)
│
└── ELSE (custom category):
    ├── IF user has Pin Role:
    │   └── Show Pin Board category
    └── ELSE:
        └── "You lack the authority to view the Pin Board"
```

### Examples
```bash
!info              # Full dashboard (public + Pin Board if authorized)
!info event        # Show current event details
!info partners     # Show partner list
!info links        # Show links
!info tasks        # Show tasks (Pin Board - requires role)
!info ideas        # Show ideas (Pin Board - requires role)
```

### Output Cases

**Case 1: User without Pin Role**
```
🏰 Castle Status
────────────────────
📅 Event      : Chess Night @ Friday 7PM
🤝 Partners   : ChessKid, Lichess
🔗 Links      : Discord, Website
```

**Case 2: User with Pin Role**
```
🏰 Castle Status
────────────────────
📅 Event      : Chess Night @ Friday 7PM
🤝 Partners   : ChessKid, Lichess
🔗 Links      : Discord, Website

━━━━━━━━━━━━━━━━━━
📌 PIN BOARD
📋 Tasks      : 3 items
💡 Ideas      : 2 items
🐛 Bugs       : 1 items
```

---

## 📤 `!push` Command

### Syntax
```
!push <category> <Title> | <Details> [| Tag]
```

### Logic Flow

```
!push <category> <content>
│
├── IF category is "event", "partners", or "links":
│   ├── IF user has Admin Role or is Administrator:
│   │   └── Push to Castle Status (public)
│   └── ELSE:
│       └── "Only administrators may push to <category>"
│
└── ELSE (custom category → Pin Board):
    ├── IF user has Pin Role or is Administrator:
    │   └── Push to Pin Board
    └── ELSE:
        └── "You lack the authority to use the Pin Board"
```

### Category Behaviors

| Category | Type | Behavior |
|----------|------|----------|
| `event` | Singular | Overwrites existing (only 1 item) |
| `partners` | List | Appends new item |
| `links` | List | Appends new item |
| `tasks` | List (Pin) | Appends new item |
| `ideas` | List (Pin) | Appends new item |
| `<any>` | List (Pin) | Creates category if new, appends |

### Content Parsing

```
!push event Chess Night | Weekly meetup | Friday 7PM | Room 101
        │        │              │              │           │
        │        │              │              │           └─ extra["location"]
        │        │              │              └─ extra["date"]
        │        │              └─ details
        │        └─ title
        └─ category (singular, overwrites)

!push tasks Fix Bug | Crash on main page | urgent
        │      │            │                │
        │      │            │                └─ tag
        │      │            └─ details
        │      └─ title
        └─ category (list, appends)

!push partners ChessKid | Our sponsor
        │         │            │
        │         │            └─ details
        │         └─ title
        └─ category (list, appends)
```

### Examples

```bash
# Public Categories (Admin only)
!push event Chess Night | Weekly meetup | Friday 7PM | Room 101
!push partners ChessKid | Our main sponsor
!push links Discord | https://discord.gg/example

# Pin Board Categories (Pin Role required)
!push tasks Fix Bug | There's a crash on homepage | urgent
!push ideas Rating Display | Show player ratings on stream
!push bugs Login Issue | Users can't login sometimes | high-priority
!push notes Meeting | Remember to discuss tournament
```

### Success Output
```
📅 Event Updated
────────────────────
Chess Night

Details: Weekly meetup
Date: Friday 7PM
Location: Room 101

Castle Status • By Username
```

---

## 🗑️ `!pop` Command

### Syntax
```
!pop <category> [index]
```

### Logic Flow

```
!pop <category> [index]
│
├── IF category is "event", "partners", or "links":
│   ├── IF user has Admin Role or is Administrator:
│   │   └── Remove item
│   └── ELSE:
│       └── "Only administrators may modify <category>"
│
└── ELSE (custom category → Pin Board):
    ├── IF user has Pin Role or is Administrator:
    │   └── Remove item
    └── ELSE:
        └── "You lack the authority to modify the Pin Board"
```

### Index Behavior

| Category Type | Index | Behavior |
|--------------|-------|----------|
| Singular (event) | Ignored | Clears the only item |
| List | Omitted | Removes last item |
| List | 1, 2, 3... | Removes specific index |

### Examples

```bash
!pop event           # Clear the event (singular)
!pop partners 2      # Remove partner #2
!pop partners        # Remove last partner
!pop links 1         # Remove link #1
!pop tasks 3         # Remove task #3 from Pin Board
!pop ideas           # Remove last idea from Pin Board
```

---

## ⚙️ `!settings` Command

### Syntax
```
!settings [option] [value]
```

### Access
**Administrator permission required**

### Logic Flow

```
!settings (no arguments)
└── Show interactive settings dashboard with buttons

!settings <option> <value>
├── IF option is valid:
│   └── Update setting
└── ELSE:
    └── "Unknown setting: <option>"
```

### Available Options

| Option | Aliases | Values | Description |
|--------|---------|--------|-------------|
| `admin_role` | `admin_role_id` | Role mention or `clear` | Role that can push to public categories |
| `pin_role` | `pin_role_id` | Role mention or `clear` | Role that can see/use Pin Board |
| `pin_board` | `pin_board_enabled` | `true`/`false` | Toggle Pin Board visibility |

### Examples

```bash
!settings                      # Show interactive dashboard
!settings admin_role @Officers # Set admin role
!settings pin_role @Staff      # Set Pin Board role
!settings pin_board false      # Disable Pin Board entirely
!settings admin_role clear     # Remove admin role setting
```

### Interactive Dashboard

When `!settings` is called without arguments, displays:

```
⚙️ Guild Settings
────────────────────

👑 Admin Role
@Officers
Can push to event, partners, links

📌 Pin Board Role
@Staff
Can see and push to Pin Board

🔄 Pin Board Enabled
✅ Yes
Toggle Pin Board visibility

[Set Admin Role] [Set Pin Role] [Toggle Pin Board] [Close]
```

---

## 🔐 Permission Matrix

| Action | Administrator | Admin Role | Pin Role | Everyone |
|--------|:-------------:|:----------:|:--------:|:--------:|
| `!info` (public) | ✅ | ✅ | ✅ | ✅ |
| `!info` (pin board) | ✅ | ✅ | ✅ | ❌ |
| `!push event/partners/links` | ✅ | ✅ | ❌ | ❌ |
| `!push <custom>` | ✅ | ✅ | ✅ | ❌ |
| `!pop event/partners/links` | ✅ | ✅ | ❌ | ❌ |
| `!pop <custom>` | ✅ | ✅ | ✅ | ❌ |
| `!settings` | ✅ | ❌ | ❌ | ❌ |

---

## 📁 Data Storage

### File Structure
```
app/backend/data/guild/
├── settings.json      # Role configuration
└── dashboard.json     # All categories
```

### settings.json
```json
{
  "admin_role_id": 123456789012345678,
  "pin_role_id": 234567890123456789,
  "pin_board_enabled": true
}
```

### dashboard.json
```json
{
  "event": [{
    "title": "Chess Night",
    "details": "Weekly meetup",
    "tag": "",
    "extra": {"date": "Friday 7PM", "location": "Room 101"},
    "created_at": "2026-02-02T19:00:00",
    "created_by": 123456789
  }],
  "partners": [
    {"title": "ChessKid", "details": "Our sponsor", ...},
    {"title": "Lichess", "details": "", ...}
  ],
  "tasks": [
    {"title": "Fix Bug", "details": "Crash on homepage", "tag": "urgent", ...}
  ]
}
```

---

## 🎨 Category Icons

| Category | Icon | Section |
|----------|------|---------|
| event | 📅 | Public |
| partners | 🤝 | Public |
| links | 🔗 | Public |
| tasks | 📋 | Pin Board |
| ideas | 💡 | Pin Board |
| bugs | 🐛 | Pin Board |
| notes | 📝 | Pin Board |
| schedule | 📆 | Pin Board |
| announcements | 📢 | Pin Board |
| (other) | 📌 | Pin Board |

---

## 🔄 Migration Notes

- Old `work_items.json` automatically migrates to `tasks` category in Pin Board
- Old `guild_info.json` migrates event, partners, links to new format
- Migrated files are renamed with `.migrated` extension

---

## 🧪 Testing Checklist

```bash
# 1. Test Settings (as Administrator)
!settings                          # Should show interactive dashboard
!settings admin_role @Officers     # Set admin role
!settings pin_role @Staff          # Set pin role
!settings pin_board true           # Enable pin board

# 2. Test Info (as regular user)
!info                              # Should show only Castle Status
!info event                        # Should work (public)
!info tasks                        # Should fail (no pin role)

# 3. Test Info (as user with Pin Role)
!info                              # Should show Castle Status + Pin Board
!info tasks                        # Should work

# 4. Test Push (as user with Admin Role)
!push event Test Event | Description | Date | Location
!push partners TestPartner | Details
!push links TestLink | https://example.com
!info                              # Verify items added

# 5. Test Push (as user with Pin Role, not Admin)
!push event Test | Should fail     # Should fail (admin only)
!push tasks Test Task | Details    # Should work (pin board)
!push ideas New Idea | Details | tag
!info tasks                        # Verify task added

# 6. Test Pop
!pop event                         # Clear event
!pop partners 1                    # Remove first partner
!pop tasks                         # Remove last task

# 7. Verify Persistence
# Restart bot, then:
!info                              # Data should persist
```

---

## 🚨 Error Messages

| Situation | Response |
|-----------|----------|
| No permission for Pin Board | *"You lack the authority to view the Pin Board. Seek a higher station."* |
| No permission for public push | *"Only administrators may push to `category`. Know your place, mortal."* |
| Empty category | *"No `category` has been recorded. The ledger holds only dust."* |
| Nothing to pop | *"Nothing to remove from `category`."* |
| Invalid settings option | *"Unknown setting: `option`. Valid options: `admin_role`, `pin_role`, `pin_board`"* |
