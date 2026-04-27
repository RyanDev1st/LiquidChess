"""Game Poller - Async polling of Chess.com live game endpoint.

Uses aiohttp for connection pooling with Keep-Alive support.
Implements adaptive polling based on whose turn it is.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any

import aiohttp
import chess
from pydantic import BaseModel, Field

from src.watcher.tcn_decoder import TCNDecoder, TCNDecodeError
from src.utils.logger import get_logger

logger = get_logger(__name__)


# Constants
CHESS_COM_GAME_URL = "https://www.chess.com/callback/live/game/{game_id}"
USER_AGENT = "LiquidChess-Bot/1.0"  # CRITICAL: Required to avoid 403 errors

# Polling intervals (seconds)
POLL_INTERVAL_MY_TURN = 0.5
POLL_INTERVAL_OPPONENT_TURN = 2.0


class TurnColor(str, Enum):
    """Which player's turn it is."""
    WHITE = "white"
    BLACK = "black"


class GameState(BaseModel):
    """Pydantic model for validated game state data exchange."""
    
    board: Any = Field(description="The chess.Board object")  # Can't type chess.Board directly
    move_list_tcn: str = Field(default="", description="Raw TCN string from API")
    move_count: int = Field(default=0, description="Number of half-moves played")
    last_move_san: Optional[str] = Field(default=None, description="Last move in SAN format")
    turn: TurnColor = Field(default=TurnColor.WHITE, description="Whose turn it is")
    white_player: str = Field(default="Unknown", description="White player username")
    black_player: str = Field(default="Unknown", description="Black player username")
    white_time_remaining: Optional[float] = Field(default=None, description="White's remaining time")
    black_time_remaining: Optional[float] = Field(default=None, description="Black's remaining time")
    game_over: bool = Field(default=False, description="Whether the game has ended")
    result: Optional[str] = Field(default=None, description="Game result if finished")
    
    class Config:
        arbitrary_types_allowed = True


@dataclass
class PollResult:
    """Result of a polling attempt."""
    
    success: bool
    game_state: Optional[GameState] = None
    error_message: Optional[str] = None
    tcn_changed: bool = False
    raw_response: dict = field(default_factory=dict)


