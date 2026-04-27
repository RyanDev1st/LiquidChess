"""Dashboard item mixin for the guild dashboard service."""

from __future__ import annotations

from typing import Dict, List, Optional

from .guild_service_constants import is_public_category
from .guild_service_models import DashboardItem


class GuildDashboardMixin:
    """Dashboard operations for GuildService."""

    SINGULAR_CATEGORIES = {"event"}

    def get_public_categories(self) -> List[str]:
        return [category for category in self._dashboard if is_public_category(category)]

    def get_pin_board_categories(self) -> List[str]:
        return [category for category in self._dashboard if not is_public_category(category)]

    def get_all_categories(self) -> List[str]:
        return sorted(self._dashboard.keys())

    def get_category_items(self, category: str) -> List[DashboardItem]:
        return self._dashboard.get(category.lower(), []).copy()

    def get_category_summary(self, category: str) -> Optional[str]:
        items = self._dashboard.get(category.lower(), [])
        if not items:
            return None
        if category.lower() in self.SINGULAR_CATEGORIES:
            item = items[0]
            summary = item.title
            if item.extra.get("date") or item.extra.get("time"):
                summary += f" @ {item.extra.get('date') or item.extra.get('time')}"
            return summary
        return ", ".join(item.title for item in items) if len(items) <= 3 else f"**{len(items)}** items"

    def push_item(
        self,
        category: str,
        title: str,
        details: str = "",
        tag: str = "",
        extra: Optional[Dict[str, str]] = None,
        created_by: Optional[int] = None,
    ) -> DashboardItem:
        cat_lower = category.lower()
        item = DashboardItem(title=title, details=details, tag=tag, extra=extra or {}, created_by=created_by)
        self._dashboard.setdefault(cat_lower, [])
        self._dashboard[cat_lower] = [item] if cat_lower in self.SINGULAR_CATEGORIES else [*self._dashboard[cat_lower], item]
        self._save_dashboard()
        self._logger.info("Dashboard item pushed to [%s]: %s", cat_lower, title)
        return item

    def pop_item(self, category: str, index: Optional[int] = None) -> Optional[DashboardItem]:
        cat_lower = category.lower()
        items = self._dashboard.get(cat_lower, [])
        if not items:
            return None
        if cat_lower in self.SINGULAR_CATEGORIES:
            item = items[0]
            self._dashboard[cat_lower] = []
            self._save_dashboard()
            self._logger.info("Dashboard item cleared from [%s]: %s", cat_lower, item.title)
            return item

        target_index = len(items) if index is None else index
        if 1 <= target_index <= len(items):
            item = items.pop(target_index - 1)
            if not items:
                del self._dashboard[cat_lower]
            self._save_dashboard()
            self._logger.info("Dashboard item popped from [%s]: %s", cat_lower, item.title)
            return item
        return None

    def clear_category(self, category: str) -> int:
        cat_lower = category.lower()
        count = len(self._dashboard.get(cat_lower, []))
        if cat_lower in self._dashboard:
            del self._dashboard[cat_lower]
            self._save_dashboard()
            self._logger.info("Cleared category [%s]: %s items removed", cat_lower, count)
        return count

    def get_event(self) -> Optional[DashboardItem]:
        items = self._dashboard.get("event", [])
        return items[0] if items else None

    def set_event(
        self,
        title: str,
        description: str,
        date: Optional[str] = None,
        location: Optional[str] = None,
        updated_by: Optional[int] = None,
    ) -> DashboardItem:
        extra = {}
        if date:
            extra["date"] = date
        if location:
            extra["location"] = location
        return self.push_item("event", title, description, "", extra, updated_by)

    def get_partners(self) -> List[str]:
        return [item.title for item in self._dashboard.get("partners", [])]

    def get_links(self) -> Dict[str, str]:
        return {item.title: item.details for item in self._dashboard.get("links", [])}
