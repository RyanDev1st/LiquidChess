"""GuildCog - Unified Dashboard with Pin Board System.

🧛 Count Lucian's Castle Status & Pin Board

Dashboard Architecture:
┌─────────────────────────────────────────┐
│      🏰 CASTLE STATUS (Public)          │
│  • event     (singular, admin add)      │
│  • partners  (list, admin add)          │
│  • links     (list, admin add)          │
├─────────────────────────────────────────┤
│      📌 PIN BOARD (Role-Gated)          │
│  • Any custom category                  │
│  • Visible to users with pin_role       │
│  • Add requires pin_role                │
└─────────────────────────────────────────┘

Commands (Unified !info structure):
    !info show [category]                           - View dashboard or category
    !info add <category> <title> | <details> [| tag]  - Add/update item
    !info remove <category> [index]                 - Remove item
    !settings [option] [value]                      - Configure settings (Admin)
    
Settings Options:
    admin_role  - Role that can add to public categories
    pin_role    - Role that can access Pin Board
    pin_board   - Enable/disable Pin Board (true/false)
    chess_role  - Role to ping for match requests
"""

from __future__ import annotations

from typing import Optional, List, Literal, TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

from src.utils.logger import get_logger
from src.discord.services import GuildService, GuildSettings, get_category_icon, is_public_category

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# Lucian's color palette
LUCIAN_RED = 0x880000
LUCIAN_GOLD = 0xD4AF37
LUCIAN_DARK = 0x1a0000

# Function type for slash command dropdown
InfoFunction = Literal["show", "add", "remove"]


def get_user_role_ids(member: discord.Member) -> List[int]:
    """Extract role IDs from a member."""
    return [role.id for role in member.roles]


