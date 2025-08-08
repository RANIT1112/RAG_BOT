# app/vectorstore.py
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import os

# Use local chroma (persist_directory optional)
chroma_client = chromadb.Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory="./chroma_db"))

COLLECTION_NAME = "rag_docs"

# create or get collection
try:
    collection = chroma_client.get_collection(COLLECTION_NAME)
except Exception:
    # Use default huggingface embedding function if you want chroma to handle embeddings;
    # but since we compute embeddings ourselves with sentence-transformers, we will upsert embeddings directly.
    collection = chroma_client.create_collection(name=COLLECTION_NAME)


def upsert_documents(docs: list[dict]):
    # docs: list of {'id': str, 'embedding': list[float], 'metadata': {...}}
    ids = [d['id'] for d in docs]
    embeddings = [d['embedding'] for d in docs]
    metadatas = [d['metadata'] for d in docs]
    documents = [d['metadata'].get('text', '') for d in docs]
    collection.add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=documents)


def query_vectors(query_embedding, top_k: int = 4):
    # returns list of matches with metadata and score
    res = collection.query(query_embeddings=[query_embedding], n_results=top_k, include=['metadatas', 'distances', 'documents'])
    matches = []
    if res and len(res['ids']) > 0:
        # res fields: ids, distances, metadatas, documents
        ids = res['ids'][0]
        dists = res['distances'][0]
        metas = res['metadatas'][0]
        docs = res['documents'][0]
        for _id, dist, meta, doc in zip(ids, dists, metas, docs):
            matches.append({'id': _id, 'score': dist, 'metadata': meta, 'document': doc})
    return matches


def persist():
    chroma_client.persist()