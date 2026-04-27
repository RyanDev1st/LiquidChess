"""Guild dashboard service with JSON-backed persistence."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

from src.utils.logger import get_logger
from src.utils.paths import DATA_DIR

from .guild_service_constants import PUBLIC_CATEGORIES, get_category_icon, is_public_category
from .guild_service_dashboard import GuildDashboardMixin
from .guild_service_models import DashboardItem, EventInfo, GuildSettings
from .guild_service_persistence import GuildPersistenceMixin
from .guild_service_settings import GuildSettingsMixin

DEFAULT_STORAGE_DIR = DATA_DIR / "guild"


class GuildService(
    GuildSettingsMixin,
    GuildDashboardMixin,
    GuildPersistenceMixin,
):
    """Singleton service for unified guild dashboard management."""

    _instance: Optional["GuildService"] = None

    def __new__(cls) -> "GuildService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, storage_dir: Optional[Path] = None) -> None:
        if self._initialized:
            return
        self._logger = get_logger(__name__)
        self._storage_dir = storage_dir or DEFAULT_STORAGE_DIR
        self._dashboard: Dict[str, List[DashboardItem]] = {}
        self._settings = GuildSettings()
        self._storage_dir.mkdir(parents=True, exist_ok=True)
        self._load_data()
        self._initialized = True
        self._logger.info("GuildService initialized (storage: %s)", self._storage_dir)


__all__ = [
    "DashboardItem",
    "EventInfo",
    "GuildService",
    "GuildSettings",
    "PUBLIC_CATEGORIES",
    "get_category_icon",
    "is_public_category",
]
