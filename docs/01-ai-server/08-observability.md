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

The logging configuration is now handled in `main.py` and the middleware in `middleware/logging.py`.

```python
# ai-server/middleware/logging.py
import time
import uuid
import structlog
from fastapi import Request

logger = structlog.get_logger()

async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    
    # ... (log request started, process request, log finished with duration)
```

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
