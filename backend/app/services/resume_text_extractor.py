"""
Deterministic Resume Text Extractor Service
===========================================
Extracts plain, readable text from uploaded documents without NLP, LLMs, or external APIs.

Supported Formats:
- PDF (.pdf)  → Extracted page-by-page using pdfplumber with paragraph layout preservation.
- DOCX (.docx)→ Extracted paragraph-by-paragraph and table cell-by-cell using python-docx.
- TXT (.txt)  → Decoded with multi-encoding fallback (UTF-8, Latin-1, CP1252, UTF-16).
- DOC (.doc)  → Stream extraction of readable text segments.

Rules:
- 100% deterministic, explainable, and local.
- Zero AI / LLM / RAG dependencies.
- Handles corrupted files, empty documents, and unsupported types gracefully with clear exceptions.
"""

#pdfplumber

import io
import os
import re
import logging
from typing import Tuple

logger = logging.getLogger("skillalign.extractor")


def clean_extracted_text(raw_text: str) -> str:
    """
    Cleans and standardizes extracted document text:
    - Normalizes unicode whitespace (non-breaking spaces, em-spaces)
    - Strips null bytes and non-printable control characters
    - Collapses excessive vertical whitespace (3+ newlines → 2 newlines)
    - Trims trailing spaces on each line
    """
    if not raw_text:
        return ""

    # Remove null bytes
    text = raw_text.replace("\x00", " ")

    # Normalize unicode spaces and hyphens
    text = re.sub(r"[\u00A0\u2000-\u200B\u202F\u205F\u3000]", " ", text)
    text = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2015]", "-", text)
    text = re.sub(r"[\u2018\u2019]", "'", text)
    text = re.sub(r"[\u201C\u201D]", '"', text)

    # Normalize line breaks
    lines = [line.strip() for line in text.splitlines()]
    
    # Remove empty lines clusters
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if line:
            # Fix glued punctuation where letters/digits follow without space (e.g. "AWS,Azure" -> "AWS, Azure")
            line = re.sub(r"([,;:\)])([A-Za-z0-9])", r"\1 \2", line)
            # Fix opening parenthesis (e.g. "AWS(EC2" -> "AWS (EC2")
            line = re.sub(r"([A-Za-z0-9])(\()", r"\1 \2", line)
            # Fix common glued words from PDF glyph concatenation
            line = re.sub(r"(experience)(with)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(worked)(with)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(managed)(AWS|Azure|GCP)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(and)(CI/CD|Docker|CloudWatch|Linux)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(Experienced)(in)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(for)(application|deployment)", r"\1 \2", line, flags=re.IGNORECASE)
            line = re.sub(r"(and)(infrastructure|monitoring)", r"\1 \2", line, flags=re.IGNORECASE)
            # Ensure tech names are correctly merged if split
            line = re.sub(r"\bPostgre\s+SQL\b", "PostgreSQL", line, flags=re.IGNORECASE)
            line = re.sub(r"\bMy\s+SQL\b", "MySQL", line, flags=re.IGNORECASE)
            line = re.sub(r"\bJava\s+Script\b", "JavaScript", line, flags=re.IGNORECASE)
            line = re.sub(r"\bType\s+Script\b", "TypeScript", line, flags=re.IGNORECASE)
            line = re.sub(r"\bDev\s+Ops\b", "DevOps", line, flags=re.IGNORECASE)
            line = re.sub(r"\bGit\s+Hub\b", "GitHub", line, flags=re.IGNORECASE)
            cleaned_lines.append(line.strip())
            prev_empty = False
        elif not prev_empty:
            cleaned_lines.append("")
            prev_empty = True

    return "\n".join(cleaned_lines).strip()


