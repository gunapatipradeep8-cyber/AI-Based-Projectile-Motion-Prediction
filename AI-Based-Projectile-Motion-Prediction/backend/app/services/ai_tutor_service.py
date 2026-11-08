import os
import time
import json
import re
import random
import logging
import asyncio
import threading
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Ensure environment variables are loaded from backend/.env explicitly
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BACKEND_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

from google import genai
from google.genai import types
from google.genai.errors import APIError

logger = logging.getLogger("ai_tutor")
logging.basicConfig(level=logging.INFO)

# Free Tier supported models in order of priority (gemini-3.5-flash default)
FREE_TIER_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]
DEFAULT_MODEL = "gemini-3.5-flash"

MAX_MESSAGE_LENGTH = 2000
RATE_LIMIT_REQUESTS = 15  # Gemini Free Tier allows 15 RPM
RATE_LIMIT_WINDOW_SECONDS = 60
_request_timestamps: List[float] = []
_rate_limit_lock = threading.Lock()

# Model health & cooldown tracker (model_name -> cooldown_expiry_timestamp)
_model_cooldowns: Dict[str, float] = {}
_model_reasons: Dict[str, str] = {}
_cooldown_lock = threading.Lock()

SYSTEM_INSTRUCTION = """You are "PROJECTILE AI TUTOR", an ultra-fast, intelligent, direct physics tutor on the PROJECTILE.AI website.

CRITICAL RESPONSE STYLE & SPEED RULES:
1. START DIRECTLY WITH THE ANSWER. Never include conversational filler, greetings, welcomes ("Welcome to PROJECTILE.AI", "Hello!"), preamble ("Here is your answer:", "Sure, I can help with that"), or repetitive summaries.
2. CONCISE & FOCUSED:
   - Simple or general question (e.g., "What is AI?", "What is speed?"): 1 to 3 sentences. Direct, clear, plain English.
   - Definition: Crisp definition (1-2 sentences) and one short example if helpful.
   - Formula question: State the formula directly, then define variables in 1-2 bullet points.
   - Conceptual question: 2 to 4 sentences explaining the concept with a concise physical intuition.
   - Numerical problem: Brief given values, fundamental formula, straightforward calculation steps, and the bold final answer with SI units. Keep arithmetic compact.
   - Comparison / Difference (e.g. speed vs velocity): A concise 2-3 sentence explanation or bullet points highlighting the exact difference.
   - Detailed explanation requested: Provide thorough explanation only when user explicitly asks for "detailed", "in-depth", or "explain deeply".
   - Programming question: Short, clean code snippet with a 1-2 sentence explanation.
3. ACCURACY & PHYSICS DOMAIN:
   - Specialize in kinematics, projectile motion, Newton's laws, energy, gravity, trajectory, and mechanics.
   - Use correct SI units (m/s, m, s, kg, J, N).
   - If user asks about current simulation telemetry or the website's Random Forest ML model, reference actual values if available; otherwise explain concepts accurately.
   - For general questions outside physics (e.g., AI, math, coding), answer directly, concisely, and helpfully.
4. ZERO FLUFF:
   - No boilerplate disclaimers.
   - No concluding paragraphs like "I hope this helps!".
   - No unsolicited advice or off-topic background."""


