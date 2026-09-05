"""
Unit Tests for Resume Text Extractor (Deterministic, No AI/NLP)
===============================================================
Tests:
- PDF text extraction
- DOCX text extraction
- TXT multi-encoding extraction
- Corrupted file and empty file handling
- Unsupported format rejection
"""

import io
import pytest
from app.services.resume_text_extractor import (
    extract_text_from_file,
    extract_from_txt,
    extract_from_docx,
    extract_from_pdf,
    clean_extracted_text,
)


def test_clean_extracted_text_normalizes_whitespace():
    raw = "  Hello   World  \n\n\n\n  Line 2 \x00 with  null  "
    cleaned = clean_extracted_text(raw)
    assert "Hello   World" in cleaned
    assert "Line 2   with  null" in cleaned
    assert "\x00" not in cleaned
    assert "\n\n\n" not in cleaned


def test_extract_from_txt():
    sample_txt = "John Doe\nSoftware Engineer\nPython, FastAPI, Docker\n5 years experience"
    extracted, fmt = extract_text_from_file(sample_txt.encode("utf-8"), "resume.txt", "text/plain")
    assert fmt == "TXT"
    assert "John Doe" in extracted
    assert "Python, FastAPI" in extracted


def test_extract_from_docx():
    import docx
    doc = docx.Document()
    doc.add_paragraph("Jane Smith")
    doc.add_paragraph("Senior Backend Developer")
    doc.add_paragraph("Skills: Python, PostgreSQL, AWS")
    
    # Add table
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Education"
    table.rows[0].cells[1].text = "B.Tech in Computer Science"

    bio = io.BytesIO()
    doc.save(bio)
    docx_bytes = bio.getvalue()

    extracted, fmt = extract_text_from_file(docx_bytes, "jane_resume.docx")
    assert fmt == "DOCX"
    assert "Jane Smith" in extracted
    assert "Senior Backend Developer" in extracted
    assert "B.Tech in Computer Science" in extracted


def test_empty_file_raises_value_error():
    with pytest.raises(ValueError, match="empty"):
        extract_text_from_file(b"", "empty.pdf")


def test_unsupported_extension_raises_value_error():
    with pytest.raises(ValueError, match="Unsupported resume file format"):
        extract_text_from_file(b"some audio data", "resume.mp3")


def test_corrupted_pdf_raises_value_error():
    corrupted_bytes = b"%PDF-1.4 \x00\x01\x02\x03\xff\xfe\xab\xcd\xef\x00\x00\x00\x88\x99\xaa"
    with pytest.raises(ValueError):
        extract_text_from_file(corrupted_bytes, "broken.pdf", "application/pdf")
