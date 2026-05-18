"""Budget guard — cost cap per request and Slack alert on overrun."""

import httpx

from config import settings


async def send_slack_alert(msg: str) -> None:
    """Send a Slack alert via webhook. Silently succeeds if webhook not configured."""
    if not settings.slack_webhook_url:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            settings.slack_webhook_url,
            json={"text": msg},
            timeout=5.0,
        )


async def check_budget_and_alert(func_name: str, cost: float) -> None:
    """
    Check if accumulated cost exceeds the per-request limit and alert via Slack.

    Call this after an agent run completes to record and verify budget.
    """
    limit = settings.max_cost_per_request_usd
    if cost > limit:
        await send_slack_alert(
            f"⚠️ Cost overrun: ${cost:.4f} > ${limit:.2f} — {func_name}"
        )
        raise RuntimeError(f"Cost limit exceeded: ${cost:.4f} (limit: ${limit:.2f})")