def extract_from_pdf(file_bytes: bytes) -> str:
    """Extract readable text from PDF bytes using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber is not installed.")

    bio = io.BytesIO(file_bytes)
    extracted_pages = []

    try:
        with pdfplumber.open(bio) as pdf:
            if not pdf.pages:
                raise ValueError("PDF document has 0 pages.")

            for page_idx, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text(layout=True) or page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(page_text.strip())
                else:
                    # Fallback to extracting words if layout extraction is blank
                    words = page.extract_words()
                    if words:
                        line_text = " ".join(w["text"] for w in words)
                        if line_text.strip():
                            extracted_pages.append(line_text.strip())

    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}, attempting stream extraction fallback")
        # Try PyPDF fallback if available
        try:
            import pypdf
            bio.seek(0)
            reader = pypdf.PdfReader(bio)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    extracted_pages.append(t)
        except Exception:
            pass

        if not extracted_pages:
            # Secondary fallback: extract printable ASCII/UTF-8 strings
            strings = re.findall(rb"[\x20-\x7E\t\n\r]{4,}", file_bytes)
            decoded = [s.decode("latin-1", errors="ignore").strip() for s in strings if s.strip()]
            fallback_text = "\n".join(decoded)
            if len(fallback_text.strip()) >= 15:
                return clean_extracted_text(fallback_text)
            raise ValueError(f"Corrupted or password-protected PDF file: {str(e)}") from e

    full_text = "\n\n".join(extracted_pages)
    return clean_extracted_text(full_text)


def extract_from_docx(file_bytes: bytes) -> str:
    """Extract readable text from DOCX bytes including paragraphs and table contents."""
    try:
        import docx
    except ImportError:
        raise RuntimeError("python-docx is not installed.")

    bio = io.BytesIO(file_bytes)
    try:
        doc = docx.Document(bio)
    except Exception as e:
        raise ValueError(f"Corrupted or invalid DOCX file: {str(e)}") from e

    lines = []

    # 1. Paragraphs
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            lines.append(t)

    # 2. Table cells (often used for skills, education, contact info in resumes)
    for table in doc.tables:
        for row in table.rows:
            row_texts = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_texts:
                # Deduplicate identical adjacent merged cells
                deduped = []
                for cell_t in row_texts:
                    if not deduped or cell_t != deduped[-1]:
                        deduped.append(cell_t)
                lines.append(" | ".join(deduped))

    full_text = "\n".join(lines)
    return clean_extracted_text(full_text)


def extract_from_txt(file_bytes: bytes) -> str:
    """Extract text from plain text file trying multiple encodings."""
    encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "utf-16"]
    
    for enc in encodings:
        try:
            text = file_bytes.decode(enc)
            return clean_extracted_text(text)
        except UnicodeDecodeError:
            continue

    # Fallback with replacement
    text = file_bytes.decode("utf-8", errors="replace")
    return clean_extracted_text(text)


def extract_from_doc(file_bytes: bytes) -> str:
    """
    Extract text from legacy binary DOC (.doc) by extracting printable ASCII/UTF-8 strings.
    """
    # Regex extract runs of printable characters
    strings = re.findall(rb"[\x20-\x7E\t\n\r]{4,}", file_bytes)
    decoded = [s.decode("latin-1", errors="ignore").strip() for s in strings if s.strip()]
    full_text = "\n".join(decoded)
    return clean_extracted_text(full_text)


def extract_text_from_file(
    file_bytes: bytes,
    filename: str,
    content_type: str | None = None,
) -> Tuple[str, str]:
    """
    Main extraction dispatcher.
    
    Args:
        file_bytes: Raw binary bytes of uploaded resume.
        filename: Original filename (e.g. "shiva_resume.pdf").
        content_type: MIME type from HTTP request header (optional).

    Returns:
        (extracted_text, file_type_format)
    
    Raises:
        ValueError: If file is unsupported, corrupted, or extracted text is empty.
    """
    if not file_bytes:
        raise ValueError("Uploaded file is empty (0 bytes).")

    ext = os.path.splitext(filename or "")[1].lower()

    # Determine file type
    if ext == ".pdf" or (content_type and "pdf" in content_type.lower()):
        text = extract_from_pdf(file_bytes)
        file_type = "PDF"
    elif ext == ".docx" or (content_type and "openxmlformats-officedocument.wordprocessingml" in content_type.lower()):
        text = extract_from_docx(file_bytes)
        file_type = "DOCX"
    elif ext == ".txt" or (content_type and "text/plain" in content_type.lower()):
        text = extract_from_txt(file_bytes)
        file_type = "TXT"
    elif ext == ".doc" or (content_type and "msword" in content_type.lower()):
        text = extract_from_doc(file_bytes)
        file_type = "DOC"
    else:
        raise ValueError(f"Unsupported resume file format '{ext}'. Allowed formats: PDF (.pdf), Word (.docx, .doc), Text (.txt).")

    if not text or len(text.strip()) < 15:
        raise ValueError("Could not extract readable text from document. Ensure the file contains text and is not an image-only scanned document.")

    return text, file_type
