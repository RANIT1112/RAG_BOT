# app/db_helpers.py
from datetime import datetime, timezone
from .db import SessionLocal, User, Conversation, Message


def create_user(name: str = "RG"):
    db = SessionLocal()
    u = User(name=name)
    db.add(u)
    db.commit()
    db.refresh(u)
    db.close()
    return u


def create_conversation(user_id: int, title: str = ''):
    db = SessionLocal()
    c = Conversation(user_id=user_id, title=title)
    db.add(c)
    db.commit()
    db.refresh(c)
    db.close()
    return c


def save_message(conversation_id: int, role: str, content: str):
    db = SessionLocal()
    m = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(m)
    db.commit()
    db.refresh(m)
    db.close()
    return m


def get_recent_messages(conversation_id: int, limit: int = 6):
    db = SessionLocal()
    msgs = db.query(Message).filter(Message.conversation_id==conversation_id).order_by(Message.timestamp.desc()).limit(limit).all()
    db.close()
    return list(reversed(msgs))


def get_or_create_conversation(user_id: int):
    db = SessionLocal()
    try:
        # Get latest conversation for this user
        conversation = (
            db.query(Conversation)
            .filter(Conversation.user_id == user_id)
            .order_by(Conversation.created_at.desc())
            .first()
        )

        # If no conversation exists, create one
        if not conversation:
            conversation = Conversation(
                user_id=user_id,
                title="Chat Session",
                created_at = datetime.utcnow()
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        return conversation.id
    finally:
        db.close()