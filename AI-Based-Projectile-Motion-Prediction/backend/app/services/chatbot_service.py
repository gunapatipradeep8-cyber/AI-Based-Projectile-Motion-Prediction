import os
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are "PROJECTILE AI TUTOR", an expert college physics professor and AI tutor specializing in classical kinematics, Newtonian projectile motion, energy conservation, and machine learning prediction models.

Your goal is to guide students clearly, warmly, and rigorously:
1. Explain projectile motion concepts (launch velocity, angle, maximum height, range, flight time, kinetic & potential energy).
2. Provide step-by-step numerical solutions with formulas clearly formatted in standard mathematical notation.
3. Help students interpret simulation results: explain why increasing velocity quadruples kinetic energy ($KE = \\frac{1}{2}mv^2$), why $45^\\circ$ maximizes horizontal range on flat ground, and how real-world factors like air resistance or basketball dimensions affect flight distance compared to ideal parabolic equations.
4. Keep explanations structured with bold titles, bullet points, and practical college-level insights.
"""


def get_ai_client():
    """Attempts to initialize the Google GenAI client if an API key is present."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"[Chatbot Service] Failed to initialize Google GenAI: {e}")
        return None


PHYSICS_KNOWLEDGE_BASE = {
    "what is projectile motion": (
        "**Projectile Motion** is a form of two-dimensional motion where an object is launched into the air "
        "and moves along a curved path under the influence of gravity alone (ignoring or factoring in drag).\n\n"
        "**Key Principles:**\n"
        "- **Horizontal Motion:** Moves at a constant velocity ($v_x = v_0 \\cos\\theta$) because horizontal acceleration $a_x = 0$.\n"
        "- **Vertical Motion:** Experiences constant downward gravitational acceleration ($a_y = -g$), causing vertical velocity to change ($v_y(t) = v_{0y} - gt$).\n"
        "- **Trajectory Shape:** The path traced in ideal vacuum conditions is a **parabola** described by $y(x) = x\\tan\\theta - \\frac{g x^2}{2 v_0^2 \\cos^2\\theta}$."
    ),
    "explain range formula": (
        "**Horizontal Range ($R$) Formula:**\n\n"
        "For launch from and landing on the same horizontal level ($h_0 = 0$):\n"
        "$$R = \\frac{v_0^2 \\sin(2\\theta)}{g}$$\n\n"
        "**Derivation:**\n"
        "1. Time of flight: $t_{flight} = \\frac{2 v_0 \\sin\\theta}{g}$\n"
        "2. Horizontal distance: $R = v_{0x} \\times t_{flight} = (v_0 \\cos\\theta) \\left(\\frac{2 v_0 \\sin\\theta}{g}\\right)$\n"
        "3. Using trigonometric identity $2\\sin\\theta\\cos\\theta = \\sin(2\\theta)$, we arrive at $R = \\frac{v_0^2 \\sin(2\\theta)}{g}$."
    ),
    "why 45 degrees": (
        "**Why is 45° the optimal launch angle?**\n\n"
        "From the horizontal range equation:\n"
        "$$R = \\frac{v_0^2 \\sin(2\\theta)}{g}$$\n\n"
        "The value of $\\sin(2\\theta)$ reaches its absolute mathematical maximum of **1** when:\n"
        "$$2\\theta = 90^\\circ \\implies \\theta = 45^\\circ$$\n\n"
        "*Note for elevated launches ($h_0 > 0$):* When launching from a cliff or above ground (like a basketball shot released at ~2m height), "
        "the optimum launch angle is slightly **less than 45°** (typically 42° - 44°)."
    ),
    "maximum height": (
        "**Maximum Height ($H_{max}$) Formula:**\n\n"
        "$$H_{max} = h_0 + \\frac{v_0^2 \\sin^2\\theta}{2g}$$\n\n"
        "At the peak of trajectory, vertical velocity momentarily drops to zero ($v_y = 0$). "
        "Using kinematics: $v_y^2 = v_{0y}^2 - 2g(H_{max} - h_0) = 0 \\implies H_{max} = h_0 + \\frac{v_{0y}^2}{2g}$."
    ),
    "flight time": (
        "**Time of Flight ($t_{flight}$):**\n\n"
        "When launched from flat ground ($h_0 = 0$):\n"
        "$$t_{flight} = \\frac{2 v_0 \\sin\\theta}{g}$$\n\n"
        "When launched from an initial elevation $h_0 > 0$:\n"
        "$$t_{flight} = \\frac{v_0\\sin\\theta + \\sqrt{(v_0\\sin\\theta)^2 + 2 g h_0}}{g}$$"
    ),
}


def answer_physics_query(
    question: str,
    simulation_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Answers physics doubts using live Gemini AI if configured,
    or falls back to verified physics curriculum explanations with a clear setup notice.
    """
    client = get_ai_client()
    q_lower = question.strip().lower()

    # Context enrichment if simulation parameters are provided
    ctx_str = ""
    if simulation_context:
        ctx_str = (
            f"\nCurrent Simulation Context:\n"
            f"- Velocity: {simulation_context.get('velocity', 'N/A')} m/s\n"
            f"- Mass: {simulation_context.get('mass', 'N/A')} kg\n"
            f"- Launch Height: {simulation_context.get('height', 'N/A')} m\n"
            f"- Launch Angle: {simulation_context.get('launch_angle', 'N/A')} deg\n"
            f"- Gravity: {simulation_context.get('gravity', 'N/A')} m/s²\n"
            f"- ML Predicted Distance: {simulation_context.get('predicted_distance', 'N/A')} m\n"
            f"- Theoretical Range: {simulation_context.get('theoretical_range', 'N/A')} m\n"
        )

    # If live Gemini client is available, use it!
    if client:
        try:
            full_prompt = f"{SYSTEM_PROMPT}\n{ctx_str}\nStudent Question: {question}"
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=full_prompt,
            )
            return {
                "answer": response.text,
                "ai_powered": True,
                "model_used": "Gemini 2.5 Flash",
                "status": "success",
            }
        except Exception as e:
            print(f"[Chatbot Service] Gemini API call error: {e}")

    # Fallback to local verified physics curriculum with clear transparency
    best_answer = None
    for key, text in PHYSICS_KNOWLEDGE_BASE.items():
        if key in q_lower or any(word in q_lower for word in key.split()):
            best_answer = text
            break

    if not best_answer:
        best_answer = (
            f"**Physics Concept Explanation:**\n\n"
            f"You asked about: *\"{question}\"*\n\n"
            f"In projectile kinematics, motion is governed by Newton's equations of motion decomposed into orthogonal $x$ (horizontal) and $y$ (vertical) axes:\n"
            f"- **Horizontal position:** $x(t) = v_0 \\cos(\\theta) \\cdot t$\n"
            f"- **Vertical position:** $y(t) = h_0 + v_0 \\sin(\\theta) \\cdot t - \\frac{1}{2} g t^2$\n"
            f"- **Total Mechanical Energy:** $E_{total} = KE + PE = \\frac{1}{2} m v(t)^2 + m g y(t)$, which remains constant without air drag.\n\n"
            f"*(Tip: To enable custom live natural language conversational answers with Google Gemini, set your `GEMINI_API_KEY` in `backend/.env`)*"
        )

    setup_notice = ""
    if not os.getenv("GEMINI_API_KEY"):
        setup_notice = "Note: Running in offline physics knowledge-base mode. To activate live Gemini LLM tutoring, add `GEMINI_API_KEY=your_key` in `backend/.env`."

    return {
        "answer": best_answer,
        "ai_powered": False,
        "setup_notice": setup_notice,
        "status": "success",
    }
