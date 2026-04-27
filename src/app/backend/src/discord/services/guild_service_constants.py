"""Constants for the guild dashboard service."""

from __future__ import annotations

from typing import Set

PUBLIC_CATEGORIES: Set[str] = {"event", "partners", "links"}

CATEGORY_ICONS = {
    "event": "📅",
    "partners": "🤝",
    "links": "🔗",
    "sponsors": "💎",
    "schedule": "📆",
    "announcements": "📢",
    "rules": "📜",
    "staff": "👥",
    "prizes": "🏆",
    "tasks": "📋",
    "notes": "📝",
    "ideas": "💡",
    "bugs": "🐛",
    "todo": "✅",
}


def get_category_icon(category: str) -> str:
    """Get icon for a category, defaulting to the pin board icon."""
    return CATEGORY_ICONS.get(category.lower(), "📌")


def is_public_category(category: str) -> bool:
    """Check if a category belongs to the public dashboard section."""
    return category.lower() in PUBLIC_CATEGORIES
