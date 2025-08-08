# app/schemas.py
from pydantic import BaseModel
from typing import Optional

class UploadResponse(BaseModel):
    status: str
    chunks: int

class ChatRequest(BaseModel):
    user_id: int
    conversation_id: Optional[int] = None
    question: str
    top_k: int = 4

class ChatResponse(BaseModel):
    answer: str
    conversation_id: int