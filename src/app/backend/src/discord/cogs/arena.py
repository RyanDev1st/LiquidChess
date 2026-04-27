"""ArenaCog - The Stage for Live Chess.

Commands for managing live chess streams and broadcasts.
This is where Count Lucian watches the bloodsport unfold.

Commands:
    !live [link]     - Start/re-hook a live session
    !live stop       - Stop the live session
    !stop [scope]    - Alias for !live stop (discord/web/all)
    !switchlive <n>  - Switch focus to game at index
    !listlive        - List all active sessions
"""

from __future__ import annotations

import asyncio
from typing import Optional, TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

from src.utils.logger import get_logger
from src.discord.services import BridgeService

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# Lucian's color palette
LUCIAN_RED = 0x880000


class ArenaCog(commands.Cog, name="Arena"):
    """The Stage - Live chess streaming commands.
    
    Count Lucian observes the mortals' chess matches with 
    detached aristocratic interest.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Arena cog.
        
        Args:
            bot: The LiquidChess bot instance
        """
        self.bot = bot
        self.bridge: BridgeService = BridgeService()
        logger.info("ArenaCog loaded - The stage is set")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    async def _join_voice_if_user_in_vc(
        self, 
        ctx: commands.Context
    ) -> Optional[discord.VoiceChannel]:
        """Join the user's voice channel if they're in one.
        
        Args:
            ctx: Command context
            
        Returns:
            VoiceChannel joined, or None
        """
        # Only guild members have voice state
        author = ctx.author
        if not isinstance(author, discord.Member):
            return None
        
        if author.voice and author.voice.channel:
            vc = author.voice.channel
            
            # Only support VoiceChannel (not StageChannel)
            if not isinstance(vc, discord.VoiceChannel):
                return None
            
            # Check if already connected to this VC
            if ctx.voice_client and ctx.voice_client.channel == vc:
                logger.debug(f"Already in VC: {vc.name}")
                return vc
            
            # Disconnect from other VC if connected
            if ctx.voice_client:
                await ctx.voice_client.disconnect(force=True)
            
            try:
                await vc.connect()
                self.bridge.set_discord_vc(vc.id)
                logger.info(f"Joined VC: {vc.name}")
                return vc
            except Exception as e:
                logger.error(f"Failed to join VC: {e}")
        
        return None
    
    async def _create_live_thread(
        self, 
        ctx: commands.Context, 
        title: str
    ) -> Optional[discord.Thread]:
        """Create a live thread for the session.
        
        Args:
            ctx: Command context
            title: Game title for the thread
            
        Returns:
            Created Thread or None
        """
        try:
            thread_name = f"🔴 Live: {title}"
            
            # Create thread from the current message
            thread = await ctx.message.create_thread(
                name=thread_name[:100],  # Discord limit
                auto_archive_duration=1440  # 24 hours
            )
            
            self.bridge.set_discord_thread(thread.id)
            logger.info(f"Created thread: {thread_name}")
            return thread
            
        except discord.Forbidden:
            logger.warning("No permission to create thread")
            await ctx.send(self._lucian_speak(
                "I lack the authority to create threads here. "
                "How... limiting."
            ))
        except Exception as e:
            logger.error(f"Thread creation failed: {e}")
        
        return None
    
    async def _push_state_update(
        self, 
        ctx: commands.Context
    ) -> None:
        """Push current state to Discord (board + commentary).
        
        Args:
            ctx: Command context
        """
        state = await self.bridge.get_current_state()
        if not state:
            return
        
        # Get commentary
        commentary = await self.bridge.get_persona_comment(state.fen)
        
        # Build embed
        embed = discord.Embed(
            title=state.game_title,
            description=commentary,
            color=LUCIAN_RED
        )
        embed.add_field(
            name="Position", 
            value=f"`{state.fen[:50]}...`", 
            inline=False
        )
        embed.add_field(
            name="Move", 
            value=f"#{state.move_number}", 
            inline=True
        )
        embed.add_field(
            name="Evaluation", 
            value=f"{state.evaluation:+.2f}" if state.evaluation else "N/A", 
            inline=True
        )
        embed.set_footer(text="The hunt continues...")
        
        await ctx.send(embed=embed)
    
    # ─────────────────────────────────────────────────────────────────
    # Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="live", description="Start or view a live chess session")
    async def live(self, ctx: commands.Context, *, link: Optional[str] = None) -> None:
        """Start or re-hook a live chess session.
        
        Usage:
            !live https://chess.com/game/live/123456789
            !live  (re-hook to existing session)
            !live stop [scope]
        
        Args:
            ctx: Command context
            link: Chess.com game link, "stop", or None
        """
        # Handle stop command
        if link and link.lower().startswith("stop"):
            await self._handle_stop(ctx, link)
            return
        
        # Case A: Link provided - Start new session
        if link:
            await self._start_new_session(ctx, link)
        
        # Case B: No link - "The Nudge" (Re-hook)
        else:
            await self._rehook_session(ctx)
    
    async def _start_new_session(
        self, 
        ctx: commands.Context, 
        link: str
    ) -> None:
        """Start a new live session with provided link.
        
        Args:
            ctx: Command context
            link: Chess.com game URL
        """
        # Validate it looks like a URL
        if not link.startswith(("http://", "https://")):
            await ctx.send(self._lucian_speak(
                "You summon me without a proper link? "
                "My time is eternal, yours is not. Fix it."
            ))
            return
        
        async with ctx.typing():
            # Start the session
            session = await self.bridge.start_session(link)
            
            # Join VC if user is in one
            vc = await self._join_voice_if_user_in_vc(ctx)
            
            # Create the live thread
            thread = await self._create_live_thread(ctx, session.title)
        
        # Build response embed
        embed = discord.Embed(
            title="🩸 The Hunt Begins",
            description=f"I have locked onto **{session.title}**.",
            color=LUCIAN_RED
        )
        embed.add_field(
            name="🌐 Web View", 
            value=f"[liquidchess.club/watch]({session.web_url})", 
            inline=False
        )
        
        if vc:
            embed.add_field(name="🎙️ Voice", value=f"Joined {vc.name}", inline=True)
        
        if thread:
            embed.add_field(name="💬 Thread", value=thread.mention, inline=True)
        
        embed.set_footer(text="The board is set. The pieces move.")
        
        await ctx.send(embed=embed)
        logger.info(f"Session started: {session.title} by {ctx.author}")
    
    async def _rehook_session(self, ctx: commands.Context) -> None:
        """Re-hook Discord to existing session (The Nudge).
        
        Args:
            ctx: Command context
        """
        session = self.bridge.active_session
        
        if not session:
            await ctx.send(self._lucian_speak(
                "There is no blood to hunt. Give me a link."
            ))
            return
        
        # Re-hook logic
        vc_joined = None
        thread_created = None
        
        async with ctx.typing():
            # VC Check: If bot NOT in VC but user IS, join
            if not self.bridge.is_in_vc():
                vc_joined = await self._join_voice_if_user_in_vc(ctx)
            
            # Thread Check: Ensure thread exists
            if not self.bridge.has_thread():
                thread_created = await self._create_live_thread(ctx, session.title)
        
        # Force state push
        await self._push_state_update(ctx)
        
        # Report what happened
        actions = []
        if vc_joined:
            actions.append(f"Descended into {vc_joined.name}")
        if thread_created:
            actions.append(f"Spawned thread {thread_created.mention}")
        
        if actions:
            await ctx.send(self._lucian_speak(
                f"Re-establishing my presence... {', '.join(actions)}."
            ))
        else:
            await ctx.send(self._lucian_speak(
                "I am already watching. Patience, mortal."
            ))
    
    async def _handle_stop(self, ctx: commands.Context, args: str) -> None:
        """Handle the stop command with scope.
        
        Args:
            ctx: Command context  
            args: "stop" or "stop <scope>"
        """
        parts = args.lower().split()
        scope = parts[1] if len(parts) > 1 else "all"
        
        if scope not in ("discord", "web", "all"):
            await ctx.send(self._lucian_speak(
                f"Unknown scope: `{scope}`. Choose: `discord`, `web`, or `all`."
            ))
            return
        
        result = await self.bridge.stop_session(scope)
        
        if not any(result.values()):
            await ctx.send(self._lucian_speak(
                "There is nothing to stop. The arena lies empty."
            ))
            return
        
        # Disconnect from VC if Discord scope
        if result["discord"] and ctx.voice_client:
            await ctx.voice_client.disconnect(force=True)
        
        # Report results
        stopped = [k for k, v in result.items() if v]
        
        embed = discord.Embed(
            title="🦇 The Hunt Concludes",
            description=f"Severed connections: **{', '.join(stopped)}**",
            color=LUCIAN_RED
        )
        embed.set_footer(text="Until the next summons...")
        
        await ctx.send(embed=embed)
        logger.info(f"Session stopped (scope: {scope}) by {ctx.author}")
    
    @commands.hybrid_command(name="switchlive", description="Switch focus to a different game in the queue")
    async def switchlive(self, ctx: commands.Context, index: int) -> None:
        """Switch focus to a different game in the queue.
        
        Args:
            ctx: Command context
            index: 1-based index of the game
        """
        queue = self.bridge.session_queue
        
        if not queue:
            await ctx.send(self._lucian_speak(
                "The queue is empty. There is nothing to switch."
            ))
            return
        
        # Convert to 0-based
        zero_index = index - 1
        
        if zero_index < 0 or zero_index >= len(queue):
            await ctx.send(self._lucian_speak(
                f"Index {index} is beyond my sight. "
                f"I see {len(queue)} games. Choose wisely."
            ))
            return
        
        self.bridge.focus_index = zero_index
        session = queue[zero_index]
        
        embed = discord.Embed(
            title="👁️ Focus Shifted",
            description=f"Now observing: **{session.title}**",
            color=LUCIAN_RED
        )
        embed.add_field(name="Index", value=f"[{index}]", inline=True)
        embed.add_field(name="Status", value=session.status.value, inline=True)
        
        await ctx.send(embed=embed)
        await self._push_state_update(ctx)
        
        logger.info(f"Focus switched to index {index}: {session.title}")
    
    @commands.hybrid_command(name="listlive", description="List all active live sessions")
    async def listlive(self, ctx: commands.Context) -> None:
        """List all active live sessions in the queue."""
        queue = self.bridge.session_queue
        
        if not queue:
            await ctx.send(self._lucian_speak(
                "The hunting grounds are barren. "
                "No games dwell within my sight."
            ))
            return
        
        embed = discord.Embed(
            title="🩸 Active Hunts",
            description=f"Monitoring **{len(queue)}** game(s)",
            color=LUCIAN_RED
        )
        
        for i, session in enumerate(queue, 1):
            focus_marker = "👁️ " if i - 1 == self.bridge.focus_index else ""
            embed.add_field(
                name=f"[{i}] {focus_marker}{session.title}",
                value=(
                    f"Status: `{session.status.value}`\n"
                    f"[Web View]({session.web_url})"
                ),
                inline=False
            )
        
        embed.set_footer(text="Use !switchlive <n> to change focus")
        await ctx.send(embed=embed)
    
    @commands.hybrid_command(name="stop", description="Stop the live chess session")
    @app_commands.choices(scope=[
        app_commands.Choice(name="All Channels", value="all"),
        app_commands.Choice(name="Discord Only", value="discord"),
        app_commands.Choice(name="Web Only", value="web"),
    ])
    async def stop(self, ctx: commands.Context, scope: str = "all") -> None:
        """Stop the live session (alias for !live stop).
        
        Usage:
            !stop          - Stop all channels (Discord + Web)
            !stop discord  - Stop only Discord feed
            !stop web      - Stop only Web feed
            !stop all      - Stop everything
        
        Args:
            ctx: Command context
            scope: What to stop (discord/web/all)
        """
        # Delegate to the existing stop handler
        await self._handle_stop(ctx, f"stop {scope}")
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @live.error
    @switchlive.error
    @listlive.error
    @stop.error
    async def arena_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle errors in arena commands."""
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"You forgot: `{error.param.name}`. "
                "Details matter, even to mortals."
            ))
        elif isinstance(error, commands.BadArgument):
            await ctx.send(self._lucian_speak(
                "Your argument offends my sensibilities. Try again."
            ))
        else:
            logger.error(f"Arena error: {error}")
            await ctx.send(self._lucian_speak(
                "Something has gone wrong. Even I am... surprised."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(ArenaCog(bot))
    logger.info("Arena cog setup complete")
