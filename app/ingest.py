# app/ingest.py
import os
import sqlite3
from uuid import uuid4
from fastapi import APIRouter, File, UploadFile, Form, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from chromadb.utils import embedding_functions
from .db import get_collection

load_dotenv()

router = APIRouter()

DB_PATH = "rag_history.db"

# Ensure DB exists
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Stores conversation history
    c.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        role TEXT,
        content TEXT
    )
    """)
    # Stores uploaded docs
    c.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        filename TEXT
    )
    """)
    conn.commit()
    conn.close()

init_db()

# Embeddings function (change model if needed)
embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

@router.post("/upload_pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    collection=Depends(get_collection)
):
    file_id = str(uuid4())
    file_path = f"uploaded_files/{file.filename}"
    os.makedirs("uploaded_files", exist_ok=True)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    # Save doc metadata to DB
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO documents (id, user_id, filename) VALUES (?, ?, ?)",
                 (file_id, user_id, file.filename))
    conn.commit()
    conn.close()

    # Extract text from PDF
    pdf = PdfReader(file_path)
    chunks = []
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            chunks.append(text)

    # Store in Chroma
    collection.add(
        documents=chunks,
        ids=[f"{file_id}_{i}" for i in range(len(chunks))],
        embeddings=embedding_func(chunks),
        metadatas=[{"user_id": user_id} for _ in chunks]
    )

    return JSONResponse({"status": "success", "message": f"{file.filename} ingested"})

def save_message(user_id: str, role: str, content: str):
    """Save a message to chat history."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)",
                 (user_id, role, content))
    conn.commit()
    conn.close()

def get_history(user_id: str, limit: int = 10):
    """Retrieve last N messages for a user."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT role, content FROM chat_history
        WHERE user_id=? ORDER BY id DESC LIMIT ?
    """, (user_id, limit))
    rows = c.fetchall()
    conn.close()
    # Return in reverse (oldest first)
    return [{"role": r, "content": c} for r, c in reversed(rows)]
