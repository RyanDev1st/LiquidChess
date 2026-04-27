"""Argument parsing for the LiquidChess CLI."""

from __future__ import annotations

import argparse

from src.utils.paths import CONFIG_DIR


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="LiquidChess - The Vampire Chess Commentator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --game-id 12345678 --color white
  python main.py -g 12345678 -c black --vision
  python main.py -g 12345678 --stockfish /path/to/stockfish
        """,
    )
    parser.add_argument("-g", "--game-id", type=str, required=True, help="Chess.com game ID to observe")
    parser.add_argument(
        "-c",
        "--color",
        type=str,
        choices=["white", "black"],
        default="white",
        help="Which color you are playing (default: white)",
    )
    parser.add_argument(
        "--stockfish",
        type=str,
        default=None,
        help="Path to Stockfish executable (auto-detects if not provided)",
    )
    parser.add_argument(
        "--groq-key",
        type=str,
        default=None,
        help="Groq API key (uses GROQ_API_KEY env var if not provided)",
    )
    parser.add_argument("--vision", action="store_true", help="Enable vision analysis")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose logging (DEBUG level)")
    parser.add_argument(
        "--config",
        type=str,
        default=str(CONFIG_DIR / "settings.yaml"),
        help="Path to configuration file",
    )
    parser.add_argument(
        "--enable-tracing",
        action="store_true",
        help="Enable OpenTelemetry tracing for debugging and performance monitoring",
    )
    return parser.parse_args()