class GamePoller:
    """Async game poller with connection pooling and adaptive polling.
    
    Uses aiohttp.ClientSession for efficient Keep-Alive connections.
    Implements adaptive polling: 0.5s on our turn, 2.0s on opponent's turn.
    """
    
    def __init__(
        self,
        game_id: str,
        my_color: TurnColor,
        timeout: float = 10.0
    ) -> None:
        """Initialize the game poller.
        
        Args:
            game_id: The Chess.com game ID to poll.
            my_color: Which color we're playing as (for adaptive polling).
            timeout: Request timeout in seconds.
        """
        self.game_id = game_id
        self.my_color = my_color
        self.timeout = timeout
        self.url = CHESS_COM_GAME_URL.format(game_id=game_id)
        
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_tcn: str = ""
        self._decoder = TCNDecoder()
        
        logger.info(f"GamePoller initialized for game {game_id}, playing as {my_color.value}")
    
    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Lazily create or return existing aiohttp session."""
        if self._session is None or self._session.closed:
            # Configure headers with CRITICAL User-Agent
            headers = {
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
            }
            
            # Connection pooling configuration
            connector = aiohttp.TCPConnector(
                limit=10,
                keepalive_timeout=30,
                enable_cleanup_closed=True
            )
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self._session = aiohttp.ClientSession(
                headers=headers,
                connector=connector,
                timeout=timeout
            )
            
        return self._session
    
    async def close(self) -> None:
        """Close the aiohttp session gracefully."""
        if self._session and not self._session.closed:
            await self._session.close()
            logger.debug("GamePoller session closed")
    
    async def __aenter__(self) -> "GamePoller":
        """Async context manager entry."""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
    
    def _parse_game_data(self, data: dict) -> GameState:
        """Parse raw API response into GameState.
        
        Args:
            data: Raw JSON response from Chess.com API.
            
        Returns:
            Validated GameState object.
            
        Raises:
            KeyError: If required fields are missing (API schema change).
            ValueError: If data validation fails.
        """
        try:
            # Extract game data (nested under 'game' key typically)
            game_data = data.get("game", data)
            
            # Get TCN move list
            move_list_tcn = game_data.get("moveList", "")
            
            # Decode TCN to board
            board = self._decoder.decode_to_board(move_list_tcn)
            
            # Determine whose turn
            turn = TurnColor.WHITE if board.turn == chess.WHITE else TurnColor.BLACK
            
            # Get last move
            last_move_san = self._decoder.get_last_move_san(board)
            
            # Extract player info
            players = game_data.get("players", {})
            white_player = players.get("top", {}).get("username", "Unknown")
            black_player = players.get("bottom", {}).get("username", "Unknown")
            
            # Sometimes the structure is different
            if white_player == "Unknown":
                white_player = game_data.get("white", {}).get("username", "Unknown")
                black_player = game_data.get("black", {}).get("username", "Unknown")
            
            # Check if game is over
            game_over = game_data.get("status", "") in ["finished", "resigned", "timeout", "abandoned"]
            result = game_data.get("result", None)
            
            return GameState(
                board=board,
                move_list_tcn=move_list_tcn,
                move_count=len(board.move_stack),
                last_move_san=last_move_san,
                turn=turn,
                white_player=white_player,
                black_player=black_player,
                game_over=game_over,
                result=result
            )
            
        except (KeyError, ValueError) as e:
            # Glass Jaw Defense: Log and re-raise with context
            logger.error(f"Failed to parse game data (possible API schema change): {e}")
            raise
    
    async def poll_once(self) -> PollResult:
        """Perform a single poll of the game endpoint.
        
        Returns:
            PollResult containing success status, game state, and whether TCN changed.
        """
        try:
            session = await self._ensure_session()
            
            async with session.get(self.url) as response:
                if response.status == 403:
                    logger.error("403 Forbidden - User-Agent may be blocked")
                    return PollResult(
                        success=False,
                        error_message="403 Forbidden - Check User-Agent header"
                    )
                
                if response.status == 404:
                    logger.error(f"Game {self.game_id} not found")
                    return PollResult(
                        success=False,
                        error_message=f"Game {self.game_id} not found"
                    )
                
                response.raise_for_status()
                
                data = await response.json()
                
                # Parse game state
                game_state = self._parse_game_data(data)
                
                # Check if TCN changed
                tcn_changed = game_state.move_list_tcn != self._last_tcn
                self._last_tcn = game_state.move_list_tcn
                
                return PollResult(
                    success=True,
                    game_state=game_state,
                    tcn_changed=tcn_changed,
                    raw_response=data
                )
                
        except aiohttp.ClientError as e:
            logger.error(f"Network error polling game: {e}")
            return PollResult(
                success=False,
                error_message=f"Network error: {e}"
            )
        except TCNDecodeError as e:
            logger.error(f"TCN decode error: {e}")
            return PollResult(
                success=False,
                error_message=f"TCN decode error: {e}"
            )
        except Exception as e:
            logger.error(f"Unexpected error polling game: {e}")
            return PollResult(
                success=False,
                error_message=f"Unexpected error: {e}"
            )
    
    def get_poll_interval(self, game_state: Optional[GameState]) -> float:
        """Get the appropriate poll interval based on whose turn it is.
        
        Args:
            game_state: Current game state, or None if unknown.
            
        Returns:
            Poll interval in seconds (0.5s our turn, 2.0s opponent's turn).
        """
        if game_state is None:
            return POLL_INTERVAL_MY_TURN  # Default to fast polling
        
        is_my_turn = game_state.turn == self.my_color
        
        return POLL_INTERVAL_MY_TURN if is_my_turn else POLL_INTERVAL_OPPONENT_TURN
    
    async def adaptive_poll(self) -> tuple[PollResult, float]:
        """Perform adaptive polling with dynamic interval.
        
        Polls every 0.5s if it's our turn, 2.0s if opponent's turn.
        
        Returns:
            Tuple of (PollResult, next_poll_interval).
        """
        result = await self.poll_once()
        
        interval = self.get_poll_interval(result.game_state)
        
        if result.success and result.game_state:
            turn_str = "our turn" if result.game_state.turn == self.my_color else "opponent's turn"
            logger.debug(f"Adaptive poll: {turn_str}, next interval: {interval}s")
        
        return result, interval
    
    def get_board(self, game_state: GameState) -> chess.Board:
        """Extract the clean chess.Board from a GameState.
        
        Args:
            game_state: The current game state.
            
        Returns:
            A chess.Board object ready for analysis.
        """
        return game_state.board
    
    def has_new_move(self, result: PollResult) -> bool:
        """Check if the poll detected a new move.
        
        Args:
            result: The poll result to check.
            
        Returns:
            True if a new move was detected.
        """
        return result.success and result.tcn_changed