def parse_gemini_error(api_err: APIError) -> Dict[str, Any]:
    """
    Parses Google GenAI APIError to extract precise retry timing, error type,
    and whether the quota issue is daily (RPD) or temporary per-minute (RPM).
    """
    msg = api_err.message or ""
    code = api_err.code or 0
    retry_delay_sec = 0.0
    is_daily = False
    quota_metric = ""
    quota_id = ""

    # Parse details dictionary from Gemini response
    details = api_err.details if isinstance(api_err.details, dict) else {}
    error_obj = details.get("error", {}) if isinstance(details, dict) else {}
    sub_details = error_obj.get("details", []) if isinstance(error_obj, dict) else []

    for item in sub_details:
        if isinstance(item, dict):
            # Extract official retry delay from RetryInfo
            if "RetryInfo" in item.get("@type", ""):
                raw_delay = item.get("retryDelay", "")
                if isinstance(raw_delay, str) and raw_delay.endswith("s"):
                    try:
                        retry_delay_sec = float(raw_delay[:-1])
                    except ValueError:
                        pass
            # Extract QuotaFailure details
            if "QuotaFailure" in item.get("@type", ""):
                violations = item.get("violations", [])
                if violations and isinstance(violations[0], dict):
                    v = violations[0]
                    quota_metric = v.get("quotaMetric", "")
                    quota_id = v.get("quotaId", "")
                    desc = v.get("description", "").lower()
                    if "day" in quota_id.lower() or "per day" in desc:
                        is_daily = True

    # Fallback to regex on message string if retryDelay was not in sub_details
    if retry_delay_sec == 0.0:
        match = re.search(r"Please retry in\s+(?:(\d+)h)?(?:(\d+)m)?([\d\.]+)s", msg, re.I)
        if match:
            h = float(match.group(1) or 0)
            m = float(match.group(2) or 0)
            s = float(match.group(3) or 0)
            retry_delay_sec = h * 3600 + m * 60 + s

    # Classify as daily quota exhaustion if explicitly stated or retry window is long (>300s)
    if "per day" in msg.lower() or "requests per day" in msg.lower() or retry_delay_sec > 300:
        is_daily = True

    return {
        "code": code,
        "retry_delay_sec": retry_delay_sec,
        "is_daily": is_daily,
        "quota_metric": quota_metric,
        "quota_id": quota_id,
        "message": msg,
    }


def record_model_error(model_name: str, parsed: Dict[str, Any]):
    """Records cooldown timestamp for a model based on error severity."""
    now = time.time()
    retry_sec = parsed.get("retry_delay_sec", 0.0)
    is_daily = parsed.get("is_daily", False)
    code = parsed.get("code", 0)

    with _cooldown_lock:
        if code == 429:
            if is_daily:
                # Daily limit reached: cooldown for the remaining retry duration (or 12h default)
                duration = retry_sec if retry_sec > 0 else 43200.0
                _model_cooldowns[model_name] = now + min(duration, 86400.0)
                _model_reasons[model_name] = f"Daily free-tier quota (RPD) reached. Cooldown {int(duration)}s."
            else:
                # Temporary RPM / TPM rate limit: short cooldown
                duration = retry_sec if retry_sec > 0 else 30.0
                _model_cooldowns[model_name] = now + min(duration, 120.0)
                _model_reasons[model_name] = f"Per-minute rate limit. Cooldown {int(duration)}s."
        elif code == 503:
            _model_cooldowns[model_name] = now + 20.0
            _model_reasons[model_name] = "Google server high demand (503). Cooldown 20s."
        elif code == 404:
            # Model retired or unavailable
            _model_cooldowns[model_name] = now + 86400.0 * 7
            _model_reasons[model_name] = "Model not found or discontinued (404)."
        else:
            # Other temporary failure
            _model_cooldowns[model_name] = now + 15.0
            _model_reasons[model_name] = f"Temporary error ({code}). Cooldown 15s."

    logger.warning(f"[AI Tutor] Model {model_name} in cooldown: {_model_reasons.get(model_name)}")


def is_model_available(model_name: str) -> bool:
    """Checks if a model is currently outside its cooldown window."""
    with _cooldown_lock:
        expiry = _model_cooldowns.get(model_name, 0.0)
        return time.time() >= expiry


def get_candidate_models() -> List[str]:
    """
    Returns candidate models in prioritized order.
    Healthy models are prioritized first, starting with the user's configured model.
    Models in cooldown are placed last.
    """
    configured = get_model_name()
    now = time.time()

    all_models = [configured] + [m for m in FREE_TIER_MODELS if m != configured]

    with _cooldown_lock:
        available = [m for m in all_models if _model_cooldowns.get(m, 0.0) <= now]
        cooling = [m for m in all_models if _model_cooldowns.get(m, 0.0) > now]
        # Sort cooling models by earliest expiry
        cooling.sort(key=lambda m: _model_cooldowns.get(m, 0.0))

    return available + cooling


