import asyncio
import json
import sys
import uuid
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings
from workers.agent_task import run_agent_task
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

async def listen_sse(turn_id: str, redis):
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"sse:{turn_id}")
    print(f"--- Listening on Redis channel sse:{turn_id} ---")
    try:
        async for msg in pubsub.listen():
            if msg.get("type") != "message":
                continue
            data = json.loads(msg["data"])
            event = data.get("event")
            event_data = data.get("data")
            print(f"EVENT: {event}")
            print(f"DATA:  {event_data}")
            print("-" * 50)
            if event in ("agent_complete", "error", "cancelled", "rejected"):
                break
    except Exception as e:
        print("Listen Error:", e)
    finally:
        await pubsub.unsubscribe(f"sse:{turn_id}")
        await pubsub.aclose()

async def main():
    import redis.asyncio as aioredis
    import os
    redis_password = os.getenv("REDIS_PASSWORD")
    redis_url = settings.redis_url
    if redis_password and "@" not in redis_url:
        if redis_url.startswith("redis://"):
            redis_url = redis_url.replace("redis://", f"redis://:{redis_password}@")
            
    redis_client = aioredis.from_url(redis_url, decode_responses=True)
    
    turn_id = str(uuid.uuid4())
    conversation_id = str(uuid.uuid4())
    user_id = "test-user"
    message = "cần dùng open api key khi học langchain rag"
    
    print(f"Starting agent task with Turn ID: {turn_id}")
    
    # Initialize DB connection since we are running outside lifespan
    from db import models as db_models
    # Map 127.0.0.1:5433 for host machine runs
    db_url = settings.database_url.replace("@postgres:5432", "@127.0.0.1:5433")
    await db_models.init_db(db_url)
    
    # Run the listener in background
    listener_task = asyncio.create_task(listen_sse(turn_id, redis_client))
    
    # Wait a bit for subscription
    await asyncio.sleep(0.5)
    
    # Mock arq context
    ctx = {"redis": redis_client}
    
    try:
        await run_agent_task(
            ctx,
            turn_id=turn_id,
            conversation_id=conversation_id,
            user_id=user_id,
            message=message,
        )
    except Exception as e:
        print("Task Execution Error:", e)
        
    await listener_task
    await redis_client.aclose()

if __name__ == "__main__":
    asyncio.run(main())
