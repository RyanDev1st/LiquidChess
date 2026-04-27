"""Wrapper to run benchmarks from the repository root."""

from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from tests.benchmarks import main
import asyncio


if __name__ == "__main__":
    asyncio.run(main())
