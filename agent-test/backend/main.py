"""
AssetFlow Agent - FastAPI application.
"""
import os
import sqlite3
import requests as http_requests
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agent import run_agent

# ── Configuration ───────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db', 'assetflow.db')
OLLAMA_URL = 'http://localhost:11434'


# ── Startup checks ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup checks before the app begins serving requests."""
    # Check that the database exists
    if not os.path.exists(DB_PATH):
        raise RuntimeError(
            f"Database not found at {DB_PATH}. "
            "Run 'python db/seed.py' first to create and seed the database."
        )

    # Check Ollama connectivity
    try:
        resp = http_requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        resp.raise_for_status()
        models = [m['name'] for m in resp.json().get('models', [])]
        print(f"[Startup] Ollama is reachable. Available models: {models}")
    except Exception as e:
        print(
            f"[Startup] WARNING: Ollama is not reachable at {OLLAMA_URL}: {e}. "
            "The /chat endpoint will fail until Ollama is running."
        )

    # Verify DB tables
    conn = sqlite3.connect(DB_PATH)
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()]
    conn.close()
    print(f"[Startup] Database OK. Tables: {tables}")

    yield  # App runs here


# ── FastAPI app ─────────────────────────────────────────────
app = FastAPI(
    title="AssetFlow Agent API",
    description="Agentic AI-powered manufacturing asset management system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response models ─────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []


class ChatResponse(BaseModel):
    answer: str
    trace: list = []


# ── Endpoints ───────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message to the AssetFlow Agent and get an AI-powered response."""
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    result = run_agent(
        user_message=request.message,
        conversation_history=request.conversation_history,
        db_path=DB_PATH,
    )
    return ChatResponse(**result)


@app.get("/db-summary")
async def db_summary():
    """Return row counts for each table in the database."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database not found")

    conn = sqlite3.connect(DB_PATH)
    tables = ['plants', 'departments', 'employees', 'assets',
              'asset_allocations', 'maintenance_requests', 'bookings']
    summary = {}
    for table in tables:
        try:
            count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            summary[table] = count
        except Exception as e:
            summary[table] = f"error: {str(e)}"
    conn.close()
    return {"database": DB_PATH, "tables": summary}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "AssetFlow Agent API"}
