# Step 08 — Observability: Logging, LangSmith, Metrics, RAGAS

## Goal

Production-grade observability:
- **structlog** JSON → stdout → ELK/Grafana
- **LangSmith** tracing + `@traceable` + cost per run
- **Prometheus** metrics (P50/P95/P99, cost/request, tool calls)
- **RAGAS eval** CI gate (block deploy if recall < 0.75)
- **LLM-as-Judge** 5% production sampling

---

## File Structure

```
ai-server/
├── middleware/
│   └── logging.py     ← Structured logging middleware
├── routers/
│   └── system.py      ← Health check & metrics
└── observability/
    ├── langsmith.py  ← @traceable + cost
    ├── metrics.py    ← Prometheus + alert thresholds
    └── eval.py       ← RAGAS + LLM-as-judge
```

---

## Step 8.1 — Structured Logger

The logging configuration is in `main.py` and the middleware in `middleware/logging.py`.

```python
# ai-server/middleware/logging.py
import uuid
import structlog
from fastapi import Request


async def log_requests(request: Request, call_next):
    logger = structlog.get_logger()
    request_id = str(uuid.uuid4())[:8]

    with structlog.contextvars.bound_contextvars(request_id=request_id):
        logger.info("request_started", method=request.method, path=request.url.path)
        response = await call_next(request)
        # Return X-Request-ID so clients can correlate errors with backend logs
        response.headers["X-Request-ID"] = request_id
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, log_level)(
            "request_finished",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
        )
        return response
```

`main.py` uses a conditional renderer:
- `ENV=development` → `structlog.dev.ConsoleRenderer()` (human-readable)
- production → `structlog.processors.JSONRenderer()` (for log aggregation)

---

## Step 8.2 — LangSmith Tracing

```python
# ai-server/observability/langsmith.py
# Set before importing LangChain (done in main.py lifespan)
# os.environ["LANGCHAIN_TRACING_V2"] = "true"
# All LangGraph calls auto-traced → https://smith.langchain.com

from langsmith import traceable
from langchain_community.callbacks import get_openai_callback


@traceable(name="agent_pipeline", tags=["production", "v2"])
async def traced_run(conversation_id: str, message: str, user_id: str):
    from agents.supervisor import graph
    from observability.logger import log

    with get_openai_callback() as cb:
        config = {"configurable": {"thread_id": conversation_id}}
        result = await graph.ainvoke(
            {"messages": [], "task": message, "conversation_id": conversation_id,
             "user_id": user_id, "attempts": 0, "errors": [], "confidence": 1.0, "approved": False},
            config=config,
        )
        log.info("token_usage", conv_id=conversation_id,
                 tokens=cb.total_tokens, cost_usd=cb.total_cost)

    return result
```

---

## Step 8.3 — Prometheus Metrics + Alert Thresholds

```python
# ai-server/observability/metrics.py
from prometheus_client import Counter, Histogram, Gauge

REQUEST_LATENCY = Histogram(
    "agent_latency_seconds", "Agent request latency", ["status"],
    buckets=[0.5, 1, 2, 3, 5, 10, 30],
)
TOKEN_COST  = Counter("agent_cost_usd_total",   "LLM cost total",      ["model"])
TOOL_CALLS  = Counter("agent_tool_calls_total",  "Tool call count",     ["tool", "status"])
TASK_DONE   = Counter("agent_tasks_total",       "Task outcomes",       ["outcome"])
ACTIVE_SSE  = Gauge(  "agent_active_sse",        "Active SSE sessions")

# Alert thresholds — check in Grafana alerting or cron
THRESHOLDS = {
    "p95_latency_s":        5.0,    # > 5s  → alert
    "task_completion_rate": 0.85,   # < 85% → alert
    "hallucination_rate":   0.05,   # > 5%  → alert
    "cost_per_request_usd": 0.50,   # > $0.50 → alert
    "tool_calls_session":   10,     # > 10  → Slack
    "ragas_context_recall": 0.75,   # < 0.75 → BLOCK DEPLOY
}
```

Add Prometheus endpoint to `main.py`:
```python
from prometheus_client import generate_latest
from fastapi.responses import PlainTextResponse

@app.get("/metrics")
async def prometheus_metrics():
    return PlainTextResponse(generate_latest(), media_type="text/plain")
```

---

## Step 8.4 — RAGAS Eval + LLM-as-Judge

```python
# ai-server/observability/eval.py
import random, json
from langchain_openai import ChatOpenAI


# ── LLM-as-Judge: sample 5% production traffic ─────────────────────────
async def maybe_evaluate(question: str, answer: str, context: str, rate: float = 0.05):
    if random.random() >= rate:
        return None
    return await judge(question, answer, context)


async def judge(question: str, answer: str, context: str) -> dict:
    prompt = (
        f"Score this AI response (1-5):\n"
        f"Q: {question}\nContext: {context}\nA: {answer}\n\n"
        f"Return JSON only: {{\"score\":1-5,\"hallucination\":true/false,\"reason\":\"...\"}}"
    )
    resp = await ChatOpenAI(model="gpt-4o", temperature=0).ainvoke(prompt)
    verdict = json.loads(resp.content)
    if verdict.get("hallucination"):
        print(f"🚨 HALLUCINATION detected: Q={question[:60]}")
    return verdict


# ── RAGAS CI gate ──────────────────────────────────────────────────────
async def run_ragas_eval(path: str = "tests/golden_dataset.json") -> dict:
    """
    Run against golden_dataset.json.
    Called in CI — blocks deploy if context_recall < 0.75.
    """
    from ragas import evaluate
    from ragas.metrics import faithfulness, answer_relevancy, context_recall
    from datasets import Dataset

    with open(path) as f:
        data = Dataset.from_list(json.load(f))

    result = evaluate(dataset=data,
                      metrics=[faithfulness, answer_relevancy, context_recall])
    df = result.to_pandas()
    scores = {
        "faithfulness":     float(df["faithfulness"].mean()),
        "answer_relevancy": float(df["answer_relevancy"].mean()),
        "context_recall":   float(df["context_recall"].mean()),
    }

    # CI gate
    assert scores["context_recall"] >= 0.75, (
        f"❌ context_recall={scores['context_recall']:.2f} < 0.75 — deploy blocked"
    )
    print(f"✅ RAGAS passed. recall={scores['context_recall']:.2f}")
    return scores
```

