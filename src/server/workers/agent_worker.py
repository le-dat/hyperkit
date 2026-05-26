"""ARQ worker — thin wrapper around agent_task.run_agent_task."""

from db.models import init_db
from config import settings
from workers.task_helpers import _parse_redis_url
from workers.agent_task import run_agent_task, resume_agent_task


class WorkerSettings:
    """ARQ worker configuration."""

    functions = [run_agent_task, resume_agent_task]
    redis_settings = _parse_redis_url(settings.redis_url)
    max_jobs = 10
    job_timeout = 300  # 5 minutes max per task

    async def on_startup(ctx: dict):
        import redis.asyncio as aioredis
        await init_db(settings.database_url)
        ctx["redis"] = await aioredis.from_url(settings.redis_url, decode_responses=True)

        # Initialize MCP tools so node_process can bind them to the LLM
        from agents import build_mcp_tools, set_mcp_tools
        try:
            mcp_tools = await build_mcp_tools()
            set_mcp_tools(mcp_tools)
        except Exception as e:
            import structlog
            logger = structlog.get_logger(__name__)
            logger.warning("worker_mcp_tools_init_failed", error=str(e))

    async def on_shutdown(ctx: dict):
        await ctx["redis"].close()
