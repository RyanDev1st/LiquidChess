"""Data models for the guild dashboard service."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class GuildSettings:
    """Guild-specific settings for the dashboard system."""

    admin_role_id: Optional[int] = None
    pin_role_id: Optional[int] = None
    pin_board_enabled: bool = True
    chess_role_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "GuildSettings":
        return cls(**data)


@dataclass
class DashboardItem:
    """Represents a single item in any dashboard category."""

    title: str
    details: str = ""
    tag: str = ""
    extra: Dict[str, str] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    created_by: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DashboardItem":
        return cls(**data)

    def format_brief(self) -> str:
        parts = [self.title]
        if self.tag:
            parts.append(f"`{self.tag}`")
        if self.details:
            preview = self.details[:50] + "..." if len(self.details) > 50 else self.details
            parts.append(f"— {preview}")
        return " ".join(parts)

    def format_full(self) -> str:
        lines = [f"**{self.title}**"]
        if self.tag:
            lines.append(f"🏷️ Tag: `{self.tag}`")
        if self.details:
            lines.append(self.details)
        for key, value in self.extra.items():
            lines.append(f"• {key.title()}: {value}")
        return "\n".join(lines)


@dataclass
class EventInfo:
    """Legacy compatibility event model."""

    title: str
    description: str
    date: Optional[str] = None
    location: Optional[str] = None
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_by: Optional[int] = None
