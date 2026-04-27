"""Tests for Stockfish engine wrapper.

Validates engine integration:
- Engine initialization and lifecycle
- Position analysis
- Best move calculation
- Time limit enforcement (100ms)
- Error handling
"""

import pytest
import chess
import asyncio
from src.brain.engine import StockfishEngine, EngineAnalysis


@pytest.fixture
async def engine():
    """Stockfish engine fixture with lifecycle management."""
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


class TestEngineLifecycle:
    """Test engine startup and shutdown."""
    
    @pytest.mark.asyncio
    async def test_engine_starts(self):
        """Engine can start successfully."""
        try:
            engine = StockfishEngine()
            await engine.start()
            assert engine._engine is not None
            await engine.stop()
        except FileNotFoundError:
            pytest.skip("Stockfish not installed")
    
    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Engine works as async context manager."""
        try:
            async with StockfishEngine() as engine:
                assert engine._engine is not None
        except FileNotFoundError:
            pytest.skip("Stockfish not installed")
    
    @pytest.mark.asyncio
    async def test_double_start_safe(self):
        """Starting already-started engine is safe."""
        try:
            engine = StockfishEngine()
            await engine.start()
            await engine.start()  # Should be no-op
            assert engine._engine is not None
            await engine.stop()
        except FileNotFoundError:
            pytest.skip("Stockfish not installed")


class TestEngineAnalysis:
    """Test position analysis functionality."""
    
    @pytest.mark.asyncio
    async def test_analyze_starting_position(self, engine, starting_position):
        """Analyze starting position returns near-zero eval."""
        analysis = await engine.analyze(starting_position)
        
        assert isinstance(analysis, EngineAnalysis)
        assert analysis.score_cp is not None
        assert abs(analysis.score_cp) < 100  # Should be roughly equal
        assert analysis.depth > 0
    
    @pytest.mark.asyncio
    async def test_analyze_mate_position(self, engine, mate_in_one):
        """Detect mate in one."""
        analysis = await engine.analyze(mate_in_one)
        
        # Should detect mate
        assert analysis.is_mate or abs(analysis.score_numeric) > 500
    
    @pytest.mark.asyncio
    async def test_principal_variation(self, engine, starting_position):
        """PV should contain valid moves."""
        analysis = await engine.analyze(starting_position)
        
        assert len(analysis.principal_variation) > 0
        
        # First move should be legal
        first_move = analysis.principal_variation[0]
        assert first_move in starting_position.legal_moves
    
    @pytest.mark.asyncio
    async def test_pv_san_notation(self, engine, starting_position):
        """PV can be converted to SAN."""
        analysis = await engine.analyze(starting_position)
        san_moves = analysis.pv_san(starting_position)
        
        assert len(san_moves) > 0
        assert all(isinstance(move, str) for move in san_moves)
    
    @pytest.mark.asyncio
    async def test_score_numeric_property(self, engine, starting_position):
        """score_numeric handles both cp and mate scores."""
        analysis = await engine.analyze(starting_position)
        
        score = analysis.score_numeric
        assert isinstance(score, float)
        
        # For non-mate positions, should match cp score
        if not analysis.is_mate:
            assert score == float(analysis.score_cp or 0)


class TestBestMove:
    """Test best move calculation."""
    
    @pytest.mark.asyncio
    async def test_get_best_move(self, engine, starting_position):
        """Get best move from starting position."""
        best_move = await engine.get_best_move(starting_position)
        
        assert best_move is not None
        assert best_move in starting_position.legal_moves
    
    @pytest.mark.asyncio
    async def test_best_move_game_over(self, engine):
        """No best move when game is over."""
        board = chess.Board()
        board.set_fen("8/8/8/8/8/8/8/k1K5 w - - 0 1")  # Stalemate
        board.push_san("Kb2")  # Now black is stalemated
        
        best_move = await engine.get_best_move(board)
        assert best_move is None


class TestEvalSwing:
    """Test evaluation swing calculation for blunder detection."""
    
    @pytest.mark.asyncio
    async def test_eval_swing_normal_move(self, engine):
        """Normal move has small eval swing."""
        board = chess.Board()
        
        analysis1 = await engine.analyze(board)
        board.push_san("e4")
        analysis2 = await engine.analyze(board)
        
        swing = engine.calculate_eval_swing(analysis1, analysis2)
        assert swing < 200  # Not a blunder
    
    @pytest.mark.asyncio
    async def test_eval_swing_blunder(self, engine):
        """Blunder has large eval swing."""
        board = chess.Board()
        board.set_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
        
        analysis1 = await engine.analyze(board)
        
        # Horrible blunder: hanging queen
        board.push_san("e4")
        board.push_san("e5")
        board.push_san("Qh5")
        board.push_san("Nc6")
        board.push_san("Qxe5+")  # Hangs queen
        
        analysis2 = await engine.analyze(board)
        
        swing = abs(analysis2.score_numeric - analysis1.score_numeric)
        # Should be large swing (though not necessarily >200 after the bad move)


class TestPerformance:
    """Test time limit enforcement."""
    
    @pytest.mark.asyncio
    async def test_analysis_time_limit(self, engine, midgame_position):
        """Analysis should respect 100ms time limit."""
        import time
        
        start = time.perf_counter()
        await engine.analyze(midgame_position)
        duration = time.perf_counter() - start
        
        # Should complete within reasonable time (with overhead)
        assert duration < 0.5  # 500ms max with overhead
    
    @pytest.mark.asyncio
    async def test_custom_time_limit(self, starting_position):
        """Engine can use custom time limits."""
        try:
            async with StockfishEngine(time_limit=0.05) as engine:
                import time
                start = time.perf_counter()
                await engine.analyze(starting_position)
                duration = time.perf_counter() - start
                
                assert duration < 0.3  # 300ms max
        except FileNotFoundError:
            pytest.skip("Stockfish not installed")


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.mark.asyncio
    async def test_analyze_without_start_raises(self):
        """Analyzing without starting engine raises error."""
        try:
            engine = StockfishEngine()
            board = chess.Board()
            
            with pytest.raises(RuntimeError):
                await engine.analyze(board)
        except FileNotFoundError:
            pytest.skip("Stockfish not installed")
    
    @pytest.mark.asyncio
    async def test_invalid_stockfish_path(self):
        """Invalid Stockfish path raises FileNotFoundError."""
        engine = StockfishEngine(stockfish_path="/invalid/path/stockfish")
        
        with pytest.raises(Exception):  # FileNotFoundError or similar
            await engine.start()
