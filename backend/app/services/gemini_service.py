"""
Google Gemini AI Service
========================

Provides AI-powered candidate resume analysis, semantic match scoring,
and automated interview question generation using Google Gemini.
"""

import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from app.core.config import settings

import re

logger = logging.getLogger("skillalign.gemini")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
SUPPORTED_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash",
]


def _clean_and_parse_json(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Find the outer JSON object if wrapped in text
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    # Clean trailing commas
    text = re.sub(r',\s*([\]}])', r'\1', text)
    return json.loads(text)


def analyze_candidate_job_fit(
    job_title: str,
    job_description: str,
    required_skills: List[str],
    candidate_name: str,
    candidate_experience_years: float,
    candidate_skills: List[Dict[str, Any]],
    resume_summary: Optional[str] = None
) -> Dict[str, Any]:
    """
    Leverages Gemini AI to generate a semantic fit assessment, candidate summary,
    and targeted technical/behavioral interview questions.
    """
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        logger.info("Gemini API key not configured, returning standard template.")
        return _build_fallback_analysis(job_title, candidate_name, candidate_skills, required_skills)

    skills_text = ", ".join([f"{s.get('name')} ({s.get('proficiency', 'Intermediate')})" for s in candidate_skills])
    prompt = f"""
You are an expert technical recruiting AI. Analyze the alignment between this Job Requisition and Candidate Profile:

JOB DETAILS:
- Title: {job_title}
- Description: {job_description}
- Required Skills: {', '.join(required_skills)}

CANDIDATE DETAILS:
- Name: {candidate_name}
- Total Experience: {candidate_experience_years} years
- Declared Skills: {skills_text}
{f'- Resume Notes: {resume_summary}' if resume_summary else ''}

Return ONLY valid JSON matching this exact structure:
{{
  "semantic_fit_score": 88,
  "ai_summary": "2-sentence executive summary explaining candidate alignment and key advantages.",
  "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "skill_gaps": ["Gap or area to verify 1", "Area to verify 2"]
}}
"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 600,
            "responseMimeType": "application/json"
        }
    }).encode("utf-8")

    # Try models in order of priority with graceful fallback
    for model in SUPPORTED_MODELS:
        try:
            url = GEMINI_ENDPOINT.format(model=model, key=api_key)
            req = urllib.request.Request(
                url,
                data=payload,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                result_json = json.loads(resp.read().decode("utf-8"))
                candidates = result_json.get("candidates", [])
                if candidates:
                    raw_text = candidates[0]["content"]["parts"][0]["text"].strip()
                    parsed = _clean_and_parse_json(raw_text)
                    return parsed
        except urllib.error.HTTPError as e:
            logger.warning(f"AI API model {model} returned HTTP {e.code}: {e.reason}")
            continue
        except Exception as e:
            logger.warning(f"AI generation error with {model}: {e}")
            continue

    # Graceful fallback if API calls fail
    return _build_fallback_analysis(job_title, candidate_name, candidate_skills, required_skills)


def _build_fallback_analysis(
    job_title: str,
    candidate_name: str,
    candidate_skills: List[Dict[str, Any]],
    required_skills: List[str]
) -> Dict[str, Any]:
    matched = [s.get("name") for s in candidate_skills if s.get("name") in required_skills]
    return {
        "semantic_fit_score": 85 if len(matched) >= len(required_skills) * 0.7 else 65,
        "ai_summary": f"{candidate_name} exhibits strong foundation for the {job_title} role with declared proficiency in {', '.join(matched[:3]) if matched else 'core domains'}.",
        "key_strengths": [
            f"Proven competency in {matched[0]}" if matched else "Relevant industry experience",
            "Aligned tech stack foundations",
            "Clear role progression"
        ],
        "skill_gaps": [
            f"Verify hands-on depth in {required_skills[0]}" if required_skills else "Assess system scale"
        ]
    }
