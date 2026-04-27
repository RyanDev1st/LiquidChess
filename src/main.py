"""Repository-root compatibility wrapper for the backend entrypoint."""

from pathlib import Path
import runpy
import sys

BACKEND_ROOT = Path(__file__).resolve().parent / "app" / "backend"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

if __name__ == "__main__":
    runpy.run_path(
        str(BACKEND_ROOT / "main.py"),
        run_name="__main__",
    )
