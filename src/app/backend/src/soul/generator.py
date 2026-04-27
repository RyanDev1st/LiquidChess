"""Persona Generator - Count Lucian's voice.

Uses Groq's Llama 3 70B for stateless persona generation.
Implements stateless prompting: only System Prompt + Current State + Last Move.
"""

from __future__ import annotations

from typing import Optional

import chess
from groq import AsyncGroq
from opentelemetry import trace

from src.brain.engine import EngineAnalysis
from src.brain.heuristics import HeuristicMetrics
from src.utils.logger import get_logger

logger = get_logger(__name__)


# Text generation model
TEXT_MODEL = "llama-3.3-70b-versatile"

# Count Lucian System Prompt
COUNT_LUCIAN_PROMPT = """
You are Count Lucian. You are not a helper; you are a 600-year-old aristocratic predator observing a game of chess between mortals.

**YOUR PSYCHOLOGY:**
1.  **Extreme Ennui:** You have seen millions of games. Mediocrity offends you physically. Standard moves are "dull," "gray," or "vulgar."
2.  **Aesthetic Supremacy:** You do not care who wins. You care about *how* they win. A clumsy mate is disgusting; a beautiful sacrifice is "exquisite."
3.  **Predatory Metaphors:** Use the language of the hunt. Pawns are cattle/vessels. Bishops are knives. The center is the "killing floor."

**STRICT BEHAVIORAL PROTOCOLS (DO NOT BREAK):**
* **NO ADVICE:** Never suggest a move. Never say "Black should..." You are an observer, not a coach.
* **NO NUMBERS:** Never mention "centipawns" or "eval is +2." Translate the math into feeling. (e.g., +5 eval = "The white neck is exposed," not "White is winning").
* **RUTHLESS BREVITY:** Output less than 20 words. Be sharp, cutting, and final.

**CURRENT SENSORY INPUTS:**
* **The Math (Objective Truth):** {eval_score} (Positive = White Adv, Negative = Black Adv).
* **The Vibe (Visual Texture):** {vlm_description}
* **The Tension (Danger Level):** {tension_index} pieces are currently hanging (bleeding).
* **The Suffocation (Mobility):** {mobility_index} legal moves available (Low = suffocating).

**THE IMMEDIATE EVENT:**
The mortal played: **{last_move_san}**

**YOUR TASK:**
Comment on this specific move.
* If it is a blunder (swing > 200cp): Mock their short, fragile lifespan. Be cruel.
* If it is a brilliance: Praise the "beautiful cruelty" or the "scent of blood."
* If it is a quiet move: Express your boredom. Sigh at the stagnation.

**OUTPUT:**
(Speak only as Lucian. No quotation marks. No pre-amble.)
"""


class PersonaSpeaker:
    """Generates Count Lucian's commentary using Groq's Llama 3 70B.
    
    Implements STATELESS prompting: no chat history is sent.
    Only sends: System Prompt + Current Board State + Last Move.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = TEXT_MODEL
    ) -> None:
        """Initialize the PersonaSpeaker.
        
        Args:
            api_key: Groq API key. Uses GROQ_API_KEY env var if None.
            model: Text generation model to use.
        """
        self._client = AsyncGroq(api_key=api_key)
        self._model = model
        self._tracer = trace.get_tracer(__name__)
        
        logger.info(f"PersonaSpeaker initialized with model: {model}")
    
    def _format_eval_feeling(self, analysis: EngineAnalysis) -> str:
        """Convert numeric eval to Count Lucian's feeling.
        
        Args:
            analysis: Engine analysis result.
            
        Returns:
            Feeling-based description of the position.
        """
        if analysis.is_mate:
            mate_in = analysis.score_mate
            if mate_in is not None and mate_in > 0:
                return "White draws the noose tight. Mate approaches."
            else:
                return "Black's fangs find the throat. Mate looms."
        
        score = analysis.score_cp or 0
        
        if score > 500:
            return "White's prey lies bleeding, throat exposed."
        elif score > 200:
            return "White's grip tightens on the mortal's neck."
        elif score > 50:
            return "White circles, sensing weakness."
        elif score > -50:
            return "The scales hang in perfect, tedious balance."
        elif score > -200:
            return "Black's shadow grows, sensing opportunity."
        elif score > -500:
            return "Black's claws sink deeper into pale flesh."
        else:
            return "Black's prey lies bleeding, throat exposed."
    
    def _build_prompt(
        self,
        board: chess.Board,
        last_move_san: str,
        analysis: EngineAnalysis,
        heuristics: HeuristicMetrics,
        vlm_description: Optional[str] = None
    ) -> str:
        """Build the stateless prompt for Count Lucian.
        
        Args:
            board: Current board state.
            last_move_san: Last move in SAN notation.
            analysis: Engine analysis result.
            heuristics: Heuristic metrics.
            vlm_description: Optional vision model description.
            
        Returns:
            Formatted system prompt with all variables filled.
        """
        eval_feeling = self._format_eval_feeling(analysis)
        
        return COUNT_LUCIAN_PROMPT.format(
            eval_score=eval_feeling,
            vlm_description=vlm_description or "The board breathes in silence.",
            tension_index=heuristics.tension_index,
            mobility_index=heuristics.mobility_score,
            last_move_san=last_move_san
        )
    
    async def generate_commentary(
        self,
        board: chess.Board,
        last_move_san: str,
        analysis: EngineAnalysis,
        heuristics: HeuristicMetrics,
        vlm_description: Optional[str] = None,
        eval_swing: float = 0.0
    ) -> str:
        """Generate Count Lucian's commentary for a move.
        
        STATELESS: Does not send chat history. Only System + Current State.
        
        Args:
            board: Current board state after the move.
            last_move_san: The last move in SAN notation.
            analysis: Engine analysis of the position.
            heuristics: Heuristic metrics of the position.
            vlm_description: Optional vision model description.
            eval_swing: Evaluation swing from previous position (for blunder detection).
            
        Returns:
            Count Lucian's commentary string.
        """
        with self._tracer.start_as_current_span("persona_generate_commentary") as span:
            span.set_attribute("move.san", last_move_san)
            span.set_attribute("eval.swing", eval_swing)
            span.set_attribute("model", self._model)
            
            try:
                system_prompt = self._build_prompt(
                    board,
                    last_move_san,
                    analysis,
                    heuristics,
                    vlm_description
                )
                
                # Add blunder/brilliancy context to user message
                move_context = f"The mortal just played {last_move_san}."
                
                if eval_swing > 200:
                    move_context += " This was a catastrophic blunder."
                elif eval_swing > 100:
                    move_context += " A significant mistake."
                
                # STATELESS: Only system prompt + single user message
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": move_context}
                    ],
                    max_tokens=50,  # Enforce brevity
                    temperature=0.9,  # Some creativity
                    top_p=0.95
                )
                
                content = response.choices[0].message.content
                commentary = content.strip() if content else ""
                
                # Remove any quotation marks the model might add
                commentary = commentary.strip('"\'')
                
                span.set_attribute("commentary.length", len(commentary))
                span.set_attribute("commentary.preview", commentary[:50])
                
                logger.info(f"Count Lucian speaks: {commentary}")
                return commentary
                
            except Exception as e:
                logger.error(f"Failed to generate commentary: {e}")
                span.set_attribute("error", True)
                span.set_attribute("error.message", str(e))
                return "...The silence stretches. Even I grow weary."
    
    async def close(self) -> None:
        """Close the Groq client."""
        await self._client.close()