---

## Step 8.5 — Database-Driven Telemetry Audit Tracing

For enterprise compliance and precise debugging of autonomous agents, logs alone are insufficient. We implement a structured **Database-Driven Tracing** mechanism using PostgreSQL to store every agent run, intermediate thought process, tool execution, and resource cost.

### 1. PostgreSQL Schema definition

```python
# ai-server/db/models.py or observability/models.py
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship
from uuid import uuid4
from datetime import datetime, timezone

Base = declarative_base()

class Trace(Base):
    """
    Root table tracking the complete agent turn (Request -> Final Answer).
    Captures end-to-end latency, tokens consumed, and actual USD costs.
    """
    __tablename__ = "agent_traces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    turn_id = Column(String(100), unique=True, nullable=False, index=True)
    conversation_id = Column(String(100), nullable=False, index=True)
    user_id = Column(String(100), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    
    # End-to-end performance and cost calculations
    time_to_first_token_ms = Column(Integer, nullable=True)
    total_latency_ms = Column(Integer, nullable=True)
    total_tokens = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    steps = relationship("TraceStep", back_populates="trace", cascade="all, delete-orphan")


class TraceStep(Base):
    """
    Child table capturing every discrete agent step (thinking, tools, LLM calls).
    """
    __tablename__ = "agent_trace_steps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    trace_id = Column(UUID(as_uuid=True), ForeignKey("agent_traces.id", ondelete="CASCADE"), nullable=False)
    
    # 'thinking_block', 'tool_call', 'llm_call', or 'human_approval'
    step_type = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    
    # Metadata payloads
    input_data = Column(JSON, nullable=True)   # e.g., {"tool": "read_file", "args": {"path": "..."}}
    output_data = Column(JSON, nullable=True)  # e.g., {"status": "success", "content": "..."}
    
    # Latency and token details per step
    latency_ms = Column(Integer, nullable=True)
    tokens_used = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    trace = relationship("Trace", back_populates="steps")
```

### 2. Tracing Service Implementation

```python
# ai-server/observability/tracing.py
from db.models import AsyncSessionLocal, Trace, TraceStep
from sqlalchemy.future import select
from uuid import UUID

class TraceService:
    @staticmethod
    async def create_trace(
        turn_id: str, 
        conversation_id: str, 
        user_id: str, 
        prompt: str
    ) -> str:
        """Initialize a new root trace record for a session turn."""
        async with AsyncSessionLocal() as db:
            trace = Trace(
                turn_id=turn_id,
                conversation_id=conversation_id,
                user_id=user_id,
                prompt=prompt
            )
            db.add(trace)
            await db.commit()
            return str(trace.id)

    @staticmethod
    async def log_step(
        trace_id: str,
        step_type: str,
        name: str,
        input_data: dict = None,
        output_data: dict = None,
        latency_ms: int = None,
        tokens: int = 0,
        cost: float = 0.0
    ) -> None:
        """Log an intermediate reasoning step or execution call."""
        async with AsyncSessionLocal() as db:
            step = TraceStep(
                trace_id=UUID(trace_id),
                step_type=step_type,
                name=name,
                input_data=input_data,
                output_data=output_data,
                latency_ms=latency_ms,
                tokens_used=tokens,
                cost_usd=cost
            )
            db.add(step)
            await db.commit()

    @staticmethod
    async def complete_trace(
        trace_id: str,
        response: str,
        total_latency_ms: int,
        ttft_ms: int = None,
        total_tokens: int = 0,
        total_cost_usd: float = 0.0
    ) -> None:
        """Finalize the trace turn with terminal response and total latency/costs."""
        async with AsyncSessionLocal() as db:
            stmt = select(Trace).where(Trace.id == UUID(trace_id))
            result = await db.execute(stmt)
            trace = result.scalar_one_or_none()
            if trace:
                trace.response = response
                trace.total_latency_ms = total_latency_ms
                trace.time_to_first_token_ms = ttft_ms
                trace.total_tokens = total_tokens
                trace.total_cost_usd = total_cost_usd
                await db.commit()
```

---

## tests/golden_dataset.json (sample)

```json
[
  {
    "question": "Tổng invoice vendor ABC tháng 3?",
    "answer": "15,000,000 VND",
    "contexts": ["Invoice INV-003 từ ABC, tổng 15,000,000 VND"],
    "ground_truth": "15,000,000 VND"
  }
]
```
*(Add 100 curated Q&A pairs for production use)*

---

## Verification

```bash
# Prometheus metrics
curl http://localhost:8000/metrics

# RAGAS eval (run in CI or locally)
python -c "
import asyncio
from observability.eval import run_ragas_eval
asyncio.run(run_ragas_eval())
"
# → ✅ RAGAS passed.
```

> **Prerequisite**: [Step 07 — MCP Integration](./07-mcp.md)
> ✅ **AI Agent Backend complete!** → Next: [Step 09 — Frontend Setup](../02-frontend/01-setup.md)
