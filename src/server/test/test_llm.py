import asyncio
import sys
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import settings
from llm.router import get_llm, TaskType

async def main():
    print("Testing LLM Provider:", settings.llm_provider)
    print("Model:", settings.anthropic_model)
    try:
        llm = get_llm(TaskType.REASONING)
        print("Invoking model...")
        response = await llm.ainvoke("Hello! Respond with exactly: 'LLM is working!'")
        print("Response received:")
        print("Content:", response.content)
        print("Additional Info:", getattr(response, "response_metadata", {}))
    except Exception as e:
        print("ERROR:", e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
