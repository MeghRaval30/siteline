# AssetFlow Agent

**AI-powered manufacturing asset management** — a real agentic system that queries a live database using Ollama-powered tool calling, running 100% locally on your machine.

## What Makes This "Agentic"

This is **not** a chatbot with hardcoded rules or keyword matching. The LLM (`qwen2.5:7b-instruct` via Ollama) genuinely decides:

1. **Which functions to call** based on the user's natural language question
2. **What arguments to pass** — the model constructs the parameters itself
3. **Whether to chain multiple calls** — for complex questions, the model calls one tool, reads the result, decides it needs more info, and calls another
4. **When to stop** — it synthesizes all gathered data into a final answer

The entire reasoning trace is visible in the UI: every tool called, with what arguments, and what it returned. This is the proof that the AI is genuinely reasoning — not a developer-written `if/else` tree. The model could call any combination of the 10 available tools in any order, based purely on the question asked.

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** running at `http://localhost:11434` with `qwen2.5:7b-instruct` pulled

### One-Command Launch

```cmd
run.bat
```

This checks Ollama, seeds the database (if first run), and starts both backend and frontend.

### Manual Setup

```cmd
# 1. Create Python environment
python -m venv venv
.\venv\Scripts\activate
pip install fastapi uvicorn requests pydantic

# 2. Seed the database (creates db/assetflow.db)
python db\seed.py

# 3. Start the backend (port 8000)
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 4. Start the frontend (in another terminal)
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**.

### Re-seed the Database

```cmd
python db\seed.py
```

This drops and recreates the database with fresh synthetic data (deterministic — seed 42).

---

## Example Questions to Try

### Simple (1 tool call)
> **"How many forklifts are under maintenance?"**
>
> Expected trace: `count_assets(category="Forklift", status="Under Maintenance")` → returns a count

### Medium (1-2 tool calls)
> **"Show me all overdue asset returns"**
>
> Expected trace: `get_overdue_allocations()` → returns list with employee names, asset details, days overdue

### Multi-Step (2-3 tool calls)
> **"Which department has the most overdue assets and who should I talk to about returning them?"**
>
> Expected trace:
> 1. `get_overdue_allocations()` → gets all overdue items
> 2. Possibly `get_department_summary(department_name=...)` → digs into the worst department
> 3. Final answer names specific people to contact

### Complex (2-4 tool calls)
> **"What are the open critical and high-priority maintenance requests and which plants are affected?"**
>
> Expected trace:
> 1. `list_maintenance_requests(status="Open", priority="Critical")` → critical issues
> 2. `list_maintenance_requests(status="Open", priority="High")` → high-priority issues
> 3. Final answer summarizes by plant

---

## Architecture

```
assetflow-agent/
├── db/
│   ├── schema.sql          # SQLite schema (7 tables)
│   ├── seed.py             # Synthetic data generator
│   └── assetflow.db        # Generated database
├── backend/
│   ├── tools.py            # 10 database query functions + Ollama tool schemas
│   ├── agent.py            # Agentic loop (LLM → tool call → execute → repeat)
│   └── main.py             # FastAPI app (POST /chat, GET /db-summary)
├── frontend/               # React + Vite UI
│   └── src/
│       ├── App.jsx         # Chat UI with trace visualization
│       └── index.css       # Industrial dark theme
├── run.bat                 # One-click launcher
└── README.md
```

### Available Tools (the LLM chooses from these)

| Tool | Purpose |
|------|---------|
| `query_assets` | Search/filter assets by category, plant, status, dept |
| `get_asset_detail` | Full detail on one asset with history |
| `who_has_asset` | Who currently holds a specific asset |
| `get_employee_assets` | All assets held by one person |
| `count_assets` | Count matching assets |
| `list_maintenance_requests` | Filter maintenance tickets |
| `get_overdue_allocations` | Assets past return date |
| `get_upcoming_bookings` | Upcoming reservations |
| `get_department_summary` | Department-level overview |
| `run_custom_query` | Safe read-only SQL (SELECT only) |

### Database Contents

| Table | ~Rows | Description |
|-------|-------|-------------|
| plants | 3 | Detroit, Austin, Chicago |
| departments | 10 | Assembly, QC, IT, R&D, etc. |
| employees | 35 | Operators, engineers, managers |
| assets | 136 | CNC machines, forklifts, conveyors, etc. |
| asset_allocations | 103 | Active, returned, and overdue allocations |
| maintenance_requests | 40 | Realistic technical issue descriptions |
| bookings | 55 | Meeting rooms, vehicles, equipment bookings |

---

## Tech Stack

- **LLM**: Ollama + qwen2.5:7b-instruct (local, GPU-accelerated)
- **Backend**: Python, FastAPI, SQLite
- **Frontend**: React + Vite
- **No cloud dependencies** — everything runs on your machine
