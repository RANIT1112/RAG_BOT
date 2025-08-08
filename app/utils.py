# app/utils.py
import re
from typing import List


def clean_text(text: str) -> str:
    text = text.replace('\r', '\n')
    text = re.sub('\n{2,}', '\n\n', text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = words[i:i+chunk_size]
        chunks.append(' '.join(chunk))
        i += chunk_size - overlap
    return chunks