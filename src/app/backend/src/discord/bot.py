"""Discord bot class for LiquidChess."""

from __future__ import annotations

from typing import Optional

import discord
from discord.ext import commands

from src.utils.logger import get_logger

from .constants import COG_EXTENSIONS, DEFAULT_PREFIX, LUCIAN_RED, build_default_intents

logger = get_logger(__name__)


class LiquidChessBot(commands.Bot):
    """The Count Lucian Discord bot."""

    def __init__(
        self,
        command_prefix: str = DEFAULT_PREFIX,
        intents: Optional[discord.Intents] = None,
        **kwargs,
    ) -> None:
        super().__init__(
            command_prefix=command_prefix,
            intents=intents or build_default_intents(),
            description="Count Lucian - The Vampire Chess Observer",
            **kwargs,
        )
        self.initial_extensions = COG_EXTENSIONS
        self._uptime: Optional[float] = None

    async def setup_hook(self) -> None:
        """Load extensions and register owner-only utilities."""
        logger.info("Setting up LiquidChess bot...")
        for extension in self.initial_extensions:
            try:
                await self.load_extension(extension)
                logger.info("Loaded extension: %s", extension)
            except Exception as exc:
                logger.error("Failed to load extension %s: %s", extension, exc)

        logger.info("Loaded %s cogs successfully", len(self.cogs))

        @commands.command(name="sync")
        @commands.is_owner()
        async def sync_cmd(ctx: commands.Context, scope: str = "guild") -> None:
            async with ctx.typing():
                if scope.lower() == "global":
                    synced = await self.tree.sync()
                    await ctx.send(
                        f"🧛 *Synced {len(synced)} commands globally. May take up to an hour to propagate.*"
                    )
                else:
                    if not ctx.guild:
                        await ctx.send("🧛 *This command must be used in a guild.*")
                        return
                    self.tree.copy_global_to(guild=ctx.guild)
                    synced = await self.tree.sync(guild=ctx.guild)
                    await ctx.send(f"🧛 *Synced {len(synced)} commands to this guild.*")
                logger.info("Synced %s slash commands (%s)", len(synced), scope)

        self.add_command(sync_cmd)

    async def on_ready(self) -> None:
        """Handle ready state."""
        import time

        self._uptime = time.time()
        if self.user:
            logger.info("Logged in as %s (ID: %s)", self.user, self.user.id)
        logger.info("Connected to %s guild(s)", len(self.guilds))
        await self.change_presence(
            activity=discord.Activity(type=discord.ActivityType.watching, name="mortals blunder | !help")
        )
        logger.info("Count Lucian has awakened. The hunt begins.")

    async def on_command_error(self, ctx: commands.Context, error: commands.CommandError) -> None:
        """Global error handler for bot commands."""
        if hasattr(ctx.command, "on_error"):
            return
        if ctx.cog and ctx.cog._get_overridden_method(ctx.cog.cog_command_error):
            return

        if isinstance(error, commands.CommandNotFound):
            return
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(f"🧛 *You forgot: `{error.param.name}`. Details matter, even to mortals.*")
            return
        if isinstance(error, commands.BadArgument):
            await ctx.send("🧛 *Your argument is... malformed. Try again.*")
            return
        if isinstance(error, commands.MissingPermissions):
            await ctx.send("🧛 *You lack the authority for this command. Know your place.*")
            return
        if isinstance(error, commands.BotMissingPermissions):
            await ctx.send(
                f"🧛 *I lack permissions: {', '.join(error.missing_permissions)}. How... limiting.*"
            )
            return
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(f"🧛 *Patience. Wait {error.retry_after:.1f} seconds.*")
            return
        if isinstance(error, commands.NoPrivateMessage):
            await ctx.send("🧛 *This command requires a guild. Not here.*")
            return

        logger.error("Unhandled error in %s: %s", ctx.command, error)
        await ctx.send("🧛 *Something has gone wrong. Even I am... surprised.*")

    async def on_guild_join(self, guild: discord.Guild) -> None:
        """Send a greeting when the bot joins a guild."""
        logger.info("Joined guild: %s (ID: %s)", guild.name, guild.id)
        if not guild.system_channel:
            return
        try:
            embed = discord.Embed(
                title="🧛 Count Lucian Has Arrived",
                description=(
                    "I am Count Lucian, a 600-year-old observer of chess.\n\n"
                    "I shall watch your games with... academic interest.\n\n"
                    "Use `!help` to see what I offer. Use `!live <link>` to summon me to your matches."
                ),
                color=LUCIAN_RED,
            )
            embed.set_footer(text="The night is eternal. Your blunders are not.")
            await guild.system_channel.send(embed=embed)
        except discord.Forbidden:
            logger.warning("Cannot send greeting to %s", guild.name)

    async def on_guild_remove(self, guild: discord.Guild) -> None:
        """Log guild removal events."""
        logger.info("Left guild: %s (ID: %s)", guild.name, guild.id)

    def get_uptime(self) -> Optional[str]:
        """Return the formatted bot uptime."""
        if self._uptime is None:
            return None
        import time

        delta = int(time.time() - self._uptime)
        hours, remainder = divmod(delta, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours}h {minutes}m {seconds}s"
