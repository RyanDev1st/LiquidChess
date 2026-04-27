"""Wrapper to run the Discord bot from the repository root."""

from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from src.discord.main import main


if __name__ == "__main__":
    main()
