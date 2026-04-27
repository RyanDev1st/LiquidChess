"""GatekeeperCog - The Onboarding System.

Greets new members with configurable welcome messages and role assignments.
Admins can configure welcome channels, messages, and auto-roles.

Commands:
    !greet config   - Configure welcome settings (welcome_channel, auto_role, message)
    !greet test     - Test the welcome message on yourself
    !greet enable   - Enable automatic welcome messages
    !greet disable  - Disable automatic welcome messages
    !greet status   - Show current configuration
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Optional, Dict, TYPE_CHECKING, Literal
from dataclasses import dataclass, field, asdict

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

# Data file path
DATA_DIR = DATA_DIR / "gatekeeper"

# Default welcome message with placeholders
DEFAULT_WELCOME_MESSAGE = """🧛 *A new soul enters the castle...*

Welcome, {user}! You have entered **{server}**.

{rules_mention}

May your games be sharp and your strategies sharper.
"""

# Available placeholders for welcome messages
PLACEHOLDERS = {
    "{user}": "The new member's mention",
    "{username}": "The member's display name",
    "{server}": "The server name",
    "{member_count}": "Total member count",
    "{rules_mention}": "Mention of the rules channel (if configured)",
}


# ─────────────────────────────────────────────────────────────────
# Data Models
# ─────────────────────────────────────────────────────────────────

@dataclass
class GatekeeperConfig:
    """Configuration for a guild's welcome settings."""
    guild_id: int
    enabled: bool = True
    welcome_channel_id: Optional[int] = None
    auto_role_id: Optional[int] = None
    rules_channel_id: Optional[int] = None
    welcome_message: str = DEFAULT_WELCOME_MESSAGE
    send_dm: bool = False
    dm_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "guild_id": self.guild_id,
            "enabled": self.enabled,
            "welcome_channel_id": self.welcome_channel_id,
            "auto_role_id": self.auto_role_id,
            "rules_channel_id": self.rules_channel_id,
            "welcome_message": self.welcome_message,
            "send_dm": self.send_dm,
            "dm_message": self.dm_message,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "GatekeeperConfig":
        """Deserialize from dictionary."""
        return cls(
            guild_id=data["guild_id"],
            enabled=data.get("enabled", True),
            welcome_channel_id=data.get("welcome_channel_id"),
            auto_role_id=data.get("auto_role_id"),
            rules_channel_id=data.get("rules_channel_id"),
            welcome_message=data.get("welcome_message", DEFAULT_WELCOME_MESSAGE),
            send_dm=data.get("send_dm", False),
            dm_message=data.get("dm_message"),
            created_at=datetime.fromisoformat(data.get("created_at", datetime.now().isoformat())),
            updated_at=datetime.fromisoformat(data.get("updated_at", datetime.now().isoformat())),
        )


# ─────────────────────────────────────────────────────────────────
# Configuration Modal
# ─────────────────────────────────────────────────────────────────

class WelcomeMessageModal(discord.ui.Modal, title="Edit Welcome Message"):
    """Modal for editing the welcome message."""
    
    message = discord.ui.TextInput(
        label="Welcome Message",
        style=discord.TextStyle.paragraph,
        placeholder="Use {user}, {server}, {member_count}, {rules_mention}",
        max_length=2000,
        required=True
    )
    
    def __init__(self, cog: GatekeeperCog, guild_id: int, current_message: str):
        super().__init__()
        self.cog = cog
        self.guild_id = guild_id
        self.message.default = current_message
    
    async def on_submit(self, interaction: discord.Interaction):
        """Handle message submission."""
        config = self.cog._get_or_create_config(self.guild_id)
        config.welcome_message = self.message.value
        config.updated_at = datetime.now()
        self.cog._save_data()
        
        await interaction.response.send_message(
            "🧛 *Welcome message updated.*",
            ephemeral=True
        )


# ─────────────────────────────────────────────────────────────────
# Main Cog
# ─────────────────────────────────────────────────────────────────

