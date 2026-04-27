"""ProgressionCog - The Leveling System.

Tracks XP, levels, and displays rank cards.
Integrates with Match system for XP awards.

Commands:
    !rank       - Display your rank card (aliases: !elo, !level, !xp)
    !leaderboard - Show top players (aliases: !lb, !top)
    
XP Sources:
    - Match completion: 50 XP per game
    - Win bonus: 25 XP
    - Stream viewing: 5 XP per minute
    - Club event participation: 100 XP
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Optional, Dict, List, TYPE_CHECKING
from dataclasses import dataclass, field
from enum import Enum
import json
import os

import discord
from discord import app_commands
from discord.ext import commands

from src.utils.logger import get_logger
from src.utils.paths import DATA_DIR

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────

LUCIAN_RED = 0x880000
LUCIAN_GOLD = 0xD4AF37

# XP thresholds for each level (exponential curve)
# Level N requires BASE * (N ^ EXPONENT) total XP
XP_BASE = 100
XP_EXPONENT = 1.5

# XP rewards
XP_MATCH_COMPLETE = 50
XP_WIN_BONUS = 25
XP_STREAM_MINUTE = 5
XP_CLUB_EVENT = 100

# Rank titles by level
RANK_TITLES = {
    1: "Pawn",
    5: "Squire",
    10: "Knight",
    15: "Rook",
    20: "Bishop",
    25: "Champion",
    30: "Master",
    40: "Grandmaster",
    50: "Count's Favored",
    75: "Immortal",
    100: "Vampire Lord"
}

# Data file path
DATA_DIR = DATA_DIR / "progression"


# ─────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────

class XPSource(Enum):
    """Source of XP gain."""
    MATCH = "match"
    WIN = "win"
    STREAM = "stream"
    EVENT = "event"
    ADMIN = "admin"


@dataclass
class XPTransaction:
    """Record of an XP gain/loss."""
    amount: int
    source: XPSource
    timestamp: datetime = field(default_factory=datetime.now)
    description: str = ""


@dataclass
class PlayerStats:
    """Player progression stats."""
    user_id: int
    total_xp: int = 0
    matches_played: int = 0
    matches_won: int = 0
    stream_minutes: int = 0
    events_attended: int = 0
    joined_at: datetime = field(default_factory=datetime.now)
    history: List[XPTransaction] = field(default_factory=list)
    
    @property
    def level(self) -> int:
        """Calculate level from total XP."""
        if self.total_xp <= 0:
            return 1
        # Inverse of XP formula: level = (xp / base) ^ (1/exponent)
        return max(1, int((self.total_xp / XP_BASE) ** (1 / XP_EXPONENT)))
    
    @property
    def xp_for_current_level(self) -> int:
        """XP required to reach current level."""
        return int(XP_BASE * (self.level ** XP_EXPONENT))
    
    @property
    def xp_for_next_level(self) -> int:
        """XP required to reach next level."""
        return int(XP_BASE * ((self.level + 1) ** XP_EXPONENT))
    
    @property
    def xp_progress(self) -> int:
        """XP earned toward next level."""
        return self.total_xp - self.xp_for_current_level
    
    @property
    def xp_needed(self) -> int:
        """XP needed for next level."""
        return self.xp_for_next_level - self.xp_for_current_level
    
    @property
    def progress_percent(self) -> float:
        """Progress to next level as percentage."""
        needed = self.xp_needed
        if needed <= 0:
            return 100.0
        return min(100.0, (self.xp_progress / needed) * 100)
    
    @property
    def rank_title(self) -> str:
        """Get rank title for current level."""
        title = "Pawn"
        for req_level, req_title in sorted(RANK_TITLES.items()):
            if self.level >= req_level:
                title = req_title
            else:
                break
        return title
    
    @property
    def win_rate(self) -> float:
        """Calculate win rate percentage."""
        if self.matches_played == 0:
            return 0.0
        return (self.matches_won / self.matches_played) * 100
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "user_id": self.user_id,
            "total_xp": self.total_xp,
            "matches_played": self.matches_played,
            "matches_won": self.matches_won,
            "stream_minutes": self.stream_minutes,
            "events_attended": self.events_attended,
            "joined_at": self.joined_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "PlayerStats":
        """Deserialize from dictionary."""
        return cls(
            user_id=data["user_id"],
            total_xp=data.get("total_xp", 0),
            matches_played=data.get("matches_played", 0),
            matches_won=data.get("matches_won", 0),
            stream_minutes=data.get("stream_minutes", 0),
            events_attended=data.get("events_attended", 0),
            joined_at=datetime.fromisoformat(data.get("joined_at", datetime.now().isoformat())),
        )


# ─────────────────────────────────────────────────────────────────
# Progress Bar Generator
# ─────────────────────────────────────────────────────────────────

def create_progress_bar(percent: float, length: int = 10) -> str:
    """Create a visual progress bar using block characters."""
    filled = int((percent / 100) * length)
    empty = length - filled
    
    # Use fancy block characters
    bar = "█" * filled + "░" * empty
    return f"[{bar}]"


# ─────────────────────────────────────────────────────────────────
# Main Cog
# ─────────────────────────────────────────────────────────────────

class ProgressionCog(commands.Cog, name="Progression"):
    """Leveling System - Track your rise through the ranks.
    
    Count Lucian rewards those who prove their worth.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Progression cog."""
        self.bot = bot
        self._stats: Dict[int, PlayerStats] = {}
        self._data_file = str(DATA_DIR / "player_stats.json")
        
        # Load existing data
        self._load_data()
        
        logger.info("ProgressionCog loaded - The ranks await")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    # ─────────────────────────────────────────────────────────────────
    # Data Persistence
    # ─────────────────────────────────────────────────────────────────
    
    def _load_data(self) -> None:
        """Load player stats from file."""
        os.makedirs(DATA_DIR, exist_ok=True)
        
        if os.path.exists(self._data_file):
            try:
                with open(self._data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                for user_id_str, stats_dict in data.items():
                    user_id = int(user_id_str)
                    self._stats[user_id] = PlayerStats.from_dict(stats_dict)
                
                logger.info(f"Loaded {len(self._stats)} player records")
            except Exception as e:
                logger.error(f"Failed to load progression data: {e}")
    
    def _save_data(self) -> None:
        """Save player stats to file."""
        os.makedirs(DATA_DIR, exist_ok=True)
        
        try:
            data = {
                str(user_id): stats.to_dict()
                for user_id, stats in self._stats.items()
            }
            with open(self._data_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save progression data: {e}")
    
    # ─────────────────────────────────────────────────────────────────
    # Helper Methods
    # ─────────────────────────────────────────────────────────────────
    
    def _get_or_create_stats(self, user_id: int) -> PlayerStats:
        """Get player stats, creating if needed."""
        if user_id not in self._stats:
            self._stats[user_id] = PlayerStats(user_id=user_id)
            self._save_data()
        return self._stats[user_id]
    
    def award_xp(
        self, 
        user_id: int, 
        amount: int, 
        source: XPSource,
        description: str = ""
    ) -> tuple[int, bool]:
        """Award XP to a player.
        
        Returns:
            (new_total_xp, did_level_up)
        """
        stats = self._get_or_create_stats(user_id)
        old_level = stats.level
        
        stats.total_xp += amount
        stats.history.append(XPTransaction(amount, source, description=description))
        
        # Track source-specific stats
        if source == XPSource.MATCH:
            stats.matches_played += 1
        elif source == XPSource.WIN:
            stats.matches_won += 1
        elif source == XPSource.EVENT:
            stats.events_attended += 1
        
        new_level = stats.level
        self._save_data()
        
        return stats.total_xp, new_level > old_level
    
    def award_stream_xp(self, user_id: int, minutes: int) -> tuple[int, bool]:
        """Award XP for stream watching."""
        stats = self._get_or_create_stats(user_id)
        stats.stream_minutes += minutes
        
        amount = minutes * XP_STREAM_MINUTE
        return self.award_xp(user_id, amount, XPSource.STREAM, f"{minutes} minutes watched")
    
    # ─────────────────────────────────────────────────────────────────
    # Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(
        name="rank",
        aliases=["elo", "level", "xp"]
    )
    @app_commands.describe(user="The user to check (defaults to yourself)")
    async def rank(
        self, 
        ctx: commands.Context, 
        user: Optional[discord.Member] = None
    ) -> None:
        """Display your rank card showing level, XP, and stats."""
        target = user or ctx.author
        if not isinstance(target, (discord.Member, discord.User)):
            return
        
        stats = self._get_or_create_stats(target.id)
        
        # Build rank card embed
        embed = discord.Embed(
            title=f"🏆 {stats.rank_title}",
            description=f"{target.mention}'s progression",
            color=LUCIAN_GOLD
        )
        
        # Avatar
        embed.set_thumbnail(url=target.display_avatar.url)
        
        # Level & Progress
        progress_bar = create_progress_bar(stats.progress_percent, 15)
        embed.add_field(
            name=f"Level {stats.level}",
            value=f"{progress_bar}\n`{stats.xp_progress:,}` / `{stats.xp_needed:,}` XP",
            inline=False
        )
        
        # Total XP
        embed.add_field(name="Total XP", value=f"`{stats.total_xp:,}`", inline=True)
        
        # Next rank
        next_title = None
        for req_level, title in sorted(RANK_TITLES.items()):
            if req_level > stats.level:
                next_title = f"{title} (Lv.{req_level})"
                break
        
        if next_title:
            embed.add_field(name="Next Rank", value=next_title, inline=True)
        else:
            embed.add_field(name="Next Rank", value="MAX", inline=True)
        
        # Stats
        embed.add_field(
            name="📊 Statistics",
            value=(
                f"**Matches:** {stats.matches_played}\n"
                f"**Wins:** {stats.matches_won}\n"
                f"**Win Rate:** {stats.win_rate:.1f}%\n"
                f"**Stream Time:** {stats.stream_minutes} min"
            ),
            inline=False
        )
        
        # Footer with join date
        days = (datetime.now() - stats.joined_at).days
        embed.set_footer(text=f"Member for {days} days | Events: {stats.events_attended}")
        
        await ctx.send(embed=embed)
    
    @commands.hybrid_command(
        name="leaderboard",
        aliases=["lb", "top"]
    )
    @app_commands.describe(count="Number of players to show (1-25)")
    async def leaderboard(
        self, 
        ctx: commands.Context, 
        count: int = 10
    ) -> None:
        """Show the top players by XP."""
        count = max(1, min(25, count))  # Clamp 1-25
        
        if not self._stats:
            await ctx.send(self._lucian_speak(
                "No warriors have yet proven themselves."
            ))
            return
        
        # Sort by XP descending
        sorted_players = sorted(
            self._stats.values(),
            key=lambda s: s.total_xp,
            reverse=True
        )[:count]
        
        embed = discord.Embed(
            title="🏆 Leaderboard",
            description=f"Top {len(sorted_players)} Warriors",
            color=LUCIAN_GOLD
        )
        
        # Medal emojis for top 3
        medals = ["🥇", "🥈", "🥉"]
        
        lines = []
        for i, stats in enumerate(sorted_players):
            user = self.bot.get_user(stats.user_id)
            name = user.display_name if user else f"User {stats.user_id}"
            
            prefix = medals[i] if i < 3 else f"`{i+1}.`"
            lines.append(
                f"{prefix} **{name}** — Lv.{stats.level} `{stats.total_xp:,} XP`"
            )
        
        embed.description = "\n".join(lines)
        await ctx.send(embed=embed)
    
    # ─────────────────────────────────────────────────────────────────
    # Admin Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="grantxp")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        user="The user to grant XP to",
        amount="Amount of XP to grant",
        reason="Reason for the XP grant"
    )
    async def grantxp(
        self,
        ctx: commands.Context,
        user: discord.Member,
        amount: int,
        *,
        reason: str = "Admin grant"
    ) -> None:
        """(Admin) Grant XP to a user."""
        new_total, leveled_up = self.award_xp(
            user.id, 
            amount, 
            XPSource.ADMIN, 
            reason
        )
        
        level_msg = " **LEVEL UP!**" if leveled_up else ""
        await ctx.send(self._lucian_speak(
            f"Granted {amount} XP to {user.mention}. Total: {new_total:,}{level_msg}"
        ))
        
        logger.info(f"Admin {ctx.author} granted {amount} XP to {user}. Reason: {reason}")
    
    @commands.hybrid_command(name="setlevel")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        user="The user to set level for",
        level="The target level"
    )
    async def setlevel(
        self,
        ctx: commands.Context,
        user: discord.Member,
        level: int
    ) -> None:
        """(Admin) Set a user's level directly."""
        if level < 1:
            await ctx.send(self._lucian_speak("Level must be at least 1."))
            return
        
        stats = self._get_or_create_stats(user.id)
        
        # Calculate XP needed for target level
        target_xp = int(XP_BASE * (level ** XP_EXPONENT))
        stats.total_xp = target_xp
        self._save_data()
        
        await ctx.send(self._lucian_speak(
            f"Set {user.mention} to Level {level} ({target_xp:,} XP)"
        ))
        
        logger.info(f"Admin {ctx.author} set {user} to level {level}")
    
    # ─────────────────────────────────────────────────────────────────
    # Public API for other cogs
    # ─────────────────────────────────────────────────────────────────
    
    async def on_match_complete(
        self, 
        player_a: int, 
        player_b: int, 
        winner: Optional[int] = None
    ) -> None:
        """Called when a match completes. Awards XP to both players."""
        # Award match completion XP
        self.award_xp(player_a, XP_MATCH_COMPLETE, XPSource.MATCH, "Match completed")
        self.award_xp(player_b, XP_MATCH_COMPLETE, XPSource.MATCH, "Match completed")
        
        # Award win bonus
        if winner:
            self.award_xp(winner, XP_WIN_BONUS, XPSource.WIN, "Victory bonus")
        
        logger.info(f"Match XP awarded: {player_a} and {player_b}, winner: {winner}")
    
    async def on_event_participation(self, user_id: int, event_name: str) -> None:
        """Called when a user participates in a club event."""
        self.award_xp(user_id, XP_CLUB_EVENT, XPSource.EVENT, f"Event: {event_name}")
        logger.info(f"Event XP awarded to {user_id} for {event_name}")
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @rank.error
    @leaderboard.error
    @grantxp.error
    @setlevel.error
    async def progression_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle progression command errors."""
        if isinstance(error, commands.MissingPermissions):
            await ctx.send(self._lucian_speak(
                "You lack the authority for this command."
            ), ephemeral=True)
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing argument: `{error.param.name}`"
            ), ephemeral=True)
        else:
            logger.error(f"Progression error: {error}")
            await ctx.send(self._lucian_speak(
                "An error has occurred in the progression system."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(ProgressionCog(bot))
    logger.info("Progression cog setup complete")