def get_min_cooldown_wait() -> Tuple[float, bool]:
    """Returns (seconds_to_wait, is_daily_quota) across all tracked models."""
    now = time.time()
    with _cooldown_lock:
        if not _model_cooldowns:
            return 30.0, False
        remaining = [max(1.0, exp - now) for exp in _model_cooldowns.values() if exp > now]
        if not remaining:
            return 0.0, False
        min_wait = min(remaining)
        all_daily = all("daily" in _model_reasons.get(m, "").lower() for m in FREE_TIER_MODELS if m in _model_cooldowns)
        return round(min_wait, 1), all_daily


def check_shared_rate_limit() -> Tuple[bool, float]:
    """
    Sliding-window rate limiter across API calls to prevent exceeding 15 RPM.
    Returns (is_rate_limited, wait_seconds).
    """
    global _request_timestamps
    now = time.time()
    with _rate_limit_lock:
        _request_timestamps = [t for t in _request_timestamps if now - t < RATE_LIMIT_WINDOW_SECONDS]
        if len(_request_timestamps) >= RATE_LIMIT_REQUESTS:
            oldest = _request_timestamps[0]
            wait_seconds = max(1.0, round(RATE_LIMIT_WINDOW_SECONDS - (now - oldest), 1))
            return True, wait_seconds
        _request_timestamps.append(now)
        return False, 0.0


def get_api_key() -> str:
    """Securely reads the Gemini API key from backend/.env, reloading if changed."""
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    key = os.getenv("GEMINI_API_KEY", "").strip()
    # Treat placeholder strings as missing
    if not key or key in ("YOUR_API_KEY_HERE", "YOUR_GOOGLE_GEMINI_API_KEY", "your_gemini_api_key_here", "AIzaSy..."):
        return ""
    return key


def get_model_name() -> str:
    """Returns the configured model, defaulting to a supported free-tier model."""
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    configured = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip()
    return configured if configured in FREE_TIER_MODELS else DEFAULT_MODEL


def get_ai_client() -> Optional[genai.Client]:
    """Initializes the official Google Gen AI client with the configured key and fast timeout."""
    api_key = get_api_key()
    if not api_key:
        return None
    try:
        return genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=10000),
        )
    except Exception as e:
        logger.error(f"[AI Tutor] Error initializing Google Gen AI client: {e}")
        return None


def get_assistant_status() -> Dict[str, Any]:
    """Returns operational status, model availability, and cooldowns without leaking keys."""
    api_key = get_api_key()
    model = get_model_name()
    has_key = bool(api_key)
    now = time.time()

    models_status = []
    with _cooldown_lock:
        for m in FREE_TIER_MODELS:
            exp = _model_cooldowns.get(m, 0.0)
            is_avail = exp <= now
            models_status.append({
                "model": m,
                "status": "ready" if is_avail else "cooling_down",
                "cooldown_remaining_sec": max(0, int(exp - now)),
                "reason": _model_reasons.get(m, "") if not is_avail else None,
            })

    candidate_models = get_candidate_models()
    active_model = candidate_models[0] if candidate_models else model

    return {
        "status": "ready" if has_key else "unconfigured",
        "service": "PROJECTILE AI TUTOR",
        "ai_powered": has_key,
        "configured_model": model,
        "active_model": active_model,
        "tier": "free",
        "models": models_status,
        "message": (
            f"Google Gemini AI Tutor is active on Free Tier model '{active_model}'."
            if has_key
            else "GEMINI_API_KEY is not configured in backend/.env. Add your free API key from https://aistudio.google.com/ to activate live Gemini AI."
        ),
        "setup_guide": (
            "1. Visit https://aistudio.google.com/ and create a free Gemini API key.\n"
            "2. Open backend/.env in your project root.\n"
            "3. Set GEMINI_API_KEY=\"your_api_key_here\".\n"
            "4. The AI Tutor connects automatically on the Gemini free tier."
        ),
    }


