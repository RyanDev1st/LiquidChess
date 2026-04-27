"""Persistence mixin for the guild dashboard service."""

from __future__ import annotations

import json

from .guild_service_models import DashboardItem, GuildSettings


class GuildPersistenceMixin:
    """Persistence helpers for GuildService."""

    def _load_data(self) -> None:
        self._load_settings()
        self._load_dashboard()
        self._migrate_legacy_data()

    def _load_settings(self) -> None:
        path = self._storage_dir / "settings.json"
        if not path.exists():
            return
        try:
            with path.open("r", encoding="utf-8") as handle:
                self._settings = GuildSettings.from_dict(json.load(handle))
            self._logger.debug("Settings loaded")
        except Exception as exc:
            self._logger.error("Failed to load settings: %s", exc)

    def _save_settings(self) -> None:
        path = self._storage_dir / "settings.json"
        try:
            with path.open("w", encoding="utf-8") as handle:
                json.dump(self._settings.to_dict(), handle, indent=2)
            self._logger.debug("Settings saved")
        except Exception as exc:
            self._logger.error("Failed to save settings: %s", exc)

    def _load_dashboard(self) -> None:
        path = self._storage_dir / "dashboard.json"
        if not path.exists():
            return
        try:
            with path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            for category, items in data.items():
                self._dashboard[category] = [DashboardItem.from_dict(item) for item in items]
            self._logger.debug("Loaded dashboard with %s categories", len(self._dashboard))
        except Exception as exc:
            self._logger.error("Failed to load dashboard: %s", exc)

    def _save_dashboard(self) -> None:
        path = self._storage_dir / "dashboard.json"
        try:
            payload = {category: [item.to_dict() for item in items] for category, items in self._dashboard.items()}
            with path.open("w", encoding="utf-8") as handle:
                json.dump(payload, handle, indent=2)
            self._logger.debug("Dashboard saved")
        except Exception as exc:
            self._logger.error("Failed to save dashboard: %s", exc)

    def _migrate_legacy_data(self) -> None:
        self._migrate_guild_info()
        self._migrate_work_items()

    def _migrate_guild_info(self) -> None:
        legacy_path = self._storage_dir / "guild_info.json"
        if not legacy_path.exists():
            return
        try:
            with legacy_path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            migrated = False
            if data.get("event") and "event" not in self._dashboard:
                event = data["event"]
                extra = {}
                if event.get("date"):
                    extra["date"] = event["date"]
                if event.get("location"):
                    extra["location"] = event["location"]
                self._dashboard["event"] = [DashboardItem(title=event.get("title", "Event"), details=event.get("description", ""), extra=extra)]
                migrated = True
            if data.get("partners") and "partners" not in self._dashboard:
                self._dashboard["partners"] = [DashboardItem(title=partner) for partner in data["partners"]]
                migrated = True
            if data.get("links") and "links" not in self._dashboard:
                self._dashboard["links"] = [DashboardItem(title=name, details=url) for name, url in data["links"].items()]
                migrated = True
            if migrated:
                self._save_dashboard()
                legacy_path.rename(self._storage_dir / "guild_info.json.migrated")
                self._logger.info("Migrated legacy guild_info.json to dashboard format")
        except Exception as exc:
            self._logger.error("Failed to migrate legacy data: %s", exc)

    def _migrate_work_items(self) -> None:
        work_path = self._storage_dir / "work_items.json"
        if not work_path.exists():
            return
        try:
            with work_path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            items = data.get("items", [])
            if items and "tasks" not in self._dashboard:
                self._dashboard["tasks"] = [
                    DashboardItem(
                        title=item.get("title", "Task"),
                        details=item.get("details", ""),
                        created_at=item.get("created_at", ""),
                        created_by=item.get("created_by"),
                    )
                    for item in items
                    if not item.get("completed", False)
                ]
                self._save_dashboard()
                work_path.rename(self._storage_dir / "work_items.json.migrated")
                self._logger.info("Migrated work_items.json to tasks category")
        except Exception as exc:
            self._logger.error("Failed to migrate work items: %s", exc)
