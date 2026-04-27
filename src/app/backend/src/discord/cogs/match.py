"""MatchCog - The Matchmaking System.

Core loop for finding chess opponents with ELO verification.
Players request games, get verified via Chess.com/Lichess profile scraping,
and are matched into private channels.

Commands:
    !match request      - Request a game (triggers verification if needed)
    !match list         - Show active requests with indices
    !match accept <n>   - Accept request at index, create private channel
    !match cancel       - Cancel your own request
    !match review       - (Admin) Show pending verifications
    !match approve      - (Admin) Manually approve a user
    !match reject       - (Admin) Reject a verification
    !verify             - (Admin) Hard override to set user ELO
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, TYPE_CHECKING
from dataclasses import dataclass, field

import discord
from discord import app_commands
from discord.ext import commands, tasks
import aiohttp

from src.utils.logger import get_logger

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# ─────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────

LUCIAN_RED = 0x880000
LUCIAN_GOLD = 0xD4AF37

# Regex patterns for profile URL detection
CHESS_COM_PATTERN = re.compile(r"chess\.com/member/(\w+)", re.IGNORECASE)
LICHESS_PATTERN = re.compile(r"lichess\.org/@/(\w+)", re.IGNORECASE)

# Match channel auto-close after inactivity (24 hours)
MATCH_CHANNEL_TIMEOUT = timedelta(hours=24)


# ─────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────

class Platform(Enum):
    """Chess platform enum."""
    CHESS_COM = "chess.com"
    LICHESS = "lichess.org"
    UNKNOWN = "unknown"


class VerificationStatus(Enum):
    """User verification status."""
    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


@dataclass
class PlayerProfile:
    """Verified player profile data."""
    user_id: int
    platform: Platform = Platform.UNKNOWN
    username: str = ""
    elo: int = 0
    profile_url: str = ""
    status: VerificationStatus = VerificationStatus.UNVERIFIED
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None  # Admin who verified (if manual)


@dataclass
class MatchRequest:
    """A pending match request."""
    user_id: int
    elo: int
    platform: Platform
    requested_at: datetime = field(default_factory=datetime.now)
    
    @property
    def wait_time(self) -> str:
        """Human-readable wait time."""
        delta = datetime.now() - self.requested_at
        minutes = int(delta.total_seconds() // 60)
        if minutes < 1:
            return "Just now"
        elif minutes < 60:
            return f"{minutes}m"
        else:
            return f"{minutes // 60}h {minutes % 60}m"


# ─────────────────────────────────────────────────────────────────
# Match Control Panel (Buttons for private channels)
# ─────────────────────────────────────────────────────────────────

class MatchControlView(discord.ui.View):
    """Control panel for match channels."""
    
    def __init__(self, cog: MatchCog, player_a: int, player_b: int):
        super().__init__(timeout=None)  # Persistent view
        self.cog = cog
        self.player_a = player_a
        self.player_b = player_b
    
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Only allow the two players to interact."""
        if interaction.user.id not in (self.player_a, self.player_b):
            await interaction.response.send_message(
                "🧛 *This duel is not yours to conclude.*",
                ephemeral=True
            )
            return False
        return True
    
    @discord.ui.button(label="Match Finished", style=discord.ButtonStyle.success, emoji="✅")
    async def finish_match(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Mark the match as complete and award XP."""
        await interaction.response.send_message(
            "🧛 *The duel concludes. Both combatants gain experience.*"
        )
        # Award XP to both players
        await self.cog._award_match_xp(self.player_a, self.player_b)
        # Schedule channel deletion
        await self._schedule_close(interaction)
    
    @discord.ui.button(label="Close Chat", style=discord.ButtonStyle.danger, emoji="🚪")
    async def close_chat(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Close the match channel without awarding XP."""
        await interaction.response.send_message(
            "🧛 *The chamber seals. No glory was claimed.*"
        )
        await self._schedule_close(interaction)
    
    async def _schedule_close(self, interaction: discord.Interaction):
        """Schedule channel deletion after brief delay."""
        await asyncio.sleep(10)
        channel = interaction.channel
        if channel and isinstance(channel, discord.TextChannel):
            try:
                await channel.delete(reason="Match concluded")
            except discord.HTTPException:
                pass


# ─────────────────────────────────────────────────────────────────
# Main Cog
# ─────────────────────────────────────────────────────────────────

class MatchCog(commands.Cog, name="Match"):
    """Matchmaking - Find opponents and duel.
    
    Count Lucian arranges battles between mortals.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Match cog."""
        self.bot = bot
        
        # In-memory storage (replace with DB in production)
        self._profiles: Dict[int, PlayerProfile] = {}  # user_id -> profile
        self._requests: List[MatchRequest] = []  # Active match requests
        self._pending_verifications: Dict[int, PlayerProfile] = {}  # Awaiting admin
        self._bot_channels: Dict[int, int] = {}  # guild_id -> channel_id for verification
        self._pending_channel_verifications: Dict[int, int] = {}  # user_id -> channel_id
        
        # Start cleanup task
        self.cleanup_stale_requests.start()
        
        logger.info("MatchCog loaded - The arena awaits challengers")
    
    async def cog_unload(self) -> None:
        """Cleanup on unload."""
        self.cleanup_stale_requests.cancel()
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    # ─────────────────────────────────────────────────────────────────
    # Background Tasks
    # ─────────────────────────────────────────────────────────────────
    
    @tasks.loop(hours=1)
    async def cleanup_stale_requests(self):
        """Remove requests older than 24 hours."""
        cutoff = datetime.now() - timedelta(hours=24)
        self._requests = [r for r in self._requests if r.requested_at > cutoff]
    
    # ─────────────────────────────────────────────────────────────────
    # Helper Methods
    # ─────────────────────────────────────────────────────────────────
    
    def _is_verified(self, user_id: int) -> bool:
        """Check if user is verified."""
        profile = self._profiles.get(user_id)
        return profile is not None and profile.status == VerificationStatus.VERIFIED
    
    def _get_profile(self, user_id: int) -> Optional[PlayerProfile]:
        """Get user profile if exists."""
        return self._profiles.get(user_id)
    
    def _detect_platform(self, url: str) -> tuple[Platform, str]:
        """Detect platform and extract username from URL."""
        chess_match = CHESS_COM_PATTERN.search(url)
        if chess_match:
            return Platform.CHESS_COM, chess_match.group(1)
        
        lichess_match = LICHESS_PATTERN.search(url)
        if lichess_match:
            return Platform.LICHESS, lichess_match.group(1)
        
        return Platform.UNKNOWN, ""
    
    async def _fetch_elo_from_platform(self, platform: Platform, username: str) -> Optional[int]:
        """Fetch ELO from external platform API.
        
        Chess.com: Uses highest rating from rapid/blitz/bullet
        Lichess: Uses highest rating from rapid/blitz/bullet
        """
        try:
            async with aiohttp.ClientSession() as session:
                if platform == Platform.CHESS_COM:
                    url = f"https://api.chess.com/pub/player/{username.lower()}/stats"
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status != 200:
                            logger.warning(f"Chess.com API returned {resp.status} for {username}")
                            return None
                        
                        data = await resp.json()
                        
                        # Get ratings from different time controls
                        ratings = []
                        for mode in ['chess_rapid', 'chess_blitz', 'chess_bullet']:
                            if mode in data and 'last' in data[mode]:
                                ratings.append(data[mode]['last']['rating'])
                        
                        if ratings:
                            # Return the highest rating
                            best_rating = max(ratings)
                            logger.info(f"Chess.com {username}: ratings={ratings}, using {best_rating}")
                            return best_rating
                        
                        logger.warning(f"No ratings found for Chess.com user {username}")
                        return None
                
                elif platform == Platform.LICHESS:
                    url = f"https://lichess.org/api/user/{username}"
                    headers = {"Accept": "application/json"}
                    async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                        if resp.status != 200:
                            logger.warning(f"Lichess API returned {resp.status} for {username}")
                            return None
                        
                        data = await resp.json()
                        perfs = data.get('perfs', {})
                        
                        # Get ratings from different time controls
                        ratings = []
                        for mode in ['rapid', 'blitz', 'bullet']:
                            if mode in perfs and 'rating' in perfs[mode]:
                                ratings.append(perfs[mode]['rating'])
                        
                        if ratings:
                            best_rating = max(ratings)
                            logger.info(f"Lichess {username}: ratings={ratings}, using {best_rating}")
                            return best_rating
                        
                        logger.warning(f"No ratings found for Lichess user {username}")
                        return None
                
                else:
                    logger.warning(f"Unknown platform: {platform}")
                    return None
                    
        except asyncio.TimeoutError:
            logger.error(f"Timeout fetching ELO for {username} on {platform.value}")
            return None
        except Exception as e:
            logger.error(f"Error fetching ELO for {username} on {platform.value}: {e}")
            return None
    
    async def _award_match_xp(self, player_a: int, player_b: int) -> None:
        """Award XP to both players after a match.
        
        TODO: Connect to progression service.
        """
        logger.info(f"Awarding match XP to {player_a} and {player_b}")
        # Placeholder - will connect to ProgressionCog
    
    async def _start_dm_verification(self, user: discord.User | discord.Member) -> None:
        """Start DM verification flow with user.
        
        Raises:
            discord.Forbidden: If the bot cannot DM the user
            Exception: For other errors
        """
        logger.info(f"Starting DM verification for user {user.id} ({user.display_name})")
        
        try:
            dm = await user.create_dm()
            logger.info(f"DM channel created for user {user.id}")
        except Exception as e:
            logger.error(f"Failed to create DM channel for {user.id}: {type(e).__name__}: {e}")
            raise
        
        try:
            embed = discord.Embed(
                title="🧛 ELO Verification Required",
                description=(
                    "To request matches, I must verify your chess rating.\n\n"
                    "**Please send your Chess.com or Lichess profile URL.**\n\n"
                    "Examples:\n"
                    "• `https://chess.com/member/YourUsername`\n"
                    "• `https://lichess.org/@/YourUsername`"
                ),
                color=LUCIAN_RED
            )
            embed.set_footer(text="Reply within 5 minutes")
            
            await dm.send(embed=embed)
            logger.info(f"DM sent to user {user.id}")
        except Exception as e:
            logger.error(f"Failed to send DM to {user.id}: {type(e).__name__}: {e}")
            raise
        
        # Wait for response
        def check(m):
            return m.author.id == user.id and isinstance(m.channel, discord.DMChannel)
        
        try:
            msg = await self.bot.wait_for("message", check=check, timeout=300)
            await self._process_verification_url(user, msg.content, dm)
        except asyncio.TimeoutError:
            await dm.send(self._lucian_speak(
                "Time has expired. Use `!match request` to try again."
            ))
    
    async def _process_verification_url(
        self, 
        user: discord.User | discord.Member, 
        url: str, 
        dm: discord.DMChannel
    ) -> None:
        """Process the verification URL from DM."""
        platform, username = self._detect_platform(url)
        
        if platform == Platform.UNKNOWN:
            await dm.send(self._lucian_speak(
                "I cannot recognize that URL. Please provide a Chess.com or Lichess profile link."
            ))
            return
        
        await dm.send(self._lucian_speak(f"Scanning {platform.value} for `{username}`..."))
        
        # Fetch ELO
        elo = await self._fetch_elo_from_platform(platform, username)
        
        if elo is None:
            await dm.send(self._lucian_speak(
                "Could not retrieve your rating. The site may be down. Contact an admin."
            ))
            return
        
        # Create profile and mark as verified
        profile = PlayerProfile(
            user_id=user.id,
            platform=platform,
            username=username,
            elo=elo,
            profile_url=url,
            status=VerificationStatus.VERIFIED,
            verified_at=datetime.now()
        )
        self._profiles[user.id] = profile
        
        embed = discord.Embed(
            title="✅ Verification Complete",
            description=f"Welcome to the arena, **{username}**!",
            color=LUCIAN_GOLD
        )
        embed.add_field(name="Platform", value=platform.value, inline=True)
        embed.add_field(name="ELO", value=str(elo), inline=True)
        embed.set_footer(text="Use !match request to find opponents")
        
        await dm.send(embed=embed)
        logger.info(f"User {user.id} verified: {username} ({elo}) on {platform.value}")
    
    async def _start_channel_verification(
        self,
        user: discord.User | discord.Member,
        channel: discord.TextChannel
    ) -> None:
        """Start verification flow in a channel (fallback when DM fails).
        
        Args:
            user: The user to verify
            channel: The channel to use for verification
        """
        logger.info(f"Starting channel verification for user {user.id} in channel {channel.id}")
        
        # Mark user as pending channel verification
        self._pending_channel_verifications[user.id] = channel.id
        
        embed = discord.Embed(
            title="🧛 ELO Verification Required",
            description=(
                f"{user.mention}, I could not DM you.\n\n"
                "**Please reply here with your Chess.com or Lichess profile URL.**\n\n"
                "Examples:\n"
                "• `https://chess.com/member/YourUsername`\n"
                "• `https://lichess.org/@/YourUsername`"
            ),
            color=LUCIAN_RED
        )
        embed.set_footer(text="Reply within 5 minutes")
        
        await channel.send(embed=embed)
        
        # Wait for response in this channel
        def check(m):
            return (
                m.author.id == user.id and 
                m.channel.id == channel.id and
                ("chess.com" in m.content.lower() or "lichess.org" in m.content.lower())
            )
        
        try:
            msg = await self.bot.wait_for("message", check=check, timeout=300)
            await self._process_channel_verification_url(user, msg.content, channel)
        except asyncio.TimeoutError:
            await channel.send(self._lucian_speak(
                f"{user.mention}, time has expired. Use `!match request` to try again."
            ))
        finally:
            # Clean up pending status
            self._pending_channel_verifications.pop(user.id, None)
    
    async def _process_channel_verification_url(
        self,
        user: discord.User | discord.Member,
        url: str,
        channel: discord.TextChannel
    ) -> None:
        """Process the verification URL from channel message."""
        platform, username = self._detect_platform(url)
        
        if platform == Platform.UNKNOWN:
            await channel.send(self._lucian_speak(
                f"{user.mention}, I cannot recognize that URL. Please provide a Chess.com or Lichess profile link."
            ))
            return
        
        await channel.send(self._lucian_speak(f"Scanning {platform.value} for `{username}`..."))
        
        # Fetch ELO
        elo = await self._fetch_elo_from_platform(platform, username)
        
        if elo is None:
            await channel.send(self._lucian_speak(
                f"{user.mention}, could not retrieve your rating. The site may be down. Contact an admin."
            ))
            return
        
        # Create profile and mark as verified
        profile = PlayerProfile(
            user_id=user.id,
            platform=platform,
            username=username,
            elo=elo,
            profile_url=url,
            status=VerificationStatus.VERIFIED,
            verified_at=datetime.now()
        )
        self._profiles[user.id] = profile
        
        embed = discord.Embed(
            title="✅ Verification Complete",
            description=f"Welcome to the arena, **{username}**!",
            color=LUCIAN_GOLD
        )
        embed.add_field(name="Platform", value=platform.value, inline=True)
        embed.add_field(name="ELO", value=str(elo), inline=True)
        embed.set_footer(text="Use !match request to find opponents")
        
        await channel.send(f"{user.mention}", embed=embed)
        logger.info(f"User {user.id} verified via channel: {username} ({elo}) on {platform.value}")
    
    async def _create_match_channel(
        self,
        guild: discord.Guild,
        player_a: discord.Member,
        player_b: discord.Member
    ) -> Optional[discord.TextChannel]:
        """Create a private match channel for two players."""
        # Get admin role from settings (if configured)
        admin_role = None
        # TODO: Fetch from settings service
        
        # Build permission overwrites
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            player_a: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            player_b: discord.PermissionOverwrite(read_messages=True, send_messages=True),
            guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True),
        }
        
        if admin_role:
            overwrites[admin_role] = discord.PermissionOverwrite(read_messages=True)
        
        try:
            channel = await guild.create_text_channel(
                name=f"match-{player_a.display_name[:10]}-vs-{player_b.display_name[:10]}",
                overwrites=overwrites,
                reason="Match accepted"
            )
            return channel
        except discord.HTTPException as e:
            logger.error(f"Failed to create match channel: {e}")
            return None
    
    # ─────────────────────────────────────────────────────────────────
    # Commands - Player
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_group(name="match", invoke_without_command=True)
    async def match(self, ctx: commands.Context) -> None:
        """Match system commands. Use subcommands: request, list, accept, cancel."""
        await ctx.send(self._lucian_speak(
            "Subcommands: `request`, `list`, `accept <index>`, `cancel`"
        ))
    
    @match.command(name="request")
    async def match_request(self, ctx: commands.Context) -> None:
        """Request a chess match. Triggers verification if not verified."""
        user_id = ctx.author.id
        
        # Check if already has a pending request
        existing = next((r for r in self._requests if r.user_id == user_id), None)
        if existing:
            await ctx.send(self._lucian_speak(
                "You already have a pending request. Use `!match cancel` first."
            ), ephemeral=True)
            return
        
        # Check verification status
        if not self._is_verified(user_id):
            # Try DM first, fall back to channel verification
            dm_success = False
            try:
                await self._start_dm_verification(ctx.author)
                dm_success = True
                await ctx.send(self._lucian_speak(
                    "Check your DMs to verify your ELO."
                ), ephemeral=True)
            except (discord.Forbidden, discord.HTTPException) as e:
                logger.warning(f"DM failed for {user_id}: {type(e).__name__}: {e}")
            except Exception as e:
                logger.error(f"DM verification error for {user_id}: {type(e).__name__}: {e}")
            
            if not dm_success:
                # Fall back to channel verification
                # Use configured bot channel or current channel
                guild_id = ctx.guild.id if ctx.guild else None
                bot_channel_id = self._bot_channels.get(guild_id) if guild_id else None
                
                if bot_channel_id:
                    target_channel = self.bot.get_channel(bot_channel_id)
                    if not isinstance(target_channel, discord.TextChannel):
                        target_channel = ctx.channel
                else:
                    target_channel = ctx.channel
                
                if isinstance(target_channel, discord.TextChannel):
                    await self._start_channel_verification(ctx.author, target_channel)
                else:
                    await ctx.send(self._lucian_speak(
                        "I cannot DM you and this channel doesn't support verification. "
                        "Ask an admin to verify you with `!verify @you <elo>`."
                    ))
            return
        
        # Add to request queue
        profile = self._get_profile(user_id)
        if not profile:
            return
        
        request = MatchRequest(
            user_id=user_id,
            elo=profile.elo,
            platform=profile.platform
        )
        self._requests.append(request)
        
        embed = discord.Embed(
            title="⚔️ Challenge Posted",
            description=f"{ctx.author.mention} seeks an opponent!",
            color=LUCIAN_RED
        )
        embed.add_field(name="ELO", value=str(profile.elo), inline=True)
        embed.add_field(name="Platform", value=profile.platform.value, inline=True)
        embed.set_footer(text="Others: use !match accept <index> to duel")
        
        await ctx.send(embed=embed)
        
        # TODO: Ping chess_role if configured
        logger.info(f"Match request from {ctx.author} (ELO: {profile.elo})")
    
    @match.command(name="list")
    async def match_list(self, ctx: commands.Context) -> None:
        """List active match requests."""
        if not self._requests:
            await ctx.send(self._lucian_speak(
                "The arena lies empty. No challengers await."
            ))
            return
        
        embed = discord.Embed(
            title="⚔️ Active Challenges",
            description=f"**{len(self._requests)}** warrior(s) seek battle",
            color=LUCIAN_RED
        )
        
        for i, req in enumerate(self._requests, 1):
            user = self.bot.get_user(req.user_id)
            name = user.display_name if user else f"User {req.user_id}"
            
            embed.add_field(
                name=f"[{i}] {name}",
                value=f"ELO: **{req.elo}** | {req.platform.value} | {req.wait_time}",
                inline=False
            )
        
        embed.set_footer(text="Use !match accept <index> to duel")
        await ctx.send(embed=embed)
    
    @match.command(name="accept")
    @app_commands.describe(index="The index number of the request to accept")
    async def match_accept(self, ctx: commands.Context, index: int) -> None:
        """Accept a match request by index."""
        if not ctx.guild:
            await ctx.send(self._lucian_speak("Matches require a guild."))
            return
        
        # Validate index
        if index < 1 or index > len(self._requests):
            await ctx.send(self._lucian_speak(
                f"Invalid index. Use 1-{len(self._requests)}."
            ), ephemeral=True)
            return
        
        request = self._requests[index - 1]
        
        # Can't accept your own request
        if request.user_id == ctx.author.id:
            await ctx.send(self._lucian_speak(
                "You cannot duel yourself, mortal."
            ), ephemeral=True)
            return
        
        # Check if accepter is verified
        if not self._is_verified(ctx.author.id):
            # Try DM first, fall back to channel verification
            dm_success = False
            try:
                await self._start_dm_verification(ctx.author)
                dm_success = True
                await ctx.send(self._lucian_speak(
                    "You must verify your ELO first. Check your DMs."
                ), ephemeral=True)
            except (discord.Forbidden, discord.HTTPException) as e:
                logger.warning(f"DM failed for accept: {type(e).__name__}: {e}")
            except Exception as e:
                logger.error(f"DM verification error: {e}")
            
            if not dm_success:
                # Fall back to channel verification
                guild_id = ctx.guild.id if ctx.guild else None
                bot_channel_id = self._bot_channels.get(guild_id) if guild_id else None
                
                if bot_channel_id:
                    target_channel = self.bot.get_channel(bot_channel_id)
                    if not isinstance(target_channel, discord.TextChannel):
                        target_channel = ctx.channel
                else:
                    target_channel = ctx.channel
                
                if isinstance(target_channel, discord.TextChannel):
                    await self._start_channel_verification(ctx.author, target_channel)
                else:
                    await ctx.send(self._lucian_speak(
                        "Ask an admin to verify you with `!verify @you <elo>`."
                    ))
            return
        
        # Remove from queue
        self._requests.pop(index - 1)
        
        # Get both players
        requester = ctx.guild.get_member(request.user_id)
        accepter = ctx.author
        
        if not requester:
            await ctx.send(self._lucian_speak("The challenger has vanished."))
            return
        
        if not isinstance(accepter, discord.Member):
            return
        
        # Create private channel
        channel = await self._create_match_channel(ctx.guild, requester, accepter)
        
        if not channel:
            await ctx.send(self._lucian_speak(
                "Failed to create the dueling chamber. Contact an admin."
            ))
            return
        
        # Send control panel to new channel
        embed = discord.Embed(
            title="⚔️ Duel Initiated",
            description=(
                f"{requester.mention} vs {accepter.mention}\n\n"
                "Arrange your match and use the buttons below when finished."
            ),
            color=LUCIAN_GOLD
        )
        
        requester_profile = self._get_profile(requester.id)
        accepter_profile = self._get_profile(accepter.id)
        
        if requester_profile and accepter_profile:
            embed.add_field(
                name=requester.display_name,
                value=f"ELO: {requester_profile.elo}",
                inline=True
            )
            embed.add_field(
                name=accepter.display_name,
                value=f"ELO: {accepter_profile.elo}",
                inline=True
            )
        
        embed.set_footer(text="This channel auto-closes after 24h of inactivity")
        
        view = MatchControlView(self, requester.id, accepter.id)
        
        await channel.send(
            f"{requester.mention} {accepter.mention}",
            embed=embed,
            view=view
        )
        
        await ctx.send(self._lucian_speak(
            f"The duel begins! Proceed to {channel.mention}"
        ))
        
        logger.info(f"Match created: {requester} vs {accepter}")
    
    @match.command(name="cancel")
    async def match_cancel(self, ctx: commands.Context) -> None:
        """Cancel your pending match request."""
        user_id = ctx.author.id
        
        # Find and remove request
        for i, req in enumerate(self._requests):
            if req.user_id == user_id:
                self._requests.pop(i)
                await ctx.send(self._lucian_speak(
                    "Your challenge has been withdrawn."
                ))
                return
        
        await ctx.send(self._lucian_speak(
            "You have no pending challenge to cancel."
        ), ephemeral=True)
    
    # ─────────────────────────────────────────────────────────────────
    # Commands - Admin
    # ─────────────────────────────────────────────────────────────────
    
    @match.command(name="review")
    @commands.has_permissions(administrator=True)
    async def match_review(self, ctx: commands.Context) -> None:
        """(Admin) Show users pending verification."""
        pending = [p for p in self._profiles.values() if p.status == VerificationStatus.PENDING]
        
        if not pending:
            await ctx.send(self._lucian_speak(
                "No mortals await judgment."
            ))
            return
        
        embed = discord.Embed(
            title="📋 Pending Verifications",
            color=LUCIAN_GOLD
        )
        
        for p in pending:
            user = self.bot.get_user(p.user_id)
            name = user.display_name if user else f"User {p.user_id}"
            embed.add_field(
                name=name,
                value=f"Platform: {p.platform.value}\nClaimed ELO: {p.elo}",
                inline=False
            )
        
        await ctx.send(embed=embed)
    
    @match.command(name="approve")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        user="The user to approve",
        elo="Override ELO value (optional)"
    )
    async def match_approve(
        self, 
        ctx: commands.Context, 
        user: discord.Member,
        elo: Optional[int] = None
    ) -> None:
        """(Admin) Manually approve a user's verification."""
        profile = self._profiles.get(user.id)
        
        if not profile:
            # Create new profile
            profile = PlayerProfile(user_id=user.id)
            self._profiles[user.id] = profile
        
        profile.status = VerificationStatus.VERIFIED
        profile.verified_at = datetime.now()
        profile.verified_by = ctx.author.id
        
        if elo:
            profile.elo = elo
        
        await ctx.send(self._lucian_speak(
            f"{user.mention} has been granted arena access. ELO: {profile.elo}"
        ))
        logger.info(f"Admin {ctx.author} approved {user} with ELO {profile.elo}")
    
    @match.command(name="reject")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        user="The user to reject",
        reason="Reason for rejection"
    )
    async def match_reject(
        self,
        ctx: commands.Context,
        user: discord.Member,
        *,
        reason: Optional[str] = None
    ) -> None:
        """(Admin) Reject a user's verification."""
        profile = self._profiles.get(user.id)
        
        if profile:
            profile.status = VerificationStatus.REJECTED
        
        # Remove any pending requests from this user
        self._requests = [r for r in self._requests if r.user_id != user.id]
        
        reason_text = f" Reason: {reason}" if reason else ""
        await ctx.send(self._lucian_speak(
            f"{user.mention} has been denied arena access.{reason_text}"
        ))
        
        # Optionally DM the user
        try:
            await user.send(self._lucian_speak(
                f"Your arena verification was rejected.{reason_text}"
            ))
        except discord.Forbidden:
            pass
        
        logger.info(f"Admin {ctx.author} rejected {user}. Reason: {reason}")
    
    # ─────────────────────────────────────────────────────────────────
    # Standalone Admin Command
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="verify")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        user="The user to verify",
        elo="Their ELO rating",
        link="Their profile URL (optional)"
    )
    async def verify(
        self,
        ctx: commands.Context,
        user: discord.Member,
        elo: int,
        link: Optional[str] = None
    ) -> None:
        """(Admin) Hard override to set a user's verified status."""
        platform = Platform.UNKNOWN
        username = user.display_name
        
        if link:
            platform, username = self._detect_platform(link)
            if not username:
                username = user.display_name
        
        profile = PlayerProfile(
            user_id=user.id,
            platform=platform,
            username=username,
            elo=elo,
            profile_url=link or "",
            status=VerificationStatus.VERIFIED,
            verified_at=datetime.now(),
            verified_by=ctx.author.id
        )
        self._profiles[user.id] = profile
        
        embed = discord.Embed(
            title="✅ Manual Verification Complete",
            description=f"{user.mention} has been verified by {ctx.author.mention}",
            color=LUCIAN_GOLD
        )
        embed.add_field(name="ELO", value=str(elo), inline=True)
        embed.add_field(name="Platform", value=platform.value, inline=True)
        
        await ctx.send(embed=embed)
        logger.info(f"Manual verify by {ctx.author}: {user} = {elo} ELO")
    
    @commands.hybrid_command(name="unverify", aliases=["remove-verify"])
    @commands.has_permissions(administrator=True)
    @app_commands.describe(user="The user to remove verification from")
    async def unverify(
        self,
        ctx: commands.Context,
        user: discord.Member
    ) -> None:
        """(Admin) Remove a user's verified status."""
        if user.id not in self._profiles:
            await ctx.send(self._lucian_speak(
                f"{user.mention} has no verification record to remove."
            ), ephemeral=True)
            return
        
        old_profile = self._profiles.pop(user.id)
        
        embed = discord.Embed(
            title="🗑️ Verification Removed",
            description=f"{user.mention}'s verification has been revoked by {ctx.author.mention}",
            color=LUCIAN_RED
        )
        embed.add_field(name="Previous ELO", value=str(old_profile.elo), inline=True)
        embed.add_field(name="Platform", value=old_profile.platform.value, inline=True)
        
        await ctx.send(embed=embed)
        logger.info(f"Verification removed by {ctx.author}: {user} (was {old_profile.elo} ELO)")
    
    @commands.hybrid_command(name="botchannel")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(channel="The channel for bot verification messages (leave empty to use current)")
    async def botchannel(
        self,
        ctx: commands.Context,
        channel: Optional[discord.TextChannel] = None
    ) -> None:
        """(Admin) Set the channel for verification when DMs fail."""
        if ctx.guild is None:
            await ctx.send("This command must be used in a server.", ephemeral=True)
            return
        
        target_channel = channel or ctx.channel
        if not isinstance(target_channel, discord.TextChannel):
            await ctx.send("Please specify a valid text channel.", ephemeral=True)
            return
        
        self._bot_channels[ctx.guild.id] = target_channel.id
        
        embed = discord.Embed(
            title="🔧 Bot Channel Configured",
            description=f"Verification fallback channel set to {target_channel.mention}",
            color=LUCIAN_GOLD
        )
        embed.add_field(
            name="Purpose",
            value="When I cannot DM a user, verification will happen in this channel instead.",
            inline=False
        )
        
        await ctx.send(embed=embed)
        logger.info(f"Bot channel for guild {ctx.guild.id} set to {target_channel.id} by {ctx.author}")
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @match.error
    @verify.error
    @unverify.error
    @botchannel.error
    async def match_error(self, ctx: commands.Context, error: commands.CommandError) -> None:
        """Handle match command errors."""
        if isinstance(error, commands.MissingPermissions):
            await ctx.send(self._lucian_speak(
                "You lack the authority for this command."
            ), ephemeral=True)
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing argument: `{error.param.name}`"
            ), ephemeral=True)
        else:
            logger.error(f"Match error: {error}")
            await ctx.send(self._lucian_speak(
                "An error has occurred in the arena."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(MatchCog(bot))
    logger.info("Match cog setup complete")
