"""Settings and permission mixins for the guild dashboard service."""

from __future__ import annotations

from typing import Any, Dict, List


class GuildSettingsMixin:
    """Settings and permission helpers for GuildService."""

    def get_settings(self):
        return self._settings

    def set_setting(self, key: str, value: Any) -> bool:
        key = key.lower().replace("-", "_").replace(" ", "_")
        if key in {"admin_role_id", "admin_role"}:
            self._settings.admin_role_id = int(value) if value else None
        elif key in {"pin_role_id", "pin_role"}:
            self._settings.pin_role_id = int(value) if value else None
        elif key in {"pin_board_enabled", "pin_board"}:
            self._settings.pin_board_enabled = value if isinstance(value, bool) else str(value).lower() in {"1", "true", "yes", "on"}
        elif key in {"chess_role_id", "chess_role"}:
            self._settings.chess_role_id = int(value) if value else None
        else:
            return False

        self._save_settings()
        self._logger.info("Setting updated: %s = %s", key, value)
        return True

    def get_settings_display(self) -> Dict[str, str]:
        return {
            "Admin Role": f"<@&{self._settings.admin_role_id}>" if self._settings.admin_role_id else "*Not Set*",
            "Pin Board Role": f"<@&{self._settings.pin_role_id}>" if self._settings.pin_role_id else "*Not Set*",
            "Chess Ping Role": f"<@&{self._settings.chess_role_id}>" if self._settings.chess_role_id else "*Not Set*",
            "Pin Board Enabled": "✅ Yes" if self._settings.pin_board_enabled else "❌ No",
        }

    def can_push_public(self, user_role_ids: List[int], is_admin: bool) -> bool:
        return is_admin or bool(self._settings.admin_role_id and self._settings.admin_role_id in user_role_ids)

    def can_access_pin_board(self, user_role_ids: List[int], is_admin: bool) -> bool:
        return self._settings.pin_board_enabled and (
            is_admin or bool(self._settings.pin_role_id and self._settings.pin_role_id in user_role_ids)
        )
