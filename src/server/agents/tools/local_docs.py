"""Local documentation search tool — implements lightweight keyword overlap RAG search."""

import os
import re
import json
from pathlib import Path
from langchain_core.tools import tool

# Local cache for document chunks to keep search incredibly fast (<5ms)
_DOCS_CHUNKS_CACHE: list[dict] = []
_DOCS_ROOT = Path(__file__).resolve().parents[2] / "docs"

def _ensure_indexed():
    """Recursively scan and chunk docs/ directory if not already cached."""
    global _DOCS_CHUNKS_CACHE
    if _DOCS_CHUNKS_CACHE:
        return

    if not _DOCS_ROOT.exists():
        return

    for path in _DOCS_ROOT.glob("**/*.md"):
        try:
            rel_path = path.relative_to(_DOCS_ROOT.parent)
            content = path.read_text(encoding="utf-8")
            
            # Split document by markdown headings (e.g., #, ##, ###)
            # This preserves section context for the RAG search
            sections = re.split(r'\n(?=#+\s+)', content)
            
            for section in sections:
                if not section.strip():
                    continue
                
                # Extract the first line as heading/title
                lines = section.strip().split("\n")
                heading = lines[0].lstrip("#").strip() if lines[0].startswith("#") else ""
                body = "\n".join(lines[1:]) if heading else section
                
                _DOCS_CHUNKS_CACHE.append({
                    "title": heading or rel_path.name,
                    "source": str(rel_path),
                    "heading": heading,
                    "content": body.strip(),
                })
        except Exception:
            # Silently pass if some markdown files fail to read
            pass


@tool
def search_local_docs(query: str) -> str:
    """Searches local developer documentation files under the docs/ folder for reference guides, API specs, and project architecture details.

    Use this tool when you need information about how the chat server, SSE stream, database, or agent architecture in this codebase are designed.

    Args:
        query: Search keywords or question.
    """
    _ensure_indexed()

    if not _DOCS_CHUNKS_CACHE:
        return json.dumps({"message": "No local documentation indexed or docs/ folder not found."})

    # Clean query into words
    clean_query = re.sub(r'[^\w\s]', '', query.lower())
    query_words = [w for w in clean_query.split() if len(w) > 2] # Skip short noise words

    if not query_words:
        # Fallback to general split if all words are short
        query_words = clean_query.split()

    scored_chunks = []
    for chunk in _DOCS_CHUNKS_CACHE:
        score = 0.0
        content_lower = chunk["content"].lower()
        heading_lower = chunk["heading"].lower() if chunk["heading"] else ""
        source_lower = chunk["source"].lower()

        for word in query_words:
            # Heading match is highly relevant (weight: 3.0)
            if word in heading_lower:
                score += 3.0
            # Source path match is relevant (weight: 2.0)
            if word in source_lower:
                score += 2.0
            # Content match (weight: 1.0)
            if word in content_lower:
                score += 1.0

        if score > 0:
            scored_chunks.append((score, chunk))

    # Sort descending by relevance score
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    # Format top 4 results
    results = []
    for _, chunk in scored_chunks[:4]:
        # Limit snippet size to keep payload compact and avoid SSE truncation issues
        snippet = chunk["content"][:150].strip().replace("\n", " ") + "..." if len(chunk["content"]) > 150 else chunk["content"]
        results.append({
            "title": chunk["title"] or chunk["source"],
            "source": chunk["source"],
            "url": f"file:///{_DOCS_ROOT.parent / chunk['source']}",
            "snippet": snippet
        })

    return json.dumps(results, ensure_ascii=False)
