"""Watcher Module - THE EYES of LiquidChess.

Handles polling chess.com's live game endpoint and decoding TCN move strings.
"""

from .poller import GamePoller, GameState, PollResult, TurnColor
from .tcn_decoder import TCNDecoder

__all__ = ["GamePoller", "GameState", "PollResult", "TCNDecoder", "TurnColor"]