class GatekeeperCog(commands.Cog, name="Gatekeeper"):
    """Onboarding System - Welcome new members.
    
    Count Lucian greets those who enter his domain.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Gatekeeper cog."""
        self.bot = bot
        self._configs: Dict[int, GatekeeperConfig] = {}  # guild_id -> config
        self._data_file = str(DATA_DIR / "configs.json")
        
        # Load existing data
        self._load_data()
        
        logger.info("GatekeeperCog loaded - The gate is watched")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    # ─────────────────────────────────────────────────────────────────
    # Data Persistence
    # ─────────────────────────────────────────────────────────────────
    
    def _load_data(self) -> None:
        """Load configs from file."""
        os.makedirs(DATA_DIR, exist_ok=True)
        
        if os.path.exists(self._data_file):
            try:
                with open(self._data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                for guild_id_str, config_dict in data.items():
                    guild_id = int(guild_id_str)
                    self._configs[guild_id] = GatekeeperConfig.from_dict(config_dict)
                
                logger.info(f"Loaded {len(self._configs)} gatekeeper configs")
            except Exception as e:
                logger.error(f"Failed to load gatekeeper data: {e}")
    
    def _save_data(self) -> None:
        """Save configs to file."""
        os.makedirs(DATA_DIR, exist_ok=True)
        
        try:
            data = {
                str(guild_id): config.to_dict()
                for guild_id, config in self._configs.items()
            }
            with open(self._data_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save gatekeeper data: {e}")
    
    # ─────────────────────────────────────────────────────────────────
    # Helper Methods
    # ─────────────────────────────────────────────────────────────────
    
    def _get_or_create_config(self, guild_id: int) -> GatekeeperConfig:
        """Get or create config for a guild."""
        if guild_id not in self._configs:
            self._configs[guild_id] = GatekeeperConfig(guild_id=guild_id)
            self._save_data()
        return self._configs[guild_id]
    
    def _format_welcome_message(
        self, 
        config: GatekeeperConfig, 
        member: discord.Member
    ) -> str:
        """Format welcome message with placeholders replaced."""
        guild = member.guild
        
        # Build rules mention
        rules_mention = ""
        if config.rules_channel_id:
            rules_channel = guild.get_channel(config.rules_channel_id)
            if rules_channel:
                rules_mention = f"Please read the rules in {rules_channel.mention}"
        
        message = config.welcome_message
        message = message.replace("{user}", member.mention)
        message = message.replace("{username}", member.display_name)
        message = message.replace("{server}", guild.name)
        message = message.replace("{member_count}", str(guild.member_count))
        message = message.replace("{rules_mention}", rules_mention)
        
        return message
    
    async def _send_welcome(self, member: discord.Member, config: GatekeeperConfig) -> None:
        """Send welcome message to a new member."""
        # Send to welcome channel
        if config.welcome_channel_id:
            channel = member.guild.get_channel(config.welcome_channel_id)
            if channel and isinstance(channel, discord.TextChannel):
                message = self._format_welcome_message(config, member)
                
                embed = discord.Embed(
                    title="🧛 Welcome to the Castle",
                    description=message,
                    color=LUCIAN_GOLD
                )
                embed.set_thumbnail(url=member.display_avatar.url)
                embed.set_footer(text=f"Member #{member.guild.member_count}")
                
                await channel.send(embed=embed)
        
        # Send DM if enabled
        if config.send_dm and config.dm_message:
            try:
                dm_content = config.dm_message
                dm_content = dm_content.replace("{user}", member.display_name)
                dm_content = dm_content.replace("{server}", member.guild.name)
                
                await member.send(self._lucian_speak(dm_content))
            except discord.Forbidden:
                logger.warning(f"Cannot DM new member {member.id}")
    
    async def _assign_auto_role(self, member: discord.Member, config: GatekeeperConfig) -> None:
        """Assign auto-role to new member."""
        if config.auto_role_id:
            role = member.guild.get_role(config.auto_role_id)
            if role:
                try:
                    await member.add_roles(role, reason="Gatekeeper auto-role")
                    logger.info(f"Assigned auto-role {role.name} to {member}")
                except discord.HTTPException as e:
                    logger.error(f"Failed to assign auto-role: {e}")
    
    # ─────────────────────────────────────────────────────────────────
    # Events
    # ─────────────────────────────────────────────────────────────────
    
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member) -> None:
        """Handle new member joins."""
        config = self._configs.get(member.guild.id)
        
        if not config or not config.enabled:
            return
        
        # Welcome message
        await self._send_welcome(member, config)
        
        # Auto-role
        await self._assign_auto_role(member, config)
        
        logger.info(f"Welcomed new member {member} to {member.guild}")
    
    # ─────────────────────────────────────────────────────────────────
    # Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_group(name="greet", invoke_without_command=True)
    @commands.has_permissions(administrator=True)
    async def greet(self, ctx: commands.Context) -> None:
        """Gatekeeper commands. Subcommands: config, test, enable, disable, status."""
        await ctx.send(self._lucian_speak(
            "Subcommands: `config`, `test`, `enable`, `disable`, `status`"
        ))
    
    @greet.command(name="config")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        setting="The setting to configure",
        value="Channel mention, role mention, or text value"
    )
    @app_commands.choices(setting=[
        app_commands.Choice(name="welcome_channel", value="welcome_channel"),
        app_commands.Choice(name="auto_role", value="auto_role"),
        app_commands.Choice(name="rules_channel", value="rules_channel"),
        app_commands.Choice(name="message", value="message"),
        app_commands.Choice(name="send_dm", value="send_dm"),
    ])
    async def greet_config(
        self,
        ctx: commands.Context,
        setting: str,
        *,
        value: Optional[str] = None
    ) -> None:
        """Configure welcome settings."""
        if not ctx.guild:
            return
        
        config = self._get_or_create_config(ctx.guild.id)
        
        if setting == "welcome_channel":
            # Extract channel from mention or ID
            if value:
                # Try to parse channel mention
                channel = None
                if value.startswith("<#") and value.endswith(">"):
                    channel_id = int(value[2:-1])
                    channel = ctx.guild.get_channel(channel_id)
                else:
                    # Try as ID
                    try:
                        channel_id = int(value)
                        channel = ctx.guild.get_channel(channel_id)
                    except ValueError:
                        pass
                
                if channel:
                    config.welcome_channel_id = channel.id
                    await ctx.send(self._lucian_speak(
                        f"Welcome channel set to {channel.mention}"
                    ))
                else:
                    await ctx.send(self._lucian_speak(
                        "Invalid channel. Mention a channel or provide its ID."
                    ))
                    return
            else:
                config.welcome_channel_id = None
                await ctx.send(self._lucian_speak("Welcome channel cleared."))
        
        elif setting == "auto_role":
            if value:
                # Try to parse role mention
                role = None
                if value.startswith("<@&") and value.endswith(">"):
                    role_id = int(value[3:-1])
                    role = ctx.guild.get_role(role_id)
                else:
                    try:
                        role_id = int(value)
                        role = ctx.guild.get_role(role_id)
                    except ValueError:
                        # Try by name
                        role = discord.utils.get(ctx.guild.roles, name=value)
                
                if role:
                    config.auto_role_id = role.id
                    await ctx.send(self._lucian_speak(
                        f"Auto-role set to {role.mention}"
                    ))
                else:
                    await ctx.send(self._lucian_speak(
                        "Invalid role. Mention a role or provide its ID."
                    ))
                    return
            else:
                config.auto_role_id = None
                await ctx.send(self._lucian_speak("Auto-role cleared."))
        
        elif setting == "rules_channel":
            if value:
                channel = None
                if value.startswith("<#") and value.endswith(">"):
                    channel_id = int(value[2:-1])
                    channel = ctx.guild.get_channel(channel_id)
                else:
                    try:
                        channel_id = int(value)
                        channel = ctx.guild.get_channel(channel_id)
                    except ValueError:
                        pass
                
                if channel:
                    config.rules_channel_id = channel.id
                    await ctx.send(self._lucian_speak(
                        f"Rules channel set to {channel.mention}"
                    ))
                else:
                    await ctx.send(self._lucian_speak("Invalid channel."))
                    return
            else:
                config.rules_channel_id = None
                await ctx.send(self._lucian_speak("Rules channel cleared."))
        
        elif setting == "message":
            # Open modal for message editing
            modal = WelcomeMessageModal(self, ctx.guild.id, config.welcome_message)
            if hasattr(ctx, "interaction") and ctx.interaction:
                await ctx.interaction.response.send_modal(modal)
            else:
                # Fallback for prefix commands
                await ctx.send(self._lucian_speak(
                    "Use slash command `/greet config setting:message` for the message editor."
                ))
                return
        
        elif setting == "send_dm":
            if value and value.lower() in ("true", "yes", "on", "1"):
                config.send_dm = True
                await ctx.send(self._lucian_speak("DM welcomes enabled."))
            else:
                config.send_dm = False
                await ctx.send(self._lucian_speak("DM welcomes disabled."))
        
        config.updated_at = datetime.now()
        self._save_data()
    
    @greet.command(name="test")
    @commands.has_permissions(administrator=True)
    async def greet_test(self, ctx: commands.Context) -> None:
        """Test the welcome message on yourself."""
        if not ctx.guild or not isinstance(ctx.author, discord.Member):
            return
        
        config = self._get_or_create_config(ctx.guild.id)
        
        # Format and send test message
        message = self._format_welcome_message(config, ctx.author)
        
        embed = discord.Embed(
            title="🧛 Welcome to the Castle (TEST)",
            description=message,
            color=LUCIAN_GOLD
        )
        embed.set_thumbnail(url=ctx.author.display_avatar.url)
        embed.set_footer(text="This is a test message")
        
        await ctx.send(embed=embed)
    
    @greet.command(name="enable")
    @commands.has_permissions(administrator=True)
    async def greet_enable(self, ctx: commands.Context) -> None:
        """Enable automatic welcome messages."""
        if not ctx.guild:
            return
        
        config = self._get_or_create_config(ctx.guild.id)
        config.enabled = True
        config.updated_at = datetime.now()
        self._save_data()
        
        await ctx.send(self._lucian_speak("The gatekeeper awakens. Welcomes enabled."))
    
    @greet.command(name="disable")
    @commands.has_permissions(administrator=True)
    async def greet_disable(self, ctx: commands.Context) -> None:
        """Disable automatic welcome messages."""
        if not ctx.guild:
            return
        
        config = self._get_or_create_config(ctx.guild.id)
        config.enabled = False
        config.updated_at = datetime.now()
        self._save_data()
        
        await ctx.send(self._lucian_speak("The gatekeeper sleeps. Welcomes disabled."))
    
    @greet.command(name="status")
    @commands.has_permissions(administrator=True)
    async def greet_status(self, ctx: commands.Context) -> None:
        """Show current gatekeeper configuration."""
        if not ctx.guild:
            return
        
        config = self._get_or_create_config(ctx.guild.id)
        
        embed = discord.Embed(
            title="🧛 Gatekeeper Status",
            color=LUCIAN_GOLD if config.enabled else LUCIAN_RED
        )
        
        # Status
        embed.add_field(
            name="Status",
            value="✅ Enabled" if config.enabled else "❌ Disabled",
            inline=True
        )
        
        # Welcome channel
        if config.welcome_channel_id:
            channel = ctx.guild.get_channel(config.welcome_channel_id)
            embed.add_field(
                name="Welcome Channel",
                value=channel.mention if channel else "⚠️ Invalid",
                inline=True
            )
        else:
            embed.add_field(name="Welcome Channel", value="Not set", inline=True)
        
        # Auto role
        if config.auto_role_id:
            role = ctx.guild.get_role(config.auto_role_id)
            embed.add_field(
                name="Auto Role",
                value=role.mention if role else "⚠️ Invalid",
                inline=True
            )
        else:
            embed.add_field(name="Auto Role", value="Not set", inline=True)
        
        # Rules channel
        if config.rules_channel_id:
            channel = ctx.guild.get_channel(config.rules_channel_id)
            embed.add_field(
                name="Rules Channel",
                value=channel.mention if channel else "⚠️ Invalid",
                inline=True
            )
        else:
            embed.add_field(name="Rules Channel", value="Not set", inline=True)
        
        # DM setting
        embed.add_field(
            name="DM Welcomes",
            value="Yes" if config.send_dm else "No",
            inline=True
        )
        
        # Last updated
        embed.set_footer(text=f"Last updated: {config.updated_at.strftime('%Y-%m-%d %H:%M')}")
        
        # Show placeholders available
        placeholders_text = "\n".join(
            f"`{k}` - {v}" for k, v in PLACEHOLDERS.items()
        )
        embed.add_field(
            name="Available Placeholders",
            value=placeholders_text,
            inline=False
        )
        
        await ctx.send(embed=embed)
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @greet.error
    @greet_config.error
    @greet_test.error
    @greet_enable.error
    @greet_disable.error
    @greet_status.error
    async def gatekeeper_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle gatekeeper command errors."""
        if isinstance(error, commands.MissingPermissions):
            await ctx.send(self._lucian_speak(
                "Only administrators may configure the gatekeeper."
            ), ephemeral=True)
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing argument: `{error.param.name}`"
            ), ephemeral=True)
        else:
            logger.error(f"Gatekeeper error: {error}")
            await ctx.send(self._lucian_speak(
                "The gatekeeper encountered an error."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(GatekeeperCog(bot))
    logger.info("Gatekeeper cog setup complete")
