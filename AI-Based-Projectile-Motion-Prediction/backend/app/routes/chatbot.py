import os
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.services import ai_tutor_service

logger = logging.getLogger("ai_tutor_router")
router = APIRouter()


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User's query, physics doubt, coding question, or simulation query")
    simulation_context: Optional[Dict[str, Any]] = Field(default=None, description="Current simulation lab telemetry")
    history: Optional[List[Dict[str, Any]]] = Field(default=None, description="Prior conversation turns for multi-turn context")
    stream: Optional[bool] = Field(default=False, description="Whether to stream response tokens via Server-Sent Events (SSE)")


@router.get("/status")
def get_assistant_status():
    """
    Returns the real-time configuration and connectivity status of the Gemini AI assistant.
    Does NOT return or expose sensitive API keys.
    """
    return ai_tutor_service.get_assistant_status()


@router.post("/chat")
async def chat_endpoint(req: ChatMessageRequest):
    """
    Primary conversational endpoint for PROJECTILE AI TUTOR.
    Powered by official Google Gemini API (Free Tier).
    Supports:
    - Multi-turn conversation history
    - Physics, Kinematics, Math, Programming, Science & General Knowledge questions
    - Telemetry injection from current projectile motion simulation
    - Streaming responses (SSE) or unary JSON responses
    """
    clean_msg = req.message.strip()
    if not clean_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Streaming mode requested
    if req.stream:
        async def event_generator():
            try:
                async for chunk in ai_tutor_service.stream_chat_response(
                    message=clean_msg,
                    simulation_context=req.simulation_context,
                    history=req.history,
                ):
                    yield chunk
            except Exception as e:
                logger.error(f"[Chatbot Router] Error in streaming generator: {e}")
                err_data = json.dumps({"type": "error", "error_code": "STREAM_ERROR", "message": str(e)})
                yield f"data: {err_data}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "Access-Control-Allow-Origin": "*",
            },
        )

    # Standard unary JSON mode - run in threadpool so FastAPI event loop is never blocked
    response = await run_in_threadpool(
        ai_tutor_service.generate_chat_response_sync,
        message=clean_msg,
        simulation_context=req.simulation_context,
        history=req.history,
    )
    return response


@router.post("/reset")
def reset_conversation():
    """
    Resets the chat conversation state.
    """
    return {
        "status": "success",
        "message": "AI Tutor conversation session has been reset.",
        "service": "PROJECTILE AI TUTOR",
    }
