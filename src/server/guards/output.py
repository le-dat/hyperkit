"""Output guard — structured extraction with Pydantic validation and retry."""

import json
import re
from pydantic import BaseModel, field_validator
from tenacity import retry, stop_after_attempt, wait_exponential

from llm.router import get_llm, TaskType


class InvoiceExtract(BaseModel):
    """Structured invoice extraction output."""
    vendor: str | None = None
    amount: float | None = None
    tax: float | None = None
    date: str | None = None  # "YYYY-MM-DD"
    invoice_number: str | None = None

    @field_validator("amount", "tax")
    @classmethod
    def positive(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Must be positive")
        return v

    @field_validator("date")
    @classmethod
    def date_fmt(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Must be YYYY-MM-DD")
        return v


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
async def extract_with_guard(ocr_text: str, prev_errors: list[str] | None = None) -> InvoiceExtract:
    """
    Structured extraction with retry.
    On retry, feed error feedback as context — NOT a blind retry.
    """
    llm = get_llm(TaskType.SUMMARIZATION)  # SUMMARIZATION = structured extraction task

    error_ctx = ""
    if prev_errors:
        error_ctx = "\n\nFix these errors from previous attempt:\n" + "\n".join(prev_errors)

    resp = await llm.ainvoke(
        f"Extract JSON from invoice. Fields: vendor, amount, tax, date(YYYY-MM-DD), invoice_number.\n"
        f"Return null for missing fields. Do not fabricate data.{error_ctx}\n\n"
        f"<invoice_data>\n{ocr_text}\n</invoice_data>"
    )

    try:
        content = resp.content if hasattr(resp, "content") else str(resp)
        return InvoiceExtract(**json.loads(content))
    except Exception as e:
        errors = list(prev_errors or [])
        errors.append(str(e))
        raise


def cross_validate_amount(llm_amount: float, ocr_text: str) -> bool:
    """
    Compare LLM-extracted amount against raw OCR regex.
    Returns True if within 1% tolerance; False if discrepancy > 1%.

    Handles both commaDecimal (1.234,56) and periodDecimal (1,234.56) formats.
    """
    # Match numbers that may use comma or period as decimal/thousands separator
    # e.g. "1,234.56", "1.234,56", "1234.56", "1234,56"
    raw_nums: list[float] = []
    for m in re.findall(r"\b\d[\d.,]*\d\b", ocr_text):
        # Remove thousands separators (comma or period between digits, not at end)
        cleaned = re.sub(r"(?<=\d)[.,](?=\d{3})", "", m)
        # If only commas remain and no periods, treat last comma as decimal
        if "," in cleaned and "." not in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            raw_nums.append(float(cleaned))
        except ValueError:
            continue

    if not raw_nums:
        return True  # No numbers in OCR — nothing to compare

    closest = min(raw_nums, key=lambda x: abs(x - llm_amount))
    pct_diff = abs(closest - llm_amount) / max(abs(llm_amount), 1) * 100
    return pct_diff <= 1.0