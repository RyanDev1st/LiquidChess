"""UtilityCog - Personal Utility Commands.

Commands for personal game saving and quick reference.
Every mortal needs their own codex.

Commands:
    !save <link> [note]  - Save a game link with optional note
    !codex [id]          - List or retrieve saved items
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, TYPE_CHECKING

import discord
from discord import app_commands
from discord.ext import commands

from src.utils.logger import get_logger
from src.utils.paths import DATA_DIR

if TYPE_CHECKING:
    from src.discord.main import LiquidChessBot

logger = get_logger(__name__)

# Lucian's color palette
LUCIAN_RED = 0x880000

# NATO phonetic alphabet for quick reference
NATO_ALPHABET = [
    "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot",
    "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima",
    "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo",
    "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray",
    "Yankee", "Zulu"
]

# Storage path
SAVES_DIR = DATA_DIR / "user_saves"


class SavedItem:
    """Represents a saved game link."""
    
    def __init__(
        self,
        link: str,
        note: Optional[str] = None,
        saved_at: Optional[str] = None,
        nato_code: Optional[str] = None
    ) -> None:
        self.link = link
        self.note = note
        self.saved_at = saved_at or datetime.now().isoformat()
        self.nato_code = nato_code
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "link": self.link,
            "note": self.note,
            "saved_at": self.saved_at,
            "nato_code": self.nato_code
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> SavedItem:
        """Create from dictionary."""
        return cls(**data)


class UtilityCog(commands.Cog, name="Utility"):
    """Personal - Save and retrieve game links.
    
    Count Lucian grudgingly maintains a library for mortals.
    """
    
    def __init__(self, bot: LiquidChessBot) -> None:
        """Initialize the Utility cog.
        
        Args:
            bot: The LiquidChess bot instance
        """
        self.bot = bot
        
        # Ensure storage directory exists
        SAVES_DIR.mkdir(parents=True, exist_ok=True)
        
        # In-memory cache of user saves
        self._cache: Dict[int, List[SavedItem]] = {}
        
        logger.info("UtilityCog loaded - The personal codex opens")
    
    def _lucian_speak(self, message: str) -> str:
        """Wrap message in Count Lucian's voice."""
        return f"🧛 *{message}*"
    
    def _get_user_file(self, user_id: int) -> Path:
        """Get the storage file path for a user."""
        return SAVES_DIR / f"{user_id}.json"
    
    def _load_user_saves(self, user_id: int) -> List[SavedItem]:
        """Load saved items for a user.
        
        Args:
            user_id: Discord user ID
            
        Returns:
            List of SavedItem objects
        """
        # Check cache first
        if user_id in self._cache:
            return self._cache[user_id]
        
        file_path = self._get_user_file(user_id)
        
        if not file_path.exists():
            self._cache[user_id] = []
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            items = [SavedItem.from_dict(item) for item in data.get("saves", [])]
            self._cache[user_id] = items
            return items
            
        except Exception as e:
            logger.error(f"Failed to load saves for user {user_id}: {e}")
            return []
    
    def _save_user_saves(self, user_id: int, items: List[SavedItem]) -> None:
        """Save items for a user.
        
        Args:
            user_id: Discord user ID
            items: List of SavedItem objects
        """
        file_path = self._get_user_file(user_id)
        
        try:
            data = {"saves": [item.to_dict() for item in items]}
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            # Update cache
            self._cache[user_id] = items
            
        except Exception as e:
            logger.error(f"Failed to save for user {user_id}: {e}")
    
    def _assign_nato_codes(self, items: List[SavedItem]) -> None:
        """Assign NATO codes to the last 26 items.
        
        Args:
            items: List of SavedItem objects (modified in place)
        """
        # Clear existing codes
        for item in items:
            item.nato_code = None
        
        # Assign to last 26
        start_index = max(0, len(items) - 26)
        nato_items = items[start_index:]
        
        for i, item in enumerate(nato_items):
            item.nato_code = NATO_ALPHABET[i]
    
    def _find_by_nato(
        self, 
        items: List[SavedItem], 
        code: str
    ) -> Optional[SavedItem]:
        """Find an item by NATO code.
        
        Args:
            items: List of SavedItem objects
            code: NATO code (case-insensitive)
            
        Returns:
            SavedItem or None
        """
        code_upper = code.upper()
        code_title = code.title()
        
        for item in items:
            if item.nato_code and item.nato_code.upper() == code_upper:
                return item
            if item.nato_code == code_title:
                return item
        
        return None
    
    # ─────────────────────────────────────────────────────────────────
    # Commands
    # ─────────────────────────────────────────────────────────────────
    
    @commands.hybrid_command(name="save", description="Save a game link to your personal codex")
    async def save(
        self, 
        ctx: commands.Context, 
        link: str, 
        *, 
        note: Optional[str] = None
    ) -> None:
        """Save a game link to your personal codex.
        
        Args:
            ctx: Command context
            link: Game link (Chess.com, Lichess, etc.)
            note: Optional note about the game
        """
        user_id = ctx.author.id
        
        # Validate link
        if not link.startswith(("http://", "https://")):
            await ctx.send(self._lucian_speak(
                "That does not appear to be a valid link. "
                "I do not save nonsense."
            ))
            return
        
        # Load existing saves
        items = self._load_user_saves(user_id)
        
        # Create new item
        new_item = SavedItem(link=link, note=note)
        items.append(new_item)
        
        # Re-assign NATO codes
        self._assign_nato_codes(items)
        
        # Save
        self._save_user_saves(user_id, items)
        
        # Get the NATO code for this item
        nato_code = items[-1].nato_code if items else None
        
        embed = discord.Embed(
            title="📖 Saved to Codex",
            description=f"[Link]({link})",
            color=LUCIAN_RED
        )
        
        if note:
            embed.add_field(name="Note", value=note[:200], inline=False)
        
        embed.add_field(name="Index", value=f"#{len(items)}", inline=True)
        
        if nato_code:
            embed.add_field(name="Quick Code", value=f"`{nato_code}`", inline=True)
        
        embed.set_footer(text=f"Total saves: {len(items)}")
        
        await ctx.send(embed=embed)
        logger.info(f"User {user_id} saved link: {link[:50]}...")
    
    @commands.hybrid_command(name="codex", description="Access your personal codex of saved games")
    async def codex(
        self, 
        ctx: commands.Context, 
        identifier: Optional[str] = None
    ) -> None:
        """Access your personal codex of saved games.
        
        Usage:
            !codex          - List all saved items
            !codex 5        - Get item #5
            !codex Alpha    - Get item with NATO code Alpha
        
        Args:
            ctx: Command context
            identifier: Item number or NATO code (optional)
        """
        user_id = ctx.author.id
        items = self._load_user_saves(user_id)
        
        if not items:
            await ctx.send(self._lucian_speak(
                "Your codex is empty. "
                "Use `!save <link>` to begin your collection."
            ))
            return
        
        # Ensure NATO codes are assigned
        self._assign_nato_codes(items)
        
        # No identifier - list all
        if identifier is None:
            await self._list_codex(ctx, items)
            return
        
        # Try to find by identifier
        item = None
        
        # Try as number first
        try:
            index = int(identifier)
            if 1 <= index <= len(items):
                item = items[index - 1]
        except ValueError:
            # Try as NATO code
            item = self._find_by_nato(items, identifier)
        
        if item:
            await self._show_codex_item(ctx, item, items.index(item) + 1)
        else:
            await ctx.send(self._lucian_speak(
                f"No entry found for `{identifier}`. "
                "Check your codex with `!codex`."
            ))
    
    async def _list_codex(
        self, 
        ctx: commands.Context, 
        items: List[SavedItem]
    ) -> None:
        """List all items in the codex.
        
        Args:
            ctx: Command context
            items: List of SavedItem objects
        """
        embed = discord.Embed(
            title="📚 Your Personal Codex",
            description=f"**{len(items)}** game(s) archived",
            color=LUCIAN_RED
        )
        
        # Show last 10 items with NATO codes
        display_items = items[-10:] if len(items) > 10 else items
        start_index = len(items) - len(display_items) + 1
        
        for i, item in enumerate(display_items, start_index):
            # Truncate note for list view
            note_preview = ""
            if item.note:
                note_preview = f" - {item.note[:30]}..."
            
            nato_badge = f" `{item.nato_code}`" if item.nato_code else ""
            
            embed.add_field(
                name=f"[{i}]{nato_badge}",
                value=f"[Link]({item.link}){note_preview}",
                inline=False
            )
        
        if len(items) > 10:
            embed.set_footer(
                text=f"Showing last 10 of {len(items)} • "
                     "Use !codex <n> or !codex <NatoCode> to view"
            )
        else:
            embed.set_footer(text="Use !codex <n> or !codex <NatoCode> to view details")
        
        await ctx.send(embed=embed)
    
    async def _show_codex_item(
        self, 
        ctx: commands.Context, 
        item: SavedItem,
        index: int
    ) -> None:
        """Show a single codex item in detail.
        
        Args:
            ctx: Command context
            item: SavedItem to display
            index: 1-based index
        """
        embed = discord.Embed(
            title=f"📖 Codex Entry #{index}",
            description=f"[Open Game]({item.link})",
            color=LUCIAN_RED
        )
        
        if item.note:
            embed.add_field(name="Note", value=item.note, inline=False)
        
        embed.add_field(
            name="Saved", 
            value=item.saved_at[:10] if item.saved_at else "Unknown", 
            inline=True
        )
        
        if item.nato_code:
            embed.add_field(name="Quick Code", value=f"`{item.nato_code}`", inline=True)
        
        embed.set_footer(text="The past is never truly dead")
        
        await ctx.send(embed=embed)
    
    @commands.hybrid_command(name="codex_clear", description="Clear your entire codex")
    async def codex_clear(self, ctx: commands.Context) -> None:
        """Clear your entire codex. Use with caution."""
        user_id = ctx.author.id
        items = self._load_user_saves(user_id)
        
        if not items:
            await ctx.send(self._lucian_speak(
                "Your codex is already empty. "
                "There is nothing to destroy."
            ))
            return
        
        # Clear saves
        self._save_user_saves(user_id, [])
        
        await ctx.send(self._lucian_speak(
            f"Your codex has been purged. "
            f"**{len(items)}** entries reduced to ash."
        ))
        logger.info(f"User {user_id} cleared their codex ({len(items)} items)")
    
    # ─────────────────────────────────────────────────────────────────
    # Error Handling
    # ─────────────────────────────────────────────────────────────────
    
    @save.error
    @codex.error
    async def utility_error(
        self, 
        ctx: commands.Context, 
        error: commands.CommandError
    ) -> None:
        """Handle errors in utility commands."""
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(self._lucian_speak(
                f"Missing: `{error.param.name}`. "
                "Even simple tasks require attention."
            ))
        elif isinstance(error, commands.BadArgument):
            await ctx.send(self._lucian_speak(
                "Invalid input. Check your syntax, mortal."
            ))
        else:
            logger.error(f"Utility error: {error}")
            await ctx.send(self._lucian_speak(
                "An error in the codex. Unexpected, but not impossible."
            ))


async def setup(bot: LiquidChessBot) -> None:
    """Setup function for loading the cog."""
    await bot.add_cog(UtilityCog(bot))
    logger.info("Utility cog setup complete")
