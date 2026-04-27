"""Configuration loading helpers for the LiquidChess CLI."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from src.utils.paths import CONFIG_DIR


def load_runtime_environment() -> None:
    """Load environment variables from the local secrets file if present."""
    secrets_path = CONFIG_DIR / "secrets.env"
    if secrets_path.exists():
        load_dotenv(secrets_path)


def load_config(config_path: str = "config/settings.yaml") -> dict[str, Any]:
    """Load configuration from a YAML file."""
    path = Path(config_path)
    if not path.is_absolute():
        path = CONFIG_DIR / path.name if path.parts[:1] == ("config",) else path
    if not path.exists() and config_path == "config/settings.yaml":
        path = CONFIG_DIR / "settings.yaml"
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def resolve_groq_key(cli_value: str | None, config_data: dict[str, Any]) -> str | None:
    """Resolve the Groq API key from CLI args, env vars, or config."""
    return cli_value or os.environ.get("GROQ_API_KEY") or config_data.get("groq", {}).get("api_key")
