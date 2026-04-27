"""FateCog - The Tabletop/DnD System.

Tools for running tabletop games alongside chess events.
Dice rolling, coin flipping, and turn order management.

Commands:
    !roll <dice>    - Roll dice (e.g., 2d6+3, d20, 4d8-2)
    !flip           - Flip a coin (heads/tails)
    !turn           - Manage turn order for encounters
"""

from __future__ import annotations

import random
import re
from datetime import datetime
from typing import Optional, List, Dict, TYPE_CHECKING
from dataclasses import dataclass, field

import discord
from discord import app_commands
from discord.ext import commands

from src.utils.logger import get_logger

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────

LUCIAN_RED = 0x880000
LUCIAN_GOLD = 0xD4AF37
LUCIAN_PURPLE = 0x4A0080

# Dice notation regex: captures count, sides, modifier
# Examples: d20, 2d6, 4d8+3, d12-1
DICE_PATTERN = re.compile(
    r"^(\d*)d(\d+)([+-]\d+)?$",
    re.IGNORECASE
)

# Maximum values to prevent abuse
MAX_DICE_COUNT = 100
MAX_DICE_SIDES = 1000
MAX_MODIFIER = 1000


# ─────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────

@dataclass
class DiceRoll:
    """Result of a dice roll."""
    expression: str
    count: int
    sides: int
    modifier: int
    rolls: List[int] = field(default_factory=list)
    
    @property
    def subtotal(self) -> int:
        """Sum of dice without modifier."""
        return sum(self.rolls)
    
    @property
    def total(self) -> int:
        """Final total including modifier."""
        return self.subtotal + self.modifier
    
    @property
    def is_critical(self) -> bool:
        """Check if any die rolled max value."""
        return self.sides in self.rolls
    
    @property
    def is_fumble(self) -> bool:
        """Check if any die rolled 1."""
        return 1 in self.rolls
    
    def format_rolls(self) -> str:
        """Format individual rolls for display."""
        if len(self.rolls) <= 20:
            formatted = []
            for r in self.rolls:
                if r == self.sides:
                    formatted.append(f"**{r}**")  # Highlight max
                elif r == 1:
                    formatted.append(f"~~{r}~~")  # Strikethrough 1s
                else:
                    formatted.append(str(r))
            return " + ".join(formatted)
        else:
            # Too many dice, summarize
            return f"{len(self.rolls)} dice, sum: {self.subtotal}"


@dataclass
class TurnParticipant:
    """A participant in turn order."""
    name: str
    initiative: int
    user_id: Optional[int] = None
    is_npc: bool = False


@dataclass
class TurnTracker:
    """Tracks turn order for a channel."""
    channel_id: int
    participants: List[TurnParticipant] = field(default_factory=list)
    current_index: int = 0
    round_number: int = 1
    started: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def current(self) -> Optional[TurnParticipant]:
        """Get current participant."""
        if not self.participants:
            return None
        return self.participants[self.current_index % len(self.participants)]
    
    def sort_by_initiative(self) -> None:
        """Sort participants by initiative (descending)."""
        self.participants.sort(key=lambda p: p.initiative, reverse=True)
    
    def advance(self) -> Optional[TurnParticipant]:
        """Advance to next turn, returns new current."""
        if not self.participants:
            return None
        self.current_index += 1
        if self.current_index >= len(self.participants):
            self.current_index = 0
            self.round_number += 1
        return self.current


# ─────────────────────────────────────────────────────────────────
# Dice Parser
# ─────────────────────────────────────────────────────────────────

def parse_dice(expression: str) -> Optional[DiceRoll]:
    """Parse a dice expression like '2d6+3'.
    
    Returns:
        DiceRoll object or None if invalid.
    """
    # Clean up expression
    expression = expression.strip().lower().replace(" ", "")
    
    match = DICE_PATTERN.match(expression)
    if not match:
        return None
    
    count_str, sides_str, mod_str = match.groups()
    
    # Parse values
    count = int(count_str) if count_str else 1
    sides = int(sides_str)
    modifier = int(mod_str) if mod_str else 0
    
    # Validate limits
    if count < 1 or count > MAX_DICE_COUNT:
        return None
    if sides < 2 or sides > MAX_DICE_SIDES:
        return None
    if abs(modifier) > MAX_MODIFIER:
        return None
    
    # Roll the dice
    rolls = [random.randint(1, sides) for _ in range(count)]
    
    return DiceRoll(
        expression=expression,
        count=count,
        sides=sides,
        modifier=modifier,
        rolls=rolls
    )