class SettingsView(discord.ui.View):
    """Interactive view for settings configuration."""
    
    def __init__(self, cog: GuildCog, author_id: int):
        super().__init__(timeout=120)
        self.cog = cog
        self.author_id = author_id
    
    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        """Only allow the original author to interact."""
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                "🧛 *These controls are not for you, mortal.*",
                ephemeral=True
            )
            return False
        return True
    
    @discord.ui.button(label="Set Admin Role", style=discord.ButtonStyle.primary, emoji="👑")
    async def set_admin_role(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show role select for admin role."""
        await interaction.response.send_message(
            "🧛 *Mention the role for **Admin** access (public category add):*\n"
            "Example: `@Officers`\n\n"
            "Or type `clear` to remove the current setting.",
            ephemeral=True
        )
        
        channel_id = interaction.channel.id if interaction.channel else None
        if not channel_id:
            return
        
        def check(m):
            return m.author.id == self.author_id and m.channel.id == channel_id
        
        try:
            msg = await self.cog.bot.wait_for("message", check=check, timeout=30)
            if msg.content.lower() == "clear":
                self.cog.service.set_setting("admin_role_id", None)
                await msg.reply("🧛 *Admin role cleared.*")
            elif msg.role_mentions:
                role = msg.role_mentions[0]
                self.cog.service.set_setting("admin_role_id", role.id)
                await msg.reply(f"🧛 *Admin role set to {role.mention}.*")
            else:
                await msg.reply("🧛 *No role detected. Try mentioning a role.*")
        except Exception:
            pass
    
    @discord.ui.button(label="Set Pin Role", style=discord.ButtonStyle.primary, emoji="📌")
    async def set_pin_role(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show role select for pin board role."""
        await interaction.response.send_message(
            "🧛 *Mention the role for **Pin Board** access:*\n"
            "Example: `@Staff`\n\n"
            "Or type `clear` to remove the current setting.",
            ephemeral=True
        )
        
        channel_id = interaction.channel.id if interaction.channel else None
        if not channel_id:
            return
        
        def check(m):
            return m.author.id == self.author_id and m.channel.id == channel_id
        
        try:
            msg = await self.cog.bot.wait_for("message", check=check, timeout=30)
            if msg.content.lower() == "clear":
                self.cog.service.set_setting("pin_role_id", None)
                await msg.reply("🧛 *Pin Board role cleared.*")
            elif msg.role_mentions:
                role = msg.role_mentions[0]
                self.cog.service.set_setting("pin_role_id", role.id)
                await msg.reply(f"🧛 *Pin Board role set to {role.mention}.*")
            else:
                await msg.reply("🧛 *No role detected. Try mentioning a role.*")
        except Exception:
            pass
    
    @discord.ui.button(label="Set Chess Role", style=discord.ButtonStyle.primary, emoji="♟️")
    async def set_chess_role(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Show role select for chess ping role."""
        await interaction.response.send_message(
            "🧛 *Mention the role for **Chess Match** pings:*\n"
            "Example: `@ChessPlayers`\n\n"
            "Or type `clear` to remove the current setting.",
            ephemeral=True
        )
        
        channel_id = interaction.channel.id if interaction.channel else None
        if not channel_id:
            return
        
        def check(m):
            return m.author.id == self.author_id and m.channel.id == channel_id
        
        try:
            msg = await self.cog.bot.wait_for("message", check=check, timeout=30)
            if msg.content.lower() == "clear":
                self.cog.service.set_setting("chess_role_id", None)
                await msg.reply("🧛 *Chess role cleared.*")
            elif msg.role_mentions:
                role = msg.role_mentions[0]
                self.cog.service.set_setting("chess_role_id", role.id)
                await msg.reply(f"🧛 *Chess role set to {role.mention}.*")
            else:
                await msg.reply("🧛 *No role detected. Try mentioning a role.*")
        except Exception:
            pass
    
    @discord.ui.button(label="Toggle Pin Board", style=discord.ButtonStyle.secondary, emoji="🔄")
    async def toggle_pin_board(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Toggle pin board visibility."""
        settings = self.cog.service.get_settings()
        new_value = not settings.pin_board_enabled
        self.cog.service.set_setting("pin_board_enabled", new_value)
        
        status = "✅ Enabled" if new_value else "❌ Disabled"
        await interaction.response.send_message(
            f"🧛 *Pin Board is now {status}.*",
            ephemeral=True
        )
    
    @discord.ui.button(label="Close", style=discord.ButtonStyle.danger, emoji="✖️")
    async def close_view(self, interaction: discord.Interaction, button: discord.ui.Button):
        """Close the settings view."""
        await interaction.response.defer()
        if interaction.message:
            await interaction.message.delete()
        self.stop()


class GuildCog(commands.Cog, name="Guild"):
    """Management - The Count's Castle Status & Pin Board.
    
    Public dashboard for all. Pin Board for the chosen.
    
    Unified !info command:
        !info show [category]                            - View dashboard or category
        !info add <category> <title> | <details> [| tag] - Add/update item
        !info remove <category> [index]                  - Remove item
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Guild cog."""
        self.bot = bot
        self.service: GuildService = GuildService()
        logger.info("GuildCog loaded - The Castle awakens")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    def _get_member_context(self, ctx: commands.Context) -> tuple[List[int], bool]:
        """Get role IDs and admin status from context author."""
        author = ctx.author
        role_ids: List[int] = []
        is_admin = False
        
        if isinstance(author, discord.Member):
            role_ids = [role.id for role in author.roles]
            is_admin = author.guild_permissions.administrator
        
        return role_ids, is_admin
    
    # ─────────────────────────────────────────────────────────────────
    # Unified Info Command Group
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_group(name="info", invoke_without_command=True)
    async def info(self, ctx: commands.Context) -> None:
        """Castle dashboard. Use: show, add, remove."""
        # If invoked without subcommand, show dashboard
        await self.info_show(ctx, category=None)
    
    @info.command(name="show")
    @app_commands.describe(category="Category to view (leave empty for full dashboard)")
    async def info_show(
        self, 
        ctx: commands.Context, 
        category: Optional[str] = None
    ) -> None:
        """View the Castle Status dashboard or a specific category.
        
        Usage:
            !info show              - Show full dashboard
            !info show event        - Show current event details
            !info show partners     - Show partner list
            !info show links        - Show links
            !info show <custom>     - Show Pin Board category (if you have access)
        """
        role_ids, is_admin = self._get_member_context(ctx)
        can_see_pin_board = self.service.can_access_pin_board(role_ids, is_admin)
        
        if category is None:
            await self._show_dashboard(ctx, can_see_pin_board)
        else:
            await self._show_category(ctx, category.lower(), can_see_pin_board)
    
    @info.command(name="add")
    @app_commands.describe(
        category="Category (event/partners/links = admin only, others = Pin Board)",
        content="Title | Details [| Tag] (pipe-separated)"
    )
    async def info_add(
        self, 
        ctx: commands.Context, 
        category: str,
        *, 
        content: str
    ) -> None:
        """Add content to the dashboard or Pin Board.
        
        Public categories (event, partners, links) require Admin role.
        Custom categories go to Pin Board and require Pin role.
        
        Format: !info add <category> <Title> | <Details> [| Tag]
        
        Examples:
            !info add event Chess Night | Weekly meetup | Friday 7PM | Room 101
            !info add partners ChessKid | Our sponsor
            !info add links Discord | https://discord.gg/example
            !info add tasks Fix Bug | There's a crash issue | urgent
            !info add ideas New Feature | Add rating display | enhancement
        """
        role_ids, is_admin = self._get_member_context(ctx)
        category = category.lower()
        is_public = is_public_category(category)
        
        # Permission check
        if is_public:
            if not self.service.can_push_public(role_ids, is_admin):
                await ctx.send(self._lucian_speak(
                    f"Only administrators may add to `{category}`. "
                    "Know your place, mortal."
                ))
                return
        else:
            if not self.service.can_access_pin_board(role_ids, is_admin):
                await ctx.send(self._lucian_speak(
                    "You lack the authority to use the Pin Board. "
                    "Seek a higher station."
                ))
                return
        
        # Parse content (pipe-separated: title | details | tag)
        parts = [p.strip() for p in content.split("|")]
        title = parts[0] if parts else ""
        details = parts[1] if len(parts) > 1 else ""
        tag = parts[2] if len(parts) > 2 else ""
        
        # For event, parts 3 and 4 are date and location
        extra = {}
        if category == "event":
            if len(parts) > 2:
                extra["date"] = parts[2]
                tag = ""  # Date takes precedence over tag for events
            if len(parts) > 3:
                extra["location"] = parts[3]
        
        if not title:
            await ctx.send(self._lucian_speak(
                "You must provide content. "
                f"Format: `!info add {category} Title | Details [| Tag]`"
            ))
            return
        
        # Push the item
        item = self.service.push_item(
            category=category,
            title=title,
            details=details,
            tag=tag,
            extra=extra,
            created_by=ctx.author.id
        )
        
        icon = get_category_icon(category)
        action = "Updated" if category in self.service.SINGULAR_CATEGORIES else "Added"
        section = "Castle Status" if is_public else "Pin Board"
        
        embed = discord.Embed(
            title=f"{icon} {category.title()} {action}",
            description=f"**{item.title}**",
            color=LUCIAN_RED if is_public else LUCIAN_GOLD
        )
        
        if details:
            embed.add_field(name="Details", value=details[:200], inline=False)
        
        if tag:
            embed.add_field(name="🏷️ Tag", value=f"`{tag}`", inline=True)
        
        for key, value in extra.items():
            embed.add_field(name=key.title(), value=value, inline=True)
        
        embed.set_footer(text=f"{section} • By {ctx.author.display_name}")
        await ctx.send(embed=embed)
        logger.info(f"Info add [{category}]: {title} by {ctx.author}")
    
    @info.command(name="remove")
    @app_commands.describe(
        category="Category to remove from",
        index="Index to remove (for list categories)"
    )
    async def info_remove(
        self, 
        ctx: commands.Context, 
        category: str,
        index: Optional[int] = None
    ) -> None:
        """Remove an item from the dashboard or Pin Board.
        
        Usage:
            !info remove event           - Clear the event
            !info remove partners 2      - Remove partner #2
            !info remove tasks 1         - Remove task #1 from Pin Board
        """
        role_ids, is_admin = self._get_member_context(ctx)
        category = category.lower()
        is_public = is_public_category(category)
        
        # Permission check
        if is_public:
            if not self.service.can_push_public(role_ids, is_admin):
                await ctx.send(self._lucian_speak(
                    f"Only administrators may modify `{category}`. "
                    "Know your place, mortal."
                ))
                return
        else:
            if not self.service.can_access_pin_board(role_ids, is_admin):
                await ctx.send(self._lucian_speak(
                    "You lack the authority to modify the Pin Board."
                ))
                return
        
        # Pop the item
        item = self.service.pop_item(category, index)
        
        if not item:
            await ctx.send(self._lucian_speak(
                f"Nothing to remove from `{category}`."
            ))
            return
        
        icon = get_category_icon(category)
        
        embed = discord.Embed(
            title=f"{icon} {category.title()} Removed",
            description=f"**{item.title}** has been eliminated.",
            color=LUCIAN_RED if is_public else LUCIAN_GOLD
        )
        embed.set_footer(text=f"Removed by {ctx.author.display_name}")
        await ctx.send(embed=embed)
        logger.info(f"Info remove [{category}]: {item.title} by {ctx.author}")
    
    # ─────────────────────────────────────────────────────────────────
    # Dashboard Display Helpers
    # ─────────────────────────────────────────────────────────────────
    
    async def _show_dashboard(self, ctx: commands.Context, show_pin_board: bool) -> None:
        """Display the full dashboard with optional Pin Board."""
        embed = discord.Embed(
            title="🏰 Castle Status",
            description="*The Count's ledger of affairs*",
            color=LUCIAN_RED
        )
        
        # Public Section
        public_cats = self.service.get_public_categories()
        has_public = False
        
        for cat in ["event", "partners", "links"]:  # Fixed order
            if cat in public_cats:
                icon = get_category_icon(cat)
                summary = self.service.get_category_summary(cat)
                if summary:
                    embed.add_field(
                        name=f"{icon} {cat.title()}",
                        value=summary,
                        inline=False
                    )
                    has_public = True
        
        if not has_public:
            embed.add_field(
                name="📭 Status",
                value="*No announcements at this time.*",
                inline=False
            )
        
        # Pin Board Section (role-gated)
        if show_pin_board:
            pin_cats = self.service.get_pin_board_categories()
            
            if pin_cats:
                embed.add_field(
                    name="━━━━━━━━━━━━━━━━━━",
                    value="📌 **PIN BOARD**",
                    inline=False
                )
                
                for cat in sorted(pin_cats):
                    icon = get_category_icon(cat)
                    summary = self.service.get_category_summary(cat)
                    if summary:
                        embed.add_field(
                            name=f"{icon} {cat.title()}",
                            value=summary,
                            inline=True
                        )
            else:
                embed.add_field(
                    name="━━━━━━━━━━━━━━━━━━",
                    value="📌 **PIN BOARD**\n*Empty - use `!info add <category>` to add*",
                    inline=False
                )
        
        embed.set_footer(text="!info show <category> for details • !info add <category> to add")
        await ctx.send(embed=embed)
    
    async def _show_category(
        self, 
        ctx: commands.Context, 
        category: str,
        can_see_pin_board: bool
    ) -> None:
        """Display a specific category's contents."""
        is_public = is_public_category(category)
        
        # Permission check for Pin Board categories
        if not is_public and not can_see_pin_board:
            await ctx.send(self._lucian_speak(
                "You lack the authority to view the Pin Board. "
                "Seek a higher station."
            ))
            return
        
        items = self.service.get_category_items(category)
        
        if not items:
            if is_public:
                await ctx.send(self._lucian_speak(
                    f"No {category} has been recorded. "
                    f"The ledger holds only dust."
                ))
            else:
                await ctx.send(self._lucian_speak(
                    f"Pin Board category `{category}` is empty. "
                    f"Use `!info add {category}` to create it."
                ))
            return
        
        icon = get_category_icon(category)
        
        # Singular categories (like event)
        if category in self.service.SINGULAR_CATEGORIES:
            item = items[0]
            embed = discord.Embed(
                title=f"{icon} {item.title}",
                description=item.details or "*No details*",
                color=LUCIAN_RED if is_public else LUCIAN_GOLD
            )
            
            if item.tag:
                embed.add_field(name="🏷️ Tag", value=f"`{item.tag}`", inline=True)
            
            for key, value in item.extra.items():
                embed.add_field(name=key.title(), value=value, inline=True)
            
            embed.set_footer(text=f"!info add {category} to update • !info remove {category} to clear")
            await ctx.send(embed=embed)
            return
        
        # List categories
        embed = discord.Embed(
            title=f"{icon} {category.title()}",
            description=f"**{len(items)}** item(s)",
            color=LUCIAN_RED if is_public else LUCIAN_GOLD
        )
        
        for i, item in enumerate(items, 1):
            value = item.format_brief()
            embed.add_field(
                name=f"[{i}] {item.title}",
                value=value if len(value) < 100 else value[:97] + "...",
                inline=False
            )
        
        section = "Public" if is_public else "Pin Board"
        embed.set_footer(text=f"{section} • !info remove {category} <n> to remove")
        await ctx.send(embed=embed)
    
    # ─────────────────────────────────────────────────────────────────
    # Settings Command - Configure Roles
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="settings")
    @commands.has_permissions(administrator=True)
    @app_commands.describe(
        option="Setting to change (admin_role, pin_role, pin_board, chess_role)",
        value="Value to set (role mention, true/false, or 'clear')"
    )
    @app_commands.choices(option=[
        app_commands.Choice(name="admin_role", value="admin_role"),
        app_commands.Choice(name="pin_role", value="pin_role"),
        app_commands.Choice(name="pin_board", value="pin_board"),
        app_commands.Choice(name="chess_role", value="chess_role"),
    ])
    async def settings(
        self, 
        ctx: commands.Context, 
        option: Optional[str] = None,
        *, 
        value: Optional[str] = None
    ) -> None:
        """Configure guild settings (Admin only).
        
        Without arguments: Shows interactive settings dashboard.
        
        Options:
            admin_role  - Role that can add to public categories
            pin_role    - Role that can access Pin Board
            pin_board   - Enable/disable Pin Board (true/false)
            chess_role  - Role to ping for match requests
        
        Examples:
            !settings                           - Show interactive dashboard
            !settings admin_role @Officers      - Set admin role
            !settings pin_role @Staff           - Set Pin Board role
            !settings pin_board false           - Disable Pin Board
            !settings chess_role @ChessPlayers  - Set chess ping role
            !settings admin_role clear          - Clear admin role
        """
        # No arguments - show interactive dashboard
        if option is None:
            await self._show_settings_dashboard(ctx)
            return
        
        # Handle role mentions in value
        if value:
            # Check for role mention
            if ctx.message.role_mentions:
                role = ctx.message.role_mentions[0]
                value = str(role.id)
            elif value.lower() == "clear":
                value = None
        
        # Update setting
        option = option.lower()
        success = self.service.set_setting(option, value)
        
        if success:
            display = self.service.get_settings_display()
            setting_name = {
                "admin_role": "Admin Role",
                "admin_role_id": "Admin Role",
                "pin_role": "Pin Board Role",
                "pin_role_id": "Pin Board Role",
                "pin_board": "Pin Board Enabled",
                "pin_board_enabled": "Pin Board Enabled",
                "chess_role": "Chess Ping Role",
                "chess_role_id": "Chess Ping Role"
            }.get(option, option)
            
            new_value = display.get(setting_name, str(value))
            
            await ctx.send(self._lucian_speak(
                f"Setting updated: **{setting_name}** → {new_value}"
            ))
        else:
            await ctx.send(self._lucian_speak(
                f"Unknown setting: `{option}`. "
                "Valid options: `admin_role`, `pin_role`, `pin_board`, `chess_role`"
            ))
    
    async def _show_settings_dashboard(self, ctx: commands.Context) -> None:
        """Show interactive settings dashboard."""
        settings = self.service.get_settings()
        display = self.service.get_settings_display()
        
        embed = discord.Embed(
            title="⚙️ Guild Settings",
            description="*Configure the Castle's access controls*",
            color=LUCIAN_GOLD
        )
        
        embed.add_field(
            name="👑 Admin Role",
            value=f"{display.get('Admin Role', 'Not set')}\n*Can add to event, partners, links*",
            inline=False
        )
        
        embed.add_field(
            name="📌 Pin Board Role",
            value=f"{display.get('Pin Board Role', 'Not set')}\n*Can see and add to Pin Board*",
            inline=False
        )
        
        embed.add_field(
            name="♟️ Chess Ping Role",
            value=f"{display.get('Chess Ping Role', 'Not set')}\n*Pinged for match requests*",
            inline=False
        )
        
        embed.add_field(
            name="🔄 Pin Board Enabled",
            value=f"{display.get('Pin Board Enabled', 'Yes')}\n*Toggle Pin Board visibility*",
            inline=False
        )
        
        embed.set_footer(text="Click buttons below to configure • Timeout: 2 minutes")
        
        view = SettingsView(self, ctx.author.id)
        await ctx.send(embed=embed, view=view)
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @info.error
    @settings.error
    async def guild_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle errors in guild commands."""
        if isinstance(error, commands.CheckFailure):
            await ctx.send(self._lucian_speak(
                "You lack the authority for this command. "
                "Know your place, mortal."
            ))
        elif isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing: `{error.param.name}`. "
                "I cannot read your mind. Unfortunately."
            ))
        elif isinstance(error, commands.MissingPermissions):
            await ctx.send(self._lucian_speak(
                "This command requires Administrator permission."
            ))
        elif isinstance(error, commands.BadArgument):
            await ctx.send(self._lucian_speak(
                "Invalid argument. Numbers are numbers, words are words."
            ))
        else:
            logger.error(f"Guild error: {error}")
            await ctx.send(self._lucian_speak(
                "An error has occurred. Even immortals face bugs."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(GuildCog(bot))
    logger.info("Guild cog setup complete")
