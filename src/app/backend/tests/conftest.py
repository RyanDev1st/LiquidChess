"""Pytest configuration and shared fixtures."""

import sys
from pathlib import Path

import pytest
import chess


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture
def starting_position():
    """Standard chess starting position."""
    return chess.Board()


@pytest.fixture
def midgame_position():
    """Complex midgame position with tactical opportunities."""
    board = chess.Board()
    board.set_fen("r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5")
    return board


@pytest.fixture
def endgame_position():
    """King and pawn endgame."""
    board = chess.Board()
    board.set_fen("8/8/8/4k3/8/8/4K3/8 w - - 0 1")
    return board


@pytest.fixture
def tactical_position():
    """Position with hanging pieces and tactical shots."""
    board = chess.Board()
    board.set_fen("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4")
    return board


@pytest.fixture
def mate_in_one():
    """Simple mate in one puzzle."""
    board = chess.Board()
    board.set_fen("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4")
    return board


@pytest.fixture
def project_root():
    """Project root directory."""
    return BACKEND_ROOT
