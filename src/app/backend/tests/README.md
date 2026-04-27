# LiquidChess Evaluation Framework

Comprehensive test suite and benchmarking framework for the LiquidChess chess analysis system.

## Structure

```
tests/
├── conftest.py              # Pytest fixtures and configuration
├── test_heuristics.py       # Heuristic calculation tests
├── test_engine.py           # Stockfish engine wrapper tests
├── test_integration.py      # Integration tests
├── benchmarks.py            # Performance benchmarks
└── README.md               # This file
```

## Running Tests

### All Tests
```bash
pytest
```

### Specific Test File
```bash
pytest tests/test_heuristics.py
pytest tests/test_engine.py
pytest tests/test_integration.py
```

### Specific Test Class
```bash
pytest tests/test_heuristics.py::TestMobilityScore
pytest tests/test_engine.py::TestEngineAnalysis
```

### Specific Test Function
```bash
pytest tests/test_heuristics.py::TestMobilityScore::test_starting_position_mobility
```

### With Coverage
```bash
pytest --cov=src.brain --cov-report=html
```

### Verbose Output
```bash
pytest -v
pytest -vv  # Extra verbose
```

### Skip Slow Tests
```bash
pytest -m "not slow"
```

## Running Benchmarks

```bash
python -m tests.benchmarks
```

This will run performance benchmarks for:
- Heuristic calculations (mobility, dominance, tension)
- Engine analysis operations
- Combined workflows

## Test Categories

### 1. Heuristic Tests (`test_heuristics.py`)
Tests for lightweight evaluation functions:
- **Mobility**: Legal move counting
- **Dominance**: Central square control
- **Tension**: Hanging piece detection
- **Performance**: <10ms requirement validation

### 2. Engine Tests (`test_engine.py`)
Tests for Stockfish wrapper:
- **Lifecycle**: Start/stop, context manager
- **Analysis**: Position evaluation, PV extraction
- **Best Move**: Move suggestion
- **Performance**: 100ms time limit enforcement
- **Error Handling**: Invalid positions, missing engine

### 3. Integration Tests (`test_integration.py`)
Tests for combined workflows:
- **Combined Analysis**: Heuristics + engine
- **Move Quality**: Eval swing detection
- **Persona Grounding**: Metrics for Count Lucian

### 4. Benchmarks (`benchmarks.py`)
Performance measurement:
- **Heuristics**: Average time per calculation
- **Engine**: Average analysis time
- **Comparison**: Relative performance

## Requirements

### Essential
- `pytest>=7.0.0`
- `pytest-asyncio>=0.21.0`
- `python-chess>=1.10.0`

### Optional
- Stockfish engine (for engine tests)
- `pytest-cov` (for coverage reports)

## Fixtures

Shared test fixtures defined in `conftest.py`:

- `starting_position`: Standard chess starting position
- `midgame_position`: Complex tactical position
- `endgame_position`: King and pawn endgame
- `tactical_position`: Position with tactics
- `mate_in_one`: Simple checkmate puzzle
- `project_root`: Project directory path

## Performance Targets

### Heuristics
- **All heuristics combined**: <10ms
- **Mobility**: <1ms
- **Dominance**: <2ms
- **Tension**: <5ms

### Engine
- **Analysis**: ~100ms (configurable)
- **Best move**: ~100ms (configurable)

## CI/CD Integration

Add to GitHub Actions or similar:

```yaml
- name: Run tests
  run: |
    pytest --cov=src.brain --cov-report=xml

- name: Run benchmarks
  run: |
    python -m tests.benchmarks
```

## Writing New Tests

### Test Naming
- Files: `test_*.py`
- Classes: `Test*`
- Functions: `test_*`

### Example Test
```python
def test_mobility_calculation(starting_position):
    """Test mobility score on starting position."""
    from src.brain.heuristics import get_mobility_score
    
    score = get_mobility_score(starting_position)
    assert score == 20  # 20 legal moves at start
```

### Async Test
```python
@pytest.mark.asyncio
async def test_engine_analysis(engine, starting_position):
    """Test engine analysis."""
    analysis = await engine.analyze(starting_position)
    assert analysis.depth > 0
```

## Troubleshooting

### Stockfish Not Found
If engine tests fail with "Stockfish not installed":
1. Install Stockfish: https://stockfishchess.org/download/
2. Add to PATH, or
3. Set `STOCKFISH_PATH` environment variable

### Async Tests Failing
Ensure `pytest-asyncio` is installed:
```bash
pip install pytest-asyncio
```

### Import Errors
Run tests from project root:
```bash
cd c:\Users\admin\LiquidChess
pytest
```

## Coverage Goals

- **Heuristics**: >95% coverage
- **Engine**: >90% coverage
- **Integration**: >80% coverage

Check coverage:
```bash
pytest --cov=src.brain --cov-report=term-missing
```

## Performance Regression Detection

Run benchmarks before and after changes:
```bash
python -m tests.benchmarks > baseline.txt
# Make changes
python -m tests.benchmarks > current.txt
diff baseline.txt current.txt
```
