# app/embeddings.py
from sentence_transformers import SentenceTransformer
import numpy as np

# choose a small, fast model for embeddings; swap for a larger model if needed
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
_model = SentenceTransformer(EMBED_MODEL_NAME)


def embed_texts(texts: list[str]) -> list:
    # returns numpy array of shape (len(texts), dim)
    embs = _model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embs