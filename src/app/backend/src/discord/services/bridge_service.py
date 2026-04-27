"""BridgeService - The Glue Between Discord and the LiquidChess Core.

This service acts as the intermediary layer, holding session state and
communicating with src/core (when built). For now, it returns mock data
so the Discord bot can be tested in isolation.

Pattern: Singleton
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from src.utils.logger import get_logger

logger = get_logger(__name__)


class SessionStatus(Enum):
    """Status of a live session."""
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    ENDED = "ended"


@dataclass
class GameState:
    """Represents the current state of a chess game."""
    fen: str
    last_move: Optional[str] = None
    white_player: str = "Unknown"
    black_player: str = "Unknown"
    white_time: Optional[int] = None
    black_time: Optional[int] = None
    move_number: int = 1
    evaluation: Optional[float] = None
    is_white_turn: bool = True
    
    @property
    def game_title(self) -> str:
        """Generate a human-readable game title."""
        return f"{self.white_player} vs {self.black_player}"


@dataclass
class LiveSession:
    """Represents an active live session being tracked."""
    id: str
    url: str
    game_state: GameState
    status: SessionStatus = SessionStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    discord_thread_id: Optional[int] = None
    discord_vc_id: Optional[int] = None
    web_url: Optional[str] = None
    
    @property
    def title(self) -> str:
        """Get session title from game state."""
        return self.game_state.game_title


class BridgeService:
    """Singleton service that bridges Discord commands to Core logic.
    
    Responsibilities:
    - Hold current_session (Active Game)
    - Hold session_queue (Multi-game support)
    - Provide mock data for isolated Discord testing
    - Interface with src/core when available
    
    The service is designed to be injected into Cogs.
    """
    
    _instance: Optional[BridgeService] = None
    
    def __new__(cls) -> BridgeService:
        """Ensure singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self) -> None:
        """Initialize the bridge service (only once due to singleton)."""
        if self._initialized:
            return
            
        self._current_session: Optional[LiveSession] = None
        self._session_queue: List[LiveSession] = []
        self._focus_index: int = 0
        self._mock_mode: bool = True  # Until src/core is connected
        self._initialized = True
        
        logger.info("BridgeService initialized in MOCK mode")
    
    # ─────────────────────────────────────────────────────────────────
    # Session Management
    # ─────────────────────────────────────────────────────────────────
    
    @property
    def active_session(self) -> Optional[LiveSession]:
        """Get the currently active session."""
        return self._current_session
    
    @property
    def session_queue(self) -> List[LiveSession]:
        """Get all sessions in the queue."""
        return self._session_queue.copy()
    
    @property
    def focus_index(self) -> int:
        """Get current focus index for multi-game view."""
        return self._focus_index
    
    @focus_index.setter
    def focus_index(self, value: int) -> None:
        """Set focus index with bounds checking."""
        if 0 <= value < len(self._session_queue):
            self._focus_index = value
            logger.info(f"Focus switched to game index {value}")
        else:
            logger.warning(f"Invalid focus index: {value}")
    
    async def start_session(self, url: str) -> LiveSession:
        """Start a new live session from a Chess.com link.
        
        Args:
            url: Chess.com game URL
            
        Returns:
            The created LiveSession object
        """
        logger.info(f"Starting session for URL: {url}")
        
        # Extract game ID from URL (mock parsing)
        game_id = self._extract_game_id(url)
        
        # In mock mode, create dummy game state
        if self._mock_mode:
            game_state = self._create_mock_game_state()
        else:
            # TODO: Connect to src/core/watcher when available
            game_state = self._create_mock_game_state()
        
        # Create session
        session = LiveSession(
            id=game_id or str(uuid4())[:8],
            url=url,
            game_state=game_state,
            status=SessionStatus.ACTIVE,
            web_url=f"https://liquidchess.club/watch/{game_id or 'mock'}"
        )
        
        # Set as current and add to queue
        self._current_session = session
        self._session_queue.append(session)
        self._focus_index = len(self._session_queue) - 1
        
        logger.info(f"Session created: {session.title} [{session.id}]")
        return session
    
    async def stop_session(self, scope: str = "all") -> Dict[str, bool]:
        """Stop the current session with specified scope.
        
        Args:
            scope: "discord", "web", or "all"
            
        Returns:
            Dict indicating what was stopped
        """
        result = {"discord": False, "web": False, "core": False}
        
        if not self._current_session:
            logger.warning("No active session to stop")
            return result
        
        session = self._current_session
        
        if scope in ("discord", "all"):
            session.discord_thread_id = None
            session.discord_vc_id = None
            result["discord"] = True
            logger.info("Discord connections severed")
        
        if scope in ("web", "all"):
            # Mock: Would notify web server to close visualizer
            result["web"] = True
            logger.info("Web visualizer darkened")
        
        if scope == "all":
            session.status = SessionStatus.ENDED
            self._session_queue.remove(session)
            self._current_session = None
            result["core"] = True
            logger.info("Session terminated completely")
        
        return result
    
    async def get_current_state(self) -> Optional[GameState]:
        """Get the current game state of the focused session.
        
        Returns:
            Current GameState or None if no session
        """
        if not self._current_session:
            return None
        return self._current_session.game_state
    
    async def get_board_image(self) -> Optional[bytes]:
        """Get rendered board image as bytes.
        
        Returns:
            PNG image bytes or None
        """
        if not self._current_session:
            return None
        
        # Mock: Return None, real implementation uses src/soul/renderer
        # TODO: Connect to src/soul/renderer.py when building web layer
        logger.debug("Board image requested (mock mode - returning None)")
        return None
    
    async def get_persona_comment(
        self, 
        fen: Optional[str] = None,
        context: str = "move"
    ) -> str:
        """Get a Count Lucian commentary for the position.
        
        Args:
            fen: FEN string (uses current session if None)
            context: "move", "blunder", "brilliant", "roast"
            
        Returns:
            Persona commentary string
        """
        if not fen and self._current_session:
            fen = self._current_session.game_state.fen
        
        if self._mock_mode:
            return self._get_mock_commentary(context)
        
        # TODO: Connect to src/soul/generator.py
        return self._get_mock_commentary(context)
    
    async def analyze_pgn(self, pgn: str) -> Dict[str, Any]:
        """Analyze a PGN and return roast-worthy moments.
        
        Args:
            pgn: PGN string to analyze
            
        Returns:
            Analysis results
        """
        # Mock analysis
        return {
            "blunders": 3,
            "missed_wins": 2,
            "worst_move": "Qxh7??",
            "accuracy": 67.4,
            "roast_worthy": True
        }
    
    # ─────────────────────────────────────────────────────────────────
    # Discord Integration Hooks
    # ─────────────────────────────────────────────────────────────────
    
    def set_discord_thread(self, thread_id: int) -> None:
        """Associate a Discord thread with current session."""
        if self._current_session:
            self._current_session.discord_thread_id = thread_id
            logger.info(f"Thread {thread_id} bound to session")
    
    def set_discord_vc(self, vc_id: int) -> None:
        """Associate a Discord VC with current session."""
        if self._current_session:
            self._current_session.discord_vc_id = vc_id
            logger.info(f"VC {vc_id} bound to session")
    
    def is_in_vc(self) -> bool:
        """Check if bot is currently in a VC for this session."""
        return (
            self._current_session is not None 
            and self._current_session.discord_vc_id is not None
        )
    
    def has_thread(self) -> bool:
        """Check if a thread exists for current session."""
        return (
            self._current_session is not None 
            and self._current_session.discord_thread_id is not None
        )
    
    # ─────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────
    
    def _extract_game_id(self, url: str) -> Optional[str]:
        """Extract game ID from Chess.com URL."""
        # Example: https://www.chess.com/game/live/123456789
        try:
            if "/live/" in url:
                return url.split("/live/")[-1].split("?")[0].split("/")[0]
            return None
        except Exception:
            return None
    
    def _create_mock_game_state(self) -> GameState:
        """Create a mock game state for testing."""
        return GameState(
            fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
            last_move="e2e4",
            white_player="Mortal_Challenger",
            black_player="Count_Lucian",
            white_time=300,
            black_time=300,
            move_number=1,
            evaluation=0.2,
            is_white_turn=False
        )
    
    def _get_mock_commentary(self, context: str) -> str:
        """Return mock Count Lucian commentary."""
        commentaries = {
            "move": "Adequate. Your ancestors would be... less ashamed.",
            "blunder": "A gift. How thoughtful of you to hasten your demise.",
            "brilliant": "Even a broken sundial tells the correct time twice a day.",
            "roast": "I have witnessed plagues with more strategic merit.",
            "default": "The night grows long, and my patience grows thin."
        }
        return commentaries.get(context, commentaries["default"])
    
    # ─────────────────────────────────────────────────────────────────
    # Debug / Testing
    # ─────────────────────────────────────────────────────────────────
    
    def reset(self) -> None:
        """Reset all state. For testing only."""
        self._current_session = None
        self._session_queue.clear()
        self._focus_index = 0
        logger.warning("BridgeService state reset")
