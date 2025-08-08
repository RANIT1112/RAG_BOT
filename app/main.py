# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from . import chat
from . import ingest

# Load environment variables
load_dotenv()

app = FastAPI(
    title="RAG Chatbot with ChromaDB + Groq",
    description="Upload PDFs, ingest into Chroma, and chat using Groq's LLaMA model",
    version="1.0.0",
)

# Allow CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],  # change to your frontend URL in production
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(ingest.router, tags=["Ingestion"])
app.include_router(chat.router, tags=["Chat"])

@app.get("/")
def root():
    return {"message": "RAG Chatbot API is running"}
