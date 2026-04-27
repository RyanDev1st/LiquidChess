"""Discord Cogs - Command Modules for Count Lucian.

Cog Architecture:
    - ArenaCog:       Live chess streaming (!live, !stop, !switchlive, !listlive)
    - GuildCog:       Dashboard management (!info show/add/remove, !settings)
    - JesterCog:      Entertainment (!meme, !roast)
    - UtilityCog:     Personal tools (!save, !codex, !clear)
    - MatchCog:       Matchmaking system (!match, !verify)
    - ProgressionCog: Leveling/XP (!rank, !leaderboard, !grantxp)
    - FateCog:        Tabletop/DnD tools (!roll, !flip, !turn)
    - GatekeeperCog:  Onboarding (!greet)
"""

from .arena import ArenaCog
from .guild import GuildCog
from .jester import JesterCog
from .utility import UtilityCog
from .match import MatchCog
from .progression import ProgressionCog
from .fate import FateCog
from .gatekeeper import GatekeeperCog

__all__ = [
    "ArenaCog",
    "GuildCog",
    "JesterCog",
    "UtilityCog",
    "MatchCog",
    "ProgressionCog",
    "FateCog",
    "GatekeeperCog",
]