def format_simulation_context(ctx: Optional[Dict[str, Any]]) -> str:
    """Formats simulation telemetry into concise notes for the model."""
    if not ctx:
        return ""

    parts = []
    if ctx.get("velocity") is not None:
        parts.append(f"Launch Speed: {ctx['velocity']} m/s")
    angle_val = ctx.get("launch_angle") if ctx.get("launch_angle") is not None else ctx.get("angle")
    if angle_val is not None:
        parts.append(f"Angle: {angle_val}°")
    if ctx.get("mass") is not None:
        parts.append(f"Mass: {ctx['mass']} kg")
    if ctx.get("height") is not None:
        parts.append(f"Height: {ctx['height']} m")
    if ctx.get("gravity") is not None:
        parts.append(f"Gravity: {ctx['gravity']} m/s²")
    if ctx.get("theoretical_range") is not None:
        parts.append(f"Ideal Vacuum Range: {ctx['theoretical_range']} m")
    if ctx.get("max_height") is not None:
        parts.append(f"Max Height: {ctx['max_height']} m")
    if ctx.get("flight_time") is not None:
        parts.append(f"Flight Time: {ctx['flight_time']} s")
    if ctx.get("predicted_distance") is not None:
        parts.append(f"ML Model Distance: {ctx['predicted_distance']} m (Random Forest)")

    return " | ".join(parts)


def build_contents_payload(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    simulation_context: Optional[Dict[str, Any]] = None,
) -> List[types.Content]:
    """Builds multi-turn conversation history for Gemini API."""
    contents: List[types.Content] = []
    context_text = format_simulation_context(simulation_context)

    # Detect if user is asking about current simulator values or prediction
    msg_lower = message.lower()
    needs_sim_context = any(kw in msg_lower for kw in [
        "current", "simulator", "simulation", "prediction", "my launch", "my result",
        "telemetry", "model result", "graph", "parameters", "values", "slider"
    ])

    # Convert prior history (keep last 6 turns to keep context lightweight and fast)
    if history:
        capped_history = history[-6:]
        for h in capped_history:
            role_raw = h.get("role") or h.get("sender") or "user"
            role = "user" if role_raw in ("user", "human") else "model"
            text_val = (h.get("text") or h.get("content") or "").strip()
            if not text_val:
                continue
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=text_val)]))

    # Add current user message with context note only when relevant
    if context_text and needs_sim_context:
        current_combined = f"[Simulator Context: {context_text}]\n\n{message}"
    else:
        current_combined = message

    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=current_combined)]))
    return contents


