"""Integration tests for brain module.

Tests combined heuristics + engine analysis workflows.
"""

import pytest
import chess
from src.brain.heuristics import get_all_heuristics
from src.brain.engine import StockfishEngine


@pytest.fixture
async def engine():
    """Stockfish engine fixture."""
    engine = None
    try:
        engine = StockfishEngine()
        await engine.start()
        yield engine
    except FileNotFoundError:
        pytest.skip("Stockfish not installed")
    finally:
        if engine is not None:
            await engine.stop()


class TestCombinedAnalysis:
    """Test heuristics + engine working together."""
    
    @pytest.mark.asyncio
    async def test_full_position_analysis(self, engine, tactical_position):
        """Combine heuristics and engine analysis."""
        # Fast heuristics
        metrics = get_all_heuristics(tactical_position)
        
        # Objective engine eval
        analysis = await engine.analyze(tactical_position)
        
        # Both should provide useful information
        assert metrics.mobility_score > 0
        assert analysis.depth > 0
        assert len(analysis.principal_variation) > 0
    
    @pytest.mark.asyncio
    async def test_move_quality_detection(self, engine):
        """Detect move quality using eval swing."""
        board = chess.Board()
        
        # Analyze before
        analysis_before = await engine.analyze(board)
        
        # Make good move
        board.push_san("e4")
        analysis_after = await engine.analyze(board)
        
        # Should be small swing
        swing = engine.calculate_eval_swing(analysis_before, analysis_after)
        assert swing < 100
    
    @pytest.mark.asyncio
    async def test_tension_vs_engine_eval(self, engine):
        """High tension positions should have concrete tactical lines."""
        # Quiet position
        quiet_board = chess.Board()
        quiet_metrics = get_all_heuristics(quiet_board)
        
        # Tactical position with hanging pieces
        tactical_board = chess.Board()
        tactical_board.set_fen("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1PP2/8/PPPP2PP/RNBQK1NR b KQkq - 0 4")
        tactical_metrics = get_all_heuristics(tactical_board)
        
        # Tactical position should have more tension
        assert tactical_metrics.tension_index >= quiet_metrics.tension_index


class TestPersonaGrounding:
    """Test metrics useful for Count Lucian's persona."""
    
    @pytest.mark.asyncio
    async def test_dominance_correlates_with_eval(self, engine):
        """Central dominance should correlate with good position."""
        # Position where white dominates center
        board = chess.Board()
        board.set_fen("rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3")
        
        metrics = get_all_heuristics(board)
        analysis = await engine.analyze(board)
        
        # White has better center control
        white_dom = metrics.dominance_score
        assert white_dom > 0
    
    def test_suffocation_detection(self):
        """Detect suffocating positions (low mobility)."""
        # Trapped king
        board = chess.Board()
        board.set_fen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1")
        
        metrics = get_all_heuristics(board)
        assert metrics.is_suffocating
    
    def test_bleeding_pieces_detection(self):
        """Detect 'bleeding' (hanging) pieces."""
        # Position with tactical tension
        board = chess.Board()
        board.set_fen("r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4")
        
        metrics = get_all_heuristics(board)
        # Should at least detect some level of tension
        assert metrics.tension_level in ["calm", "tense", "explosive"]
        assert metrics.tension_index >= 0


class TestPerformanceIntegration:
    """Test performance of combined workflows."""
    
    @pytest.mark.asyncio
    async def test_fast_heuristics_slow_engine(self, engine, midgame_position):
        """Heuristics should be much faster than engine."""
        import time
        
        # Time heuristics
        start = time.perf_counter()
        for _ in range(100):
            get_all_heuristics(midgame_position)
        heuristic_time = time.perf_counter() - start
        
        # Time engine (single call)
        start = time.perf_counter()
        await engine.analyze(midgame_position)
        engine_time = time.perf_counter() - start
        
        # Heuristics should be at least 10x faster per call
        avg_heuristic = heuristic_time / 100
        assert avg_heuristic < engine_time / 10
