"""JesterCog - Entertainment Commands for the Masses.

The lighter side of Count Lucian's domain - memes and roasts.
Because even vampires need to mock mortals.

Commands:
    !meme auto       - Start automatic meme posting
    !meme stop       - Stop automatic meme posting
    !roast [target]  - Roast a user, PGN, or current position
"""

from __future__ import annotations

import asyncio
import io
from typing import Optional, Dict, TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands, tasks

from src.utils.logger import get_logger
from src.discord.services import BridgeService, DriveService

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# Lucian's color palette
LUCIAN_RED = 0x880000

# Default meme interval in seconds
DEFAULT_MEME_INTERVAL = 300  # 5 minutes


class MemeTask:
    """Represents an active auto-meme task."""
    
    def __init__(
        self,
        channel_id: int,
        folder_id: str,
        interval: int,
        category: str
    ) -> None:
        self.channel_id = channel_id
        self.folder_id = folder_id
        self.interval = interval
        self.category = category
        self.task: Optional[asyncio.Task] = None
        self.running = False


class JesterCog(commands.Cog, name="Jester"):
    """Entertainment - Memes and roasts for the mortals.
    
    Count Lucian finds amusement in mortal suffering.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Jester cog.
        
        Args:
            bot: The LiquidChess bot instance
        """
        self.bot = bot
        self.bridge: BridgeService = BridgeService()
        self.drive: DriveService = DriveService()
        
        # Track active meme tasks per guild
        self._meme_tasks: Dict[int, MemeTask] = {}  # guild_id -> MemeTask
        
        # Category to folder ID mapping (configure in settings)
        self._folder_mapping: Dict[str, str] = {
            "chess": "mock_chess_folder_id",
            "blunders": "mock_blunder_folder_id", 
            "memes": "mock_general_folder_id",
            "default": "mock_default_folder_id"
        }
        
        logger.info("JesterCog loaded - Let the mockery begin")
    
    async def cog_unload(self) -> None:
        """Clean up when cog is unloaded."""
        for guild_id, meme_task in self._meme_tasks.items():
            if meme_task.task and not meme_task.task.done():
                meme_task.task.cancel()
                logger.info(f"Meme task cancelled for guild {guild_id}")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    # ─────────────────────────────────────────────────────────────────
    # Meme Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_group(name="meme", invoke_without_command=True, description="Meme management commands")
    async def meme(self, ctx: commands.Context) -> None:
        """Meme management commands.
        
        Usage:
            !meme auto [category] [interval] [#channel]
            !meme stop
            !meme now [category]
        """
        await ctx.send(self._lucian_speak(
            "Subcommands: `auto`, `stop`, `now`. "
            "Choose your entertainment."
        ))
    
    @meme.command(name="auto")
    @app_commands.choices(category=[
        app_commands.Choice(name="Chess", value="chess"),
        app_commands.Choice(name="Blunders", value="blunders"),
        app_commands.Choice(name="Memes", value="memes"),
        app_commands.Choice(name="Default", value="default"),
    ])
    async def meme_auto(
        self,
        ctx: commands.Context,
        category: str = "default",
        interval: int = DEFAULT_MEME_INTERVAL,
        channel: Optional[discord.TextChannel] = None
    ) -> None:
        """Start automatic meme posting.
        
        Args:
            ctx: Command context
            category: Meme category (chess, blunders, memes)
            interval: Seconds between posts (default 300)
            channel: Target channel (default: current)
        """
        if not ctx.guild:
            await ctx.send(self._lucian_speak(
                "Auto-meme requires a guild. Not here."
            ))
            return
        
        guild_id = ctx.guild.id
        target_channel = channel or ctx.channel
        
        # Check if already running
        if guild_id in self._meme_tasks and self._meme_tasks[guild_id].running:
            await ctx.send(self._lucian_speak(
                "The meme fountain already flows. "
                "Use `!meme stop` first to change it."
            ))
            return
        
        # Validate interval
        if interval < 60:
            await ctx.send(self._lucian_speak(
                "Minimum interval is 60 seconds. "
                "Even I need time between jests."
            ))
            return
        
        if interval > 86400:  # 24 hours
            await ctx.send(self._lucian_speak(
                "Maximum interval is 24 hours. "
                "I am patient, but not that patient."
            ))
            return
        
        # Get folder ID for category
        folder_id = self._folder_mapping.get(
            category.lower(), 
            self._folder_mapping["default"]
        )
        
        # Create meme task
        meme_task = MemeTask(
            channel_id=target_channel.id,
            folder_id=folder_id,
            interval=interval,
            category=category
        )
        
        # Start the task
        meme_task.task = asyncio.create_task(
            self._meme_loop(guild_id, meme_task)
        )
        meme_task.running = True
        self._meme_tasks[guild_id] = meme_task
        
        # Get channel display name safely
        channel_display = f"<#{target_channel.id}>"
        channel_name = getattr(target_channel, 'name', str(target_channel.id))
        
        embed = discord.Embed(
            title="🎭 Meme Engine Activated",
            description=f"Category: **{category}**",
            color=LUCIAN_RED
        )
        embed.add_field(
            name="Interval", 
            value=f"{interval} seconds ({interval // 60}m)", 
            inline=True
        )
        embed.add_field(
            name="Channel", 
            value=channel_display, 
            inline=True
        )
        embed.set_footer(text="Use !meme stop to cease the flood")
        
        await ctx.send(embed=embed)
        logger.info(
            f"Meme auto started: {category} every {interval}s "
            f"in {channel_name} ({guild_id})"
        )
    
    @meme.command(name="stop")
    async def meme_stop(self, ctx: commands.Context) -> None:
        """Stop automatic meme posting."""
        if not ctx.guild:
            return
        
        guild_id = ctx.guild.id
        
        if guild_id not in self._meme_tasks or not self._meme_tasks[guild_id].running:
            await ctx.send(self._lucian_speak(
                "No memes are being dispensed. The fountain is dry."
            ))
            return
        
        meme_task = self._meme_tasks[guild_id]
        
        if meme_task.task and not meme_task.task.done():
            meme_task.task.cancel()
        
        meme_task.running = False
        del self._meme_tasks[guild_id]
        
        await ctx.send(self._lucian_speak(
            "The meme fountain has been silenced. "
            "Peace... for now."
        ))
        logger.info(f"Meme auto stopped for guild {guild_id}")
    
    @meme.command(name="now")
    @app_commands.choices(category=[
        app_commands.Choice(name="Chess", value="chess"),
        app_commands.Choice(name="Blunders", value="blunders"),
        app_commands.Choice(name="Memes", value="memes"),
        app_commands.Choice(name="Default", value="default"),
    ])
    async def meme_now(
        self, 
        ctx: commands.Context, 
        category: str = "default"
    ) -> None:
        """Post a meme immediately.
        
        Args:
            ctx: Command context
            category: Meme category
        """
        # Ensure we're in a text channel
        if not isinstance(ctx.channel, discord.TextChannel):
            await ctx.send(self._lucian_speak(
                "Memes must flow through a proper text channel."
            ))
            return
        
        folder_id = self._folder_mapping.get(
            category.lower(),
            self._folder_mapping["default"]
        )
        
        await self._send_random_meme(ctx.channel, folder_id)
    
    async def _meme_loop(self, guild_id: int, meme_task: MemeTask) -> None:
        """Background loop for auto-meme posting.
        
        Args:
            guild_id: Guild ID
            meme_task: MemeTask configuration
        """
        await asyncio.sleep(5)  # Initial delay
        
        while meme_task.running:
            try:
                channel = self.bot.get_channel(meme_task.channel_id)
                
                if channel and isinstance(channel, discord.TextChannel):
                    await self._send_random_meme(channel, meme_task.folder_id)
                else:
                    logger.warning(f"Channel {meme_task.channel_id} not found")
                    meme_task.running = False
                    break
                
                await asyncio.sleep(meme_task.interval)
                
            except asyncio.CancelledError:
                logger.info(f"Meme loop cancelled for guild {guild_id}")
                break
            except Exception as e:
                logger.error(f"Meme loop error: {e}")
                await asyncio.sleep(60)  # Back off on error
    
    async def _send_random_meme(
        self, 
        channel: discord.TextChannel, 
        folder_id: str
    ) -> None:
        """Send a random meme from the folder.
        
        Args:
            channel: Target channel
            folder_id: Google Drive folder ID
        """
        try:
            data, filename = await self.drive.get_random_file_as_bytes(folder_id)
            
            if data and filename:
                file = discord.File(data, filename=filename)
                await channel.send(
                    self._lucian_speak("A visual offering for the masses."),
                    file=file
                )
            else:
                # Mock mode - just send a message
                meme_file = await self.drive.get_random_file(folder_id)
                if meme_file:
                    await channel.send(
                        self._lucian_speak(
                            f"*[Mock Mode]* Would display: **{meme_file.name}**"
                        )
                    )
                else:
                    logger.warning("No memes available in folder")
                    
        except Exception as e:
            logger.error(f"Failed to send meme: {e}")
    
    # ─────────────────────────────────────────────────────────────────
    # Roast Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="roast", description="Roast a target with Count Lucian's wit")
    async def roast(
        self, 
        ctx: commands.Context, 
        *, 
        target: Optional[str] = None
    ) -> None:
        """Roast a target with Count Lucian's wit.
        
        Targets:
            @User   - Roast based on their stats (mock)
            PGN     - Analyze and roast a game
            (empty) - Roast the current live position
        
        Args:
            ctx: Command context
            target: User mention, PGN, or empty
        """
        async with ctx.typing():
            # Case 1: No target - use current live FEN
            if not target:
                await self._roast_live_position(ctx)
                return
            
            # Case 2: User mention
            if target.startswith("<@"):
                await self._roast_user(ctx, target)
                return
            
            # Case 3: PGN (detect by looking for move notation)
            if self._looks_like_pgn(target):
                await self._roast_pgn(ctx, target)
                return
            
            # Unknown target
            await ctx.send(self._lucian_speak(
                "I know not how to roast this. "
                "Give me a @user, a PGN, or nothing at all."
            ))
    
    async def _roast_live_position(self, ctx: commands.Context) -> None:
        """Roast the current live position."""
        state = await self.bridge.get_current_state()
        
        if not state:
            await ctx.send(self._lucian_speak(
                "There is no live game to mock. "
                "Start one with `!live` first."
            ))
            return
        
        # Get roast commentary
        roast = await self.bridge.get_persona_comment(state.fen, context="roast")
        
        embed = discord.Embed(
            title="🔥 Position Roast",
            description=roast,
            color=LUCIAN_RED
        )
        embed.add_field(name="Game", value=state.game_title, inline=True)
        embed.add_field(name="Move", value=f"#{state.move_number}", inline=True)
        embed.set_footer(text="The flames of critique burn eternal")
        
        await ctx.send(embed=embed)
    
    async def _roast_user(self, ctx: commands.Context, mention: str) -> None:
        """Roast a mentioned user based on their stats."""
        # Extract user ID from mention
        try:
            user_id = int(mention.strip("<@!>"))
            user = await self.bot.fetch_user(user_id)
        except (ValueError, discord.NotFound):
            await ctx.send(self._lucian_speak(
                "That mortal does not exist. "
                "Or they have fled my gaze."
            ))
            return
        
        # Mock stats (in real implementation, fetch from Chess.com API)
        mock_stats = {
            "username": user.display_name,
            "rating": 1200 + (user.id % 800),  # Pseudo-random rating
            "games": 50 + (user.id % 500),
            "win_rate": 40 + (user.id % 30)
        }
        
        # Generate roast based on stats
        roasts = [
            f"{mock_stats['rating']} rating? I've seen better from pawns.",
            f"{mock_stats['win_rate']}% win rate. The coin flip has better odds.",
            f"{mock_stats['games']} games and still this level? Fascinating dedication to mediocrity.",
            "Your opening repertoire is as predictable as the sunrise. And equally tiresome.",
            "I have observed your games. Sleep has never come easier to me."
        ]
        
        import random
        roast = random.choice(roasts)
        
        embed = discord.Embed(
            title=f"🔥 Roasting {user.display_name}",
            description=self._lucian_speak(roast),
            color=LUCIAN_RED
        )
        embed.add_field(name="Rating", value=str(mock_stats['rating']), inline=True)
        embed.add_field(name="Games", value=str(mock_stats['games']), inline=True)
        embed.add_field(name="Win Rate", value=f"{mock_stats['win_rate']}%", inline=True)
        embed.set_thumbnail(url=user.display_avatar.url)
        embed.set_footer(text="Stats are mocked. The roast is eternal.")
        
        await ctx.send(embed=embed)
        logger.info(f"Roasted user: {user.display_name}")
    
    async def _roast_pgn(self, ctx: commands.Context, pgn: str) -> None:
        """Analyze and roast a PGN."""
        # Use bridge service to analyze
        analysis = await self.bridge.analyze_pgn(pgn)
        
        # Generate roast based on analysis
        roast_lines = []
        
        if analysis['blunders'] > 0:
            roast_lines.append(
                f"{analysis['blunders']} blunders. "
                "Were you playing blindfolded? Or just blind?"
            )
        
        if analysis['missed_wins'] > 0:
            roast_lines.append(
                f"{analysis['missed_wins']} missed wins. "
                "Victory was served on a silver platter and you chose the floor."
            )
        
        if analysis['accuracy'] < 70:
            roast_lines.append(
                f"{analysis['accuracy']:.1f}% accuracy. "
                "A random number generator would be proud."
            )
        
        if analysis.get('worst_move'):
            roast_lines.append(
                f"The move `{analysis['worst_move']}` shall haunt your dreams."
            )
        
        if not roast_lines:
            roast_lines.append(
                "This game was... acceptable. Don't let it go to your head."
            )
        
        embed = discord.Embed(
            title="🔥 PGN Analysis & Roast",
            description=self._lucian_speak("\n\n".join(roast_lines)),
            color=LUCIAN_RED
        )
        embed.add_field(name="Blunders", value=str(analysis['blunders']), inline=True)
        embed.add_field(name="Missed Wins", value=str(analysis['missed_wins']), inline=True)
        embed.add_field(name="Accuracy", value=f"{analysis['accuracy']:.1f}%", inline=True)
        embed.set_footer(text="Every game is a lesson. Yours was a cautionary tale.")
        
        await ctx.send(embed=embed)
    
    def _looks_like_pgn(self, text: str) -> bool:
        """Check if text looks like PGN notation.
        
        Args:
            text: Input text to check
            
        Returns:
            True if it looks like PGN
        """
        # Simple heuristics
        pgn_indicators = [
            "1.", "1...", "e4", "d4", "Nf3", "O-O", "O-O-O",
            "[Event", "[White", "[Black", "Result"
        ]
        
        return any(indicator in text for indicator in pgn_indicators)
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @meme.error
    @roast.error
    async def jester_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle errors in jester commands."""
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing: `{error.param.name}`. "
                "Even jesters need proper instructions."
            ))
        elif isinstance(error, commands.BadArgument):
            await ctx.send(self._lucian_speak(
                "Invalid argument. Your jest has fallen flat."
            ))
        else:
            logger.error(f"Jester error: {error}")
            await ctx.send(self._lucian_speak(
                "The jest has backfired. How... ironic."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(JesterCog(bot))
    logger.info("Jester cog setup complete")