# ─────────────────────────────────────────────────────────────────
# Turn Order View (Buttons)
# ─────────────────────────────────────────────────────────────────

class TurnOrderView(discord.ui.View):
    """Interactive controls for turn order."""
    
    def __init__(self, cog: FateCog, channel_id: int):
        super().__init__(timeout=3600)  # 1 hour timeout
        self.cog = cog
        self.channel_id = channel_id
    
    @discord.ui.button(label="Next Turn", style=discord.ButtonStyle.primary, emoji="⏭️")
    async def next_turn(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Advance to next turn."""
        tracker = self.cog._trackers.get(self.channel_id)
        if not tracker or not tracker.started:
            await interaction.response.send_message(
                "Turn order not active.", ephemeral=True
            )
            return
        
        next_p = tracker.advance()
        if not next_p:
            await interaction.response.send_message(
                "No participants in turn order.", ephemeral=True
            )
            return
        mention = f"<@{next_p.user_id}>" if next_p.user_id else f"**{next_p.name}**"
        
        await interaction.response.send_message(
            f"🎲 Round {tracker.round_number} — {mention}'s turn! (Init: {next_p.initiative})"
        )
    
    @discord.ui.button(label="Show Order", style=discord.ButtonStyle.secondary, emoji="📋")
    async def show_order(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Display full turn order."""
        tracker = self.cog._trackers.get(self.channel_id)
        if not tracker:
            await interaction.response.send_message(
                "No turn order exists.", ephemeral=True
            )
            return
        
        embed = self.cog._build_order_embed(tracker)
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @discord.ui.button(label="End Combat", style=discord.ButtonStyle.danger, emoji="🛑")
    async def end_combat(self, interaction: discord.Interaction, button: discord.ui.Button):
        """End the turn tracker."""
        if self.channel_id in self.cog._trackers:
            del self.cog._trackers[self.channel_id]
        
        await interaction.response.send_message(
            "🧛 *The battle concludes. Turn order cleared.*"
        )
        self.stop()


# ─────────────────────────────────────────────────────────────────
# Main Cog
# ─────────────────────────────────────────────────────────────────

class FateCog(commands.Cog, name="Fate"):
    """Tabletop Tools - Dice, coins, and turn order.
    
    Count Lucian fancies games of chance.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Fate cog."""
        self.bot = bot
        
        # Turn trackers per channel
        self._trackers: Dict[int, TurnTracker] = {}
        
        logger.info("FateCog loaded - Let fate decide")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    # ─────────────────────────────────────────────────────────────────
    # Helper Methods
    # ─────────────────────────────────────────────────────────────────
    
    def _build_order_embed(self, tracker: TurnTracker) -> discord.Embed:
        """Build embed showing turn order."""
        embed = discord.Embed(
            title="⚔️ Turn Order",
            description=f"Round {tracker.round_number}",
            color=LUCIAN_PURPLE
        )
        
        lines = []
        for i, p in enumerate(tracker.participants):
            pointer = "➤ " if i == tracker.current_index and tracker.started else "  "
            name = f"<@{p.user_id}>" if p.user_id else p.name
            npc_tag = " (NPC)" if p.is_npc else ""
            lines.append(f"{pointer}`{p.initiative:3d}` {name}{npc_tag}")
        
        embed.description = "\n".join(lines) if lines else "No participants"
        return embed
    
    # ─────────────────────────────────────────────────────────────────
    # Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="roll")
    @app_commands.describe(
        dice="Dice notation (e.g., d20, 2d6+3, 4d8-2)",
        reason="Optional label for the roll"
    )
    async def roll(
        self, 
        ctx: commands.Context, 
        dice: str,
        *,
        reason: Optional[str] = None
    ) -> None:
        """Roll dice using standard notation (e.g., 2d6+3)."""
        result = parse_dice(dice)
        
        if result is None:
            await ctx.send(self._lucian_speak(
                f"Invalid dice notation: `{dice}`. Try `d20`, `2d6+3`, `4d8-2`."
            ))
            return
        
        # Build result embed
        embed = discord.Embed(
            title="🎲 Dice Roll",
            color=LUCIAN_PURPLE
        )
        
        # Add reason if provided
        if reason:
            embed.description = f"*{reason}*"
        
        # Show expression
        mod_str = ""
        if result.modifier > 0:
            mod_str = f" + {result.modifier}"
        elif result.modifier < 0:
            mod_str = f" - {abs(result.modifier)}"
        
        embed.add_field(
            name="Expression",
            value=f"`{result.count}d{result.sides}{mod_str}`",
            inline=True
        )
        
        # Show total with visual flair for criticals
        total_str = f"**{result.total}**"
        if result.is_critical and result.count == 1 and result.sides == 20:
            total_str = f"💥 **CRITICAL! {result.total}**"
        elif result.is_fumble and result.count == 1 and result.sides == 20:
            total_str = f"💀 **FUMBLE! {result.total}**"
        
        embed.add_field(
            name="Total",
            value=total_str,
            inline=True
        )
        
        # Show individual rolls
        embed.add_field(
            name="Rolls",
            value=result.format_rolls(),
            inline=False
        )
        
        embed.set_footer(text=f"Rolled by {ctx.author.display_name}")
        
        await ctx.send(embed=embed)
    
    @commands.hybrid_command(name="flip")
    @app_commands.describe(count="Number of coins to flip (1-10)")
    async def flip(self, ctx: commands.Context, count: int = 1) -> None:
        """Flip a coin (or multiple coins)."""
        count = max(1, min(10, count))  # Clamp 1-10
        
        results = [random.choice(["Heads", "Tails"]) for _ in range(count)]
        
        embed = discord.Embed(
            title="🪙 Coin Flip",
            color=LUCIAN_GOLD
        )
        
        if count == 1:
            result = results[0]
            emoji = "🌕" if result == "Heads" else "🌑"
            embed.description = f"{emoji} **{result}**"
        else:
            heads = results.count("Heads")
            tails = results.count("Tails")
            
            embed.add_field(
                name="Results",
                value=" ".join("🌕" if r == "Heads" else "🌑" for r in results),
                inline=False
            )
            embed.add_field(name="Heads", value=str(heads), inline=True)
            embed.add_field(name="Tails", value=str(tails), inline=True)
        
        embed.set_footer(text=f"Flipped by {ctx.author.display_name}")
        
        await ctx.send(embed=embed)
    
    # ─────────────────────────────────────────────────────────────────
    # Turn Order Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_group(name="turn", invoke_without_command=True)
    async def turn(self, ctx: commands.Context) -> None:
        """Turn order management. Subcommands: new, add, roll, start, next, list, end."""
        await ctx.send(self._lucian_speak(
            "Subcommands: `new`, `add <name> <init>`, `roll`, `start`, `next`, `list`, `end`"
        ))
    
    @turn.command(name="new")
    async def turn_new(self, ctx: commands.Context) -> None:
        """Create a new turn order tracker for this channel."""
        channel_id = ctx.channel.id
        
        if channel_id in self._trackers:
            await ctx.send(self._lucian_speak(
                "A turn tracker already exists. Use `!turn end` first."
            ))
            return
        
        self._trackers[channel_id] = TurnTracker(channel_id=channel_id)
        
        await ctx.send(self._lucian_speak(
            "Turn tracker created. Add participants with `!turn add <name> <initiative>` "
            "or `!turn roll` to roll initiative for yourself."
        ))
    
    @turn.command(name="add")
    @app_commands.describe(
        name="Name of the participant (or NPC)",
        initiative="Initiative value",
        is_npc="Mark as NPC (default: False)"
    )
    async def turn_add(
        self,
        ctx: commands.Context,
        name: str,
        initiative: int,
        is_npc: bool = False
    ) -> None:
        """Add a participant with a fixed initiative value."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker:
            await ctx.send(self._lucian_speak(
                "No turn tracker exists. Use `!turn new` first."
            ))
            return
        
        if tracker.started:
            await ctx.send(self._lucian_speak(
                "Cannot add participants after combat has started."
            ))
            return
        
        # Determine user_id if it's a player adding themselves
        user_id = None if is_npc else ctx.author.id
        
        participant = TurnParticipant(
            name=name,
            initiative=initiative,
            user_id=user_id,
            is_npc=is_npc
        )
        tracker.participants.append(participant)
        
        npc_tag = " (NPC)" if is_npc else ""
        await ctx.send(self._lucian_speak(
            f"Added **{name}**{npc_tag} with initiative {initiative}."
        ))
    
    @turn.command(name="roll")
    @app_commands.describe(modifier="Initiative modifier (e.g., +3, -1)")
    async def turn_roll(
        self, 
        ctx: commands.Context, 
        modifier: int = 0
    ) -> None:
        """Roll initiative (d20 + modifier) and add yourself to the tracker."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker:
            await ctx.send(self._lucian_speak(
                "No turn tracker exists. Use `!turn new` first."
            ))
            return
        
        if tracker.started:
            await ctx.send(self._lucian_speak(
                "Cannot join after combat has started."
            ))
            return
        
        # Check if already in tracker
        existing = next((p for p in tracker.participants if p.user_id == ctx.author.id), None)
        if existing:
            await ctx.send(self._lucian_speak(
                f"You're already in the tracker with initiative {existing.initiative}."
            ), ephemeral=True)
            return
        
        # Roll d20 + modifier
        roll = random.randint(1, 20)
        initiative = roll + modifier
        
        participant = TurnParticipant(
            name=ctx.author.display_name,
            initiative=initiative,
            user_id=ctx.author.id,
            is_npc=False
        )
        tracker.participants.append(participant)
        
        mod_str = f"+{modifier}" if modifier >= 0 else str(modifier)
        await ctx.send(self._lucian_speak(
            f"{ctx.author.mention} rolled **{roll}** ({mod_str}) = **{initiative}** initiative!"
        ))
    
    @turn.command(name="start")
    async def turn_start(self, ctx: commands.Context) -> None:
        """Start combat and sort by initiative."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker:
            await ctx.send(self._lucian_speak(
                "No turn tracker exists. Use `!turn new` first."
            ))
            return
        
        if tracker.started:
            await ctx.send(self._lucian_speak("Combat has already begun."))
            return
        
        if not tracker.participants:
            await ctx.send(self._lucian_speak(
                "No participants! Use `!turn add` or `!turn roll`."
            ))
            return
        
        # Sort and start
        tracker.sort_by_initiative()
        tracker.started = True
        
        current = tracker.current
        if not current:
            await ctx.send(self._lucian_speak("No participants in tracker."))
            return
        mention = f"<@{current.user_id}>" if current.user_id else f"**{current.name}**"
        
        embed = self._build_order_embed(tracker)
        embed.set_footer(text="Use buttons or !turn next to advance")
        
        view = TurnOrderView(self, channel_id)
        
        await ctx.send(
            f"⚔️ **Combat begins!** {mention} acts first!",
            embed=embed,
            view=view
        )
    
    @turn.command(name="next")
    async def turn_next(self, ctx: commands.Context) -> None:
        """Advance to the next turn."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker or not tracker.started:
            await ctx.send(self._lucian_speak("Combat has not started."))
            return
        
        next_p = tracker.advance()
        if not next_p:
            await ctx.send(self._lucian_speak("No participants remain in combat."))
            return
        mention = f"<@{next_p.user_id}>" if next_p.user_id else f"**{next_p.name}**"
        
        await ctx.send(
            f"🎲 Round {tracker.round_number} — {mention}'s turn! (Init: {next_p.initiative})"
        )
    
    @turn.command(name="list")
    async def turn_list(self, ctx: commands.Context) -> None:
        """Show the current turn order."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker:
            await ctx.send(self._lucian_speak("No turn tracker exists."))
            return
        
        embed = self._build_order_embed(tracker)
        await ctx.send(embed=embed)
    
    @turn.command(name="end")
    async def turn_end(self, ctx: commands.Context) -> None:
        """End combat and clear the turn tracker."""
        channel_id = ctx.channel.id
        
        if channel_id in self._trackers:
            del self._trackers[channel_id]
            await ctx.send(self._lucian_speak(
                "The battle concludes. Turn order cleared."
            ))
        else:
            await ctx.send(self._lucian_speak("No turn tracker to end."))
    
    @turn.command(name="remove")
    @app_commands.describe(name="Name of participant to remove")
    async def turn_remove(self, ctx: commands.Context, *, name: str) -> None:
        """Remove a participant from turn order."""
        channel_id = ctx.channel.id
        tracker = self._trackers.get(channel_id)
        
        if not tracker:
            await ctx.send(self._lucian_speak("No turn tracker exists."))
            return
        
        # Find and remove
        for i, p in enumerate(tracker.participants):
            if p.name.lower() == name.lower():
                tracker.participants.pop(i)
                await ctx.send(self._lucian_speak(f"**{p.name}** has fallen."))
                return
        
        await ctx.send(self._lucian_speak(f"No participant named '{name}' found."))
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @roll.error
    @flip.error
    @turn.error
    async def fate_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle fate command errors."""
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing argument: `{error.param.name}`"
            ), ephemeral=True)
        else:
            logger.error(f"Fate error: {error}")
            await ctx.send(self._lucian_speak(
                "Fate refused to answer."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(FateCog(bot))
    logger.info("Fate cog setup complete")
