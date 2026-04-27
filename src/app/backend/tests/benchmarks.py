"""Performance benchmarks for LiquidChess brain module.

Run with: python -m tests.benchmarks
"""

import asyncio
import time
import chess
from typing import List, Tuple
from dataclasses import dataclass

from src.brain.heuristics import get_all_heuristics, get_mobility_score, get_dominance_score
from src.brain.engine import StockfishEngine


@dataclass
class BenchmarkResult:
    """Result of a benchmark run."""
    name: str
    iterations: int
    total_time: float
    avg_time: float
    min_time: float
    max_time: float
    
    def __str__(self) -> str:
        return (
            f"{self.name}:\n"
            f"  Iterations: {self.iterations}\n"
            f"  Total: {self.total_time*1000:.2f}ms\n"
            f"  Average: {self.avg_time*1000:.4f}ms\n"
            f"  Min: {self.min_time*1000:.4f}ms\n"
            f"  Max: {self.max_time*1000:.4f}ms\n"
        )


def benchmark_function(func, iterations: int = 1000) -> BenchmarkResult:
    """Benchmark a synchronous function."""
    times = []
    
    for _ in range(iterations):
        start = time.perf_counter()
        func()
        end = time.perf_counter()
        times.append(end - start)
    
    total = sum(times)
    return BenchmarkResult(
        name=func.__name__,
        iterations=iterations,
        total_time=total,
        avg_time=total / iterations,
        min_time=min(times),
        max_time=max(times)
    )


async def benchmark_async_function(func, iterations: int = 100) -> BenchmarkResult:
    """Benchmark an async function."""
    times = []
    
    for _ in range(iterations):
        start = time.perf_counter()
        await func()
        end = time.perf_counter()
        times.append(end - start)
    
    total = sum(times)
    return BenchmarkResult(
        name=func.__name__,
        iterations=iterations,
        total_time=total,
        avg_time=total / iterations,
        min_time=min(times),
        max_time=max(times)
    )


class HeuristicsBenchmark:
    """Benchmark heuristic calculations."""
    
    def __init__(self):
        self.positions = self._load_positions()
    
    def _load_positions(self) -> List[chess.Board]:
        """Load test positions."""
        fens = [
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",  # Starting
            "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5",  # Midgame
            "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",  # Endgame
            "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",  # Tactical
        ]
        return [chess.Board(fen) for fen in fens]
    
    def run_all(self) -> List[BenchmarkResult]:
        """Run all heuristic benchmarks."""
        results = []
        
        # Mobility benchmark
        for i, pos in enumerate(self.positions):
            result = benchmark_function(
                lambda: get_mobility_score(pos),
                iterations=1000
            )
            result.name = f"Mobility (pos {i})"
            results.append(result)
        
        # Dominance benchmark
        for i, pos in enumerate(self.positions):
            result = benchmark_function(
                lambda: get_dominance_score(pos),
                iterations=1000
            )
            result.name = f"Dominance (pos {i})"
            results.append(result)
        
        # All heuristics combined
        for i, pos in enumerate(self.positions):
            result = benchmark_function(
                lambda: get_all_heuristics(pos),
                iterations=1000
            )
            result.name = f"All Heuristics (pos {i})"
            results.append(result)
        
        return results


class EngineBenchmark:
    """Benchmark engine analysis."""
    
    def __init__(self):
        self.positions = self._load_positions()
        self.engine = None
    
    def _load_positions(self) -> List[chess.Board]:
        """Load test positions."""
        fens = [
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 5",
            "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1",
        ]
        return [chess.Board(fen) for fen in fens]
    
    async def run_all(self) -> List[BenchmarkResult]:
        """Run all engine benchmarks."""
        results = []
        
        try:
            async with StockfishEngine(time_limit=0.1) as engine:
                self.engine = engine
                
                # Analysis benchmark
                for i, pos in enumerate(self.positions):
                    result = await benchmark_async_function(
                        lambda: engine.analyze(pos),
                        iterations=50
                    )
                    result.name = f"Engine Analysis (pos {i})"
                    results.append(result)
                
                # Best move benchmark
                for i, pos in enumerate(self.positions):
                    result = await benchmark_async_function(
                        lambda: engine.get_best_move(pos),
                        iterations=50
                    )
                    result.name = f"Best Move (pos {i})"
                    results.append(result)
        
        except FileNotFoundError:
            print("⚠️  Stockfish not installed - skipping engine benchmarks")
        
        return results


def print_results(results: List[BenchmarkResult]):
    """Print benchmark results."""
    print("\n" + "="*60)
    print("BENCHMARK RESULTS")
    print("="*60 + "\n")
    
    for result in results:
        print(result)


async def main():
    """Run all benchmarks."""
    print("🔬 Running LiquidChess Benchmarks...")
    
    # Heuristics benchmarks
    print("\n📊 Heuristics Benchmarks")
    heuristic_bench = HeuristicsBenchmark()
    heuristic_results = heuristic_bench.run_all()
    print_results(heuristic_results)
    
    # Engine benchmarks
    print("\n🤖 Engine Benchmarks")
    engine_bench = EngineBenchmark()
    engine_results = await engine_bench.run_all()
    print_results(engine_results)
    
    # Performance summary
    print("\n" + "="*60)
    print("PERFORMANCE SUMMARY")
    print("="*60)
    
    heuristic_avg = sum(r.avg_time for r in heuristic_results if "All Heuristics" in r.name) / 4
    print(f"\n✅ Heuristics average: {heuristic_avg*1000:.4f}ms")
    if heuristic_avg < 0.010:
        print("   PASS: Under 10ms requirement")
    else:
        print(f"   ⚠️  WARNING: Exceeds 10ms requirement")
    
    if engine_results:
        engine_avg = sum(r.avg_time for r in engine_results if "Analysis" in r.name) / len([r for r in engine_results if "Analysis" in r.name])
        print(f"\n✅ Engine analysis average: {engine_avg*1000:.2f}ms")
        if engine_avg < 0.200:
            print("   PASS: Under 200ms (with overhead)")
        else:
            print(f"   ⚠️  WARNING: Slower than expected")


if __name__ == "__main__":
    asyncio.run(main())
