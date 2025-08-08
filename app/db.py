# app/db.py
import os
import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import chromadb
from chromadb.config import Settings
from fastapi import Depends

# ------------------------
# SQLAlchemy setup (Chat history)
# ------------------------
DATABASE_URL = "sqlite:///./rag_chroma.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)

class Conversation(Base):
    __tablename__ = 'conversations'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    title = Column(String, default='')
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey('conversations.id'))
    role = Column(String)  # 'user' or 'assistant'
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Dependency to get SQLAlchemy DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------
# ChromaDB setup (Vector store for RAG)
# ------------------------
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION", "rag_collection")

def get_chroma_client():
    """
    Create and return a persistent Chroma client.
    """
    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    return client

def get_collection(client=Depends(get_chroma_client)):
    """
    Get or create the Chroma collection.
    """
    return client.get_or_create_collection(name=COLLECTION_NAME)
