# LiquidChess Discord Command Audit (Target Schema)

**Status:** Target Specification (v2.1)
**Goal:** A clean, intuitive, generic/modular command structure independent of legacy implementations.

---

## 1. Match System (The Core Loop)
**Concept:** Users request games, get verified automatically via link scraping (with admin oversight), and find opponents. Match channels are temporary and private.

### Player Commands
**Command:** `!match request`
- **Logic:**
  - **If Verified:** Adds user to the "Looking for Game" queue.
  - **If Unverified:**
    1. Responds with ephemeral message: "Check your DMs to verify ELO."
    2. DMs user asking for Chess.com or Lichess profile URL.
    3. Scrapes external site for Blitz/Rapid ELO.
    4. **Success:** assign ELO, mark verified, add to Queue, log to Admin Channel.
    5. **Failure:** DMs "Could not verify. Please contact an Admin."
- **Examples:** `!match request`
- **Edge Cases:** User DMs invalid link, Site is down (fallback to manual admin verify).

**Command:** `!match list`
- **Logic:** Displays an embed of current requests with **Indices** (1, 2, 3...).
- **Fields:** User Mention | ELO | Wait Time | Platform Preference.
- **Example:** `!match list` (Aliases: `!games`, `!lobby`)

**Command:** `!match accept <index>`
- **Logic:**
  - Validates index.
  - Removes request from queue.
  - Creates **Private Thread/Channel** accessible only to: Player A, Player B, Admin Role.
  - Pings both players.
  - Sends "Match Control Panel" (Buttons: [Finish Match], [Close Chat]).
- **Example:** `!match accept 1`
- **Error:** "That match is no longer available."

**Command:** `!match cancel`
- **Logic:** Removes your own pending request from the list.
- **Example:** `!match cancel`

### Admin/Mod Commands
**Command:** `!match review`
- **Logic:** Shows users who failed auto-verification or are flagged for manual review.

**Command:** `!match approve <user> [elo]`
- **Logic:** Manual override to verify a user.
- **Example:** `!match approve @User 1500`

**Command:** `!match reject <user> [reason]`
- **Logic:** Revokes verification status or removes a toxic request.
- **Example:** `!match reject @User Smurf account`

**Command:** `!verify <user> <elo> <link>`
- **Logic:** Hard override for admins to set a user's status without the request flow.
- **Example:** `!verify @Magnus 2800 https://chess.com/magnus`

---

## 2. Progression System (The Reward)
**Concept:** XP is earned by playing games (via match system) and engaging.

**Command:** `!rank [user]`
- **Aliases:** `!elo`, `!level`, `!xp`
- **Logic:**
  - If no user: Shows caller's Card (Avatar, Level, XP Bar, verified Chess ELO).
  - If user: Shows target's Card.
- **Example:** `!rank`, `!rank @CountLucian`
- **Edge Cases:** User has 0 XP (show level 1).

---

## 3. Dashboard Information (The Guild Board)
**Concept:** Unified interface replacing `!push`/`!pop`.

**Command:** `!info show <category>`
- **Logic:** Displays items in the category.
- **Categories:** `event` (singular), `partners` (list), `links` (list), `about`.
- **Example:** `!info show event` (Shows current event), `!info show partners` (Lists sponsors).

**Command:** `!info add <category> <content>` (Admin/Mod Only)
- **Logic:** Adds item. Content format: `Title | Description`.
- **Example:** `!info add partners ChessKid | Official Sponsor`

**Command:** `!info remove <category> <index>` (Admin/Mod Only)
- **Logic:** Removes item at specific index.
- **Example:** `!info remove partners 2`

---

## 4. Arena (Stream)
**Concept:** Watching live games from Chess.com.

**Command:** `!live [link]`
- **Logic:**
  - If Link: Connects to VC, creates thread, streams game.
  - If No Link: Re-sends the current board state/embed to chat.
- **Example:** `!live https://chess.com/game/live/999`

**Command:** `!stop`
- **Aliases:** `!kill`
- **Logic:** Stops the current broadcast, disconnects from VC, archives the thread.
- **Example:** `!stop`

**Command:** `!switchlive <index>`
- **Logic:** Changes the focused game if the bot is tracking multiple (e.g., tournament mode).
- **Example:** `!switchlive 2`

---

## 5. Settings (Configuration)
**Concept:** One command to rule them all.

**Command:** `!settings <option> <value>`
- **Options:**
  - `admin_role @Role` (Who can use admin commands)
  - `chess_role @Role` (Who gets pinged for matches)
  - `pin_role @Role` (Who can edit info board)
  - `pin_channel #Channel` (Where the dashboard lives)
- **Example:** `!settings chess_role @ChessClub`

---

## 6. Jester (Fun & Utilities)
**Command:** `!meme <now | auto | stop>`
- **Logic:** Posts memes immediately or on a timer.

**Command:** `!save <link> [note]`
- **Logic:** Personal bookmarking for games.

**Command:** `!codex [id]`
- **Logic:** Recall saved games.

---

## 7. Fate (Tabletop & Chance)
**Concept:** Tools for DnD and random chance. Simple enough for non-players, useful enough for DMs.

**Command:** `!roll <notation>`
- **Logic:** Standard dice notation parser.
- **Example:** `!roll 1d20` (Standard check), `!roll 2d6+4` (Damage), `!roll 1d100` (Percentile).
- **Response:** "The bones reveal: **18** (14 + 4)"

**Command:** `!flip`
- **Logic:** Simple Coin toss.
- **Response:** "Heads." or "Tails."

**Command:** `!turn <add | next | clear | list> [args]`
- **Concept:** Initiative Tracker. Useful for DnD turn order OR Chess tournament rotation.
- **Logic:**
  - `!turn add @User <value>`: Adds user with a sort value (Initiative roll).
  - `!turn next`: Pings the next person in list, moves current to bottom? or removes? (Standard DnD cycles).
  - `!turn list`: Shows current order.
- **Example:** `!turn add @Rogue 23`, `!turn next`.

---

## 8. Gatekeeper (Onboarding)
**Concept:** "Best in Class" servers always handle new joins gracefully.

**Command:** `!greet config <channel> <message>`
- **Logic:** Sets the channel and template for welcome messages.
- **Variables:** `{user}` mentions the joiner, `{count}` shows member count.
- **Example:** `!greet config #general Welcome to the manor, {user}. You are soul number {count}.`

**Command:** `!greet test`
- **Logic:** Sends a fake join message to test the config.