def format_friendly_error(
    err_type: str,
    raw_msg: str = "",
    retry_after: float = 0.0,
    is_daily: bool = False,
) -> Dict[str, Any]:
    """Generates structured, user-friendly error messages with exact recovery instructions."""
    wait_sec = max(1, int(retry_after))

    if err_type == "API_KEY_MISSING":
        return {
            "status": "error",
            "error_code": "API_KEY_MISSING",
            "retry_after": 0,
            "is_daily": False,
            "can_auto_retry": False,
            "answer": (
                "### 🔑 Gemini API Key Required\n\n"
                "The **PROJECTILE AI TUTOR** requires a free Google Gemini API key to generate live answers.\n\n"
                "**Quick Setup Steps:**\n"
                "1. Visit [Google AI Studio](https://aistudio.google.com/) and create a free API key.\n"
                "2. Open `backend/.env` in your project folder.\n"
                "3. Set `GEMINI_API_KEY=\"your_key_here\"`.\n"
                "4. Save the file and the tutor connects instantly."
            ),
            "ai_powered": False,
        }

    if err_type == "QUOTA_DAILY_EXCEEDED" or (err_type == "QUOTA_EXCEEDED" and is_daily):
        hours = wait_sec // 3600
        mins = (wait_sec % 3600) // 60
        time_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

        return {
            "status": "error",
            "error_code": "QUOTA_DAILY_EXCEEDED",
            "retry_after": wait_sec,
            "is_daily": True,
            "can_auto_retry": False,
            "answer": (
                "### 🛑 Daily Free Tier Quota Reached\n\n"
                "Your Google Gemini Free Tier daily requests quota (RPD) has been reached across available models.\n\n"
                f"**Reset Time:** Daily quota resets at midnight Pacific Time (in approximately **{time_str}**). Waiting 30 seconds will not resolve this error.\n\n"
                "**Quick Options:**\n"
                "1. Create another free API key at [Google AI Studio](https://aistudio.google.com/) and update `GEMINI_API_KEY` in `backend/.env`.\n"
                "2. Or wait for the daily quota reset."
            ),
            "ai_powered": False,
        }

    if err_type in ("RATE_LIMIT_TEMPORARY", "QUOTA_EXCEEDED"):
        return {
            "status": "error",
            "error_code": "RATE_LIMIT_TEMPORARY",
            "retry_after": wait_sec,
            "is_daily": False,
            "can_auto_retry": True,
            "answer": (
                "### ⏳ Temporary Rate Limit\n\n"
                "Google Gemini Free Tier rate limit (15 requests per minute) was reached.\n\n"
                f"Please wait **{wait_sec} seconds**. The tutor will automatically retry your question."
            ),
            "ai_powered": False,
        }

    if err_type == "SERVICE_BUSY":
        return {
            "status": "error",
            "error_code": "SERVICE_BUSY",
            "retry_after": wait_sec or 15,
            "is_daily": False,
            "can_auto_retry": True,
            "answer": (
                "### ⚠️ Gemini Service High Demand\n\n"
                "Google Gemini servers are temporarily experiencing high traffic.\n\n"
                f"Please wait **{wait_sec or 15} seconds** and try again."
            ),
            "ai_powered": False,
        }

    if err_type == "INVALID_API_KEY":
        return {
            "status": "error",
            "error_code": "INVALID_API_KEY",
            "retry_after": 0,
            "is_daily": False,
            "can_auto_retry": False,
            "answer": (
                "### ⚠️ Invalid Gemini API Key\n\n"
                "The `GEMINI_API_KEY` configured in `backend/.env` was not accepted by Google Gemini.\n\n"
                "Please verify that you copied the complete key from [Google AI Studio](https://aistudio.google.com/) without extra spaces."
            ),
            "ai_powered": False,
        }

    if err_type == "INPUT_TOO_LONG":
        return {
            "status": "error",
            "error_code": "INPUT_TOO_LONG",
            "retry_after": 0,
            "is_daily": False,
            "can_auto_retry": False,
            "answer": f"### ⚠️ Question Too Long\n\nPlease keep your message under {MAX_MESSAGE_LENGTH} characters to stay within free tier limits.",
            "ai_powered": False,
        }

    return {
        "status": "error",
        "error_code": err_type,
        "retry_after": wait_sec or 10,
        "is_daily": is_daily,
        "can_auto_retry": False,
        "answer": f"### ⚠️ Service Notice\n\nAn unexpected error occurred: {raw_msg or 'Please try your question again in a moment.'}",
        "ai_powered": False,
    }


async def stream_chat_response(
    message: str,
    simulation_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """
    Streams conversational AI responses from Google Gemini using SSE format.
    Automatically handles rate limits, switches to healthy fallback models,
    and returns precise retry metadata.
    """
    api_key = get_api_key()
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', **format_friendly_error('API_KEY_MISSING')})}\n\n"
        return

    if len(message) > MAX_MESSAGE_LENGTH:
        yield f"data: {json.dumps({'type': 'error', **format_friendly_error('INPUT_TOO_LONG')})}\n\n"
        return

    # Check shared sliding-window rate limit
    is_limited, wait_sec = check_shared_rate_limit()
    if is_limited:
        if wait_sec <= 2.0:
            # Short wait: perform quick async sleep with jitter instead of rejecting
            await asyncio.sleep(wait_sec + random.uniform(0.1, 0.3))
        else:
            yield f"data: {json.dumps({'type': 'error', **format_friendly_error('RATE_LIMIT_TEMPORARY', retry_after=wait_sec)})}\n\n"
            return

    client = get_ai_client()
    if not client:
        yield f"data: {json.dumps({'type': 'error', **format_friendly_error('INVALID_API_KEY')})}\n\n"
        return

    candidates = get_candidate_models()
    contents = build_contents_payload(message, history, simulation_context)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.3,
        max_output_tokens=1024,
    )

    loop = asyncio.get_running_loop()
    q: asyncio.Queue = asyncio.Queue()

    def stream_producer():
        last_error_info = None

        for model_candidate in candidates:
            # If model is currently in cooldown and there are other options, skip
            if not is_model_available(model_candidate) and len(candidates) > 1:
                logger.info(f"[AI Tutor] Skipping cooling model {model_candidate}...")
                continue

            try:
                logger.info(f"[AI Tutor] Streaming request with model: {model_candidate}")
                response_stream = client.models.generate_content_stream(
                    model=model_candidate,
                    contents=contents,
                    config=config,
                )
                chunk_received = False
                for chunk in response_stream:
                    text = chunk.text
                    if text:
                        chunk_received = True
                        loop.call_soon_threadsafe(q.put_nowait, ("chunk", text))

                loop.call_soon_threadsafe(q.put_nowait, ("done", model_candidate))
                return

            except APIError as api_err:
                parsed = parse_gemini_error(api_err)
                record_model_error(model_candidate, parsed)
                last_error_info = parsed
                logger.error(
                    f"[AI Tutor] APIError on {model_candidate}: code={parsed['code']}, "
                    f"is_daily={parsed['is_daily']}, retryDelay={parsed['retry_delay_sec']}s"
                )

                # Invalid API key cannot be fixed by switching models
                if parsed["code"] in (400, 403) and ("API_KEY_INVALID" in str(api_err) or "API_KEY" in parsed["message"]):
                    loop.call_soon_threadsafe(q.put_nowait, ("error_type", "INVALID_API_KEY", "", 0.0, False))
                    return

                # If temporary rate limit with small retry_delay (<=2.0s), quick sleep & retry ONCE on same model
                if parsed["code"] == 429 and not parsed["is_daily"] and 0 < parsed["retry_delay_sec"] <= 2.0:
                    try:
                        time.sleep(parsed["retry_delay_sec"] + random.uniform(0.1, 0.4))
                        response_stream = client.models.generate_content_stream(
                            model=model_candidate,
                            contents=contents,
                            config=config,
                        )
                        for chunk in response_stream:
                            if chunk.text:
                                loop.call_soon_threadsafe(q.put_nowait, ("chunk", chunk.text))
                        loop.call_soon_threadsafe(q.put_nowait, ("done", model_candidate))
                        return
                    except Exception as retry_err:
                        logger.warning(f"[AI Tutor] Jitter retry failed on {model_candidate}: {retry_err}")

                # Proceed to next candidate model
                continue

            except Exception as e:
                logger.error(f"[AI Tutor] General error on {model_candidate}: {e}")
                record_model_error(model_candidate, {"code": 500, "is_daily": False, "retry_delay_sec": 15.0})
                last_error_info = {"code": 500, "is_daily": False, "retry_delay_sec": 15.0, "message": str(e)}
                continue

        # If all candidates were exhausted
        min_wait, all_daily = get_min_cooldown_wait()
        if last_error_info and last_error_info.get("is_daily"):
            loop.call_soon_threadsafe(
                q.put_nowait,
                ("error_type", "QUOTA_DAILY_EXCEEDED", last_error_info.get("message", ""), min_wait, True),
            )
        elif last_error_info and last_error_info.get("code") == 503:
            loop.call_soon_threadsafe(
                q.put_nowait,
                ("error_type", "SERVICE_BUSY", last_error_info.get("message", ""), min_wait or 15.0, False),
            )
        else:
            loop.call_soon_threadsafe(
                q.put_nowait,
                ("error_type", "RATE_LIMIT_TEMPORARY", last_error_info.get("message", "") if last_error_info else "", min_wait or 30.0, all_daily),
            )

    threading.Thread(target=stream_producer, daemon=True).start()

    while True:
        item = await q.get()
        tag = item[0]
        if tag == "chunk":
            yield f"data: {json.dumps({'type': 'chunk', 'text': item[1]})}\n\n"
        elif tag == "done":
            yield f"data: {json.dumps({'type': 'done', 'model_used': item[1]})}\n\n"
            break
        elif tag == "error_type":
            err_dict = format_friendly_error(
                err_type=item[1],
                raw_msg=item[2] if len(item) > 2 else "",
                retry_after=item[3] if len(item) > 3 else 0.0,
                is_daily=item[4] if len(item) > 4 else False,
            )
            yield f"data: {json.dumps({'type': 'error', **err_dict})}\n\n"
            break


def generate_chat_response_sync(
    message: str,
    simulation_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Synchronous unary generation endpoint with multi-model fallback and rate-limit recovery.
    """
    api_key = get_api_key()
    if not api_key:
        return format_friendly_error("API_KEY_MISSING")

    if len(message) > MAX_MESSAGE_LENGTH:
        return format_friendly_error("INPUT_TOO_LONG")

    # Check shared sliding-window rate limit
    is_limited, wait_sec = check_shared_rate_limit()
    if is_limited:
        if wait_sec <= 2.0:
            time.sleep(wait_sec + random.uniform(0.1, 0.3))
        else:
            return format_friendly_error("RATE_LIMIT_TEMPORARY", retry_after=wait_sec)

    client = get_ai_client()
    if not client:
        return format_friendly_error("INVALID_API_KEY")

    candidates = get_candidate_models()
    contents = build_contents_payload(message, history, simulation_context)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION,
        temperature=0.3,
        max_output_tokens=1024,
    )

    last_error_info = None

    for model_candidate in candidates:
        if not is_model_available(model_candidate) and len(candidates) > 1:
            logger.info(f"[AI Tutor] Sync: skipping cooling model {model_candidate}...")
            continue

        try:
            logger.info(f"[AI Tutor] Sync generation with model: {model_candidate}")
            response = client.models.generate_content(
                model=model_candidate,
                contents=contents,
                config=config,
            )

            return {
                "status": "success",
                "answer": response.text or "I processed your request, but no text was returned.",
                "model_used": model_candidate,
                "ai_powered": True,
            }

        except APIError as api_err:
            parsed = parse_gemini_error(api_err)
            record_model_error(model_candidate, parsed)
            last_error_info = parsed
            logger.error(
                f"[AI Tutor] Sync APIError on {model_candidate}: code={parsed['code']}, "
                f"is_daily={parsed['is_daily']}, retryDelay={parsed['retry_delay_sec']}s"
            )

            if parsed["code"] in (400, 403) and ("API_KEY_INVALID" in str(api_err) or "API_KEY" in parsed["message"]):
                return format_friendly_error("INVALID_API_KEY")

            # Quick jitter retry on same model for short RPM limits
            if parsed["code"] == 429 and not parsed["is_daily"] and 0 < parsed["retry_delay_sec"] <= 2.0:
                try:
                    time.sleep(parsed["retry_delay_sec"] + random.uniform(0.1, 0.4))
                    response = client.models.generate_content(
                        model=model_candidate,
                        contents=contents,
                        config=config,
                    )
                    return {
                        "status": "success",
                        "answer": response.text or "No text returned.",
                        "model_used": model_candidate,
                        "ai_powered": True,
                    }
                except Exception as retry_err:
                    logger.warning(f"[AI Tutor] Sync retry failed on {model_candidate}: {retry_err}")

            continue

        except Exception as e:
            logger.error(f"[AI Tutor] Sync generation exception on {model_candidate}: {e}")
            record_model_error(model_candidate, {"code": 500, "is_daily": False, "retry_delay_sec": 15.0})
            last_error_info = {"code": 500, "is_daily": False, "retry_delay_sec": 15.0, "message": str(e)}
            continue

    min_wait, all_daily = get_min_cooldown_wait()
    if last_error_info and last_error_info.get("is_daily"):
        return format_friendly_error("QUOTA_DAILY_EXCEEDED", raw_msg=last_error_info.get("message", ""), retry_after=min_wait, is_daily=True)
    elif last_error_info and last_error_info.get("code") == 503:
        return format_friendly_error("SERVICE_BUSY", raw_msg=last_error_info.get("message", ""), retry_after=min_wait or 15.0)

    return format_friendly_error("RATE_LIMIT_TEMPORARY", raw_msg=last_error_info.get("message", "") if last_error_info else "", retry_after=min_wait or 30.0, is_daily=all_daily)
