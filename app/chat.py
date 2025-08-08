# app/chat.py
import os
from fastapi import APIRouter, Depends, Form
from app.db_helpers import get_or_create_conversation
from groq import Groq # type: ignore
from .db import get_collection
from .schemas import ChatResponse
from .ingest import save_message, get_history

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def retrieve_context(query: str, collection, user_id: str):
    # Query only documents belonging to this user
    results = collection.query(
        query_texts=[query],
        n_results=5,
        where={"user_id": user_id}  # filter to user-specific docs
    )
    documents = [doc for sublist in results['documents'] for doc in sublist]
    return "\n".join(documents)

@router.post("/chat", response_model=ChatResponse)
async def chat(
    user_id: str = Form(...),
    message: str = Form(...),
    collection=Depends(get_collection)
):
    # 1. Get or create conversation
    conversation_id = get_or_create_conversation(user_id) 

    # 2. Retrieve RAG context
    context = retrieve_context(message, collection, user_id)

    # 3. Retrieve past conversation history for this user
    history_messages = get_history(conversation_id, limit=10)

    # 4. Build full message list for Groq
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Use the provided context when relevant."}
    ]
    messages.extend(history_messages)
    messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"})

    # 5. Call Groq API
    response = client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile",
        stream=False
    )
    answer = response.choices[0].message.content

    # 6. Save messages
    save_message(conversation_id, "user", message)
    save_message(conversation_id, "assistant", answer)

    # 7. Return both fields
    return ChatResponse(
        answer=answer,
        conversation_id=conversation_id
    )
