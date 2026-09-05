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

logger = logging.getLogger("skillalign.gemini")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
SUPPORTED_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]


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
  "skill_gaps": ["Gap or area to verify 1", "Area to verify 2"],
  "suggested_interview_questions": [
    "Targeted Technical Question 1",
    "Targeted Architectural or Practical Question 2",
    "Targeted Behavioral or Problem Solving Question 3"
  ]
}}
"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800,
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
            with urllib.request.urlopen(req, timeout=10) as resp:
                result_json = json.loads(resp.read().decode("utf-8"))
                candidates = result_json.get("candidates", [])
                if candidates:
                    raw_text = candidates[0]["content"]["parts"][0]["text"].strip()
                    # Clean markdown formatting if present
                    if raw_text.startswith("```json"):
                        raw_text = raw_text[7:]
                    if raw_text.startswith("```"):
                        raw_text = raw_text[3:]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3]
                    parsed = json.loads(raw_text.strip())
                    return parsed
        except urllib.error.HTTPError as e:
            logger.warning(f"Gemini API model {model} returned HTTP {e.code}: {e.reason}")
            continue
        except Exception as e:
            logger.warning(f"Gemini generation error with {model}: {e}")
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
        ],
        "suggested_interview_questions": [
            f"How have you architected and scaled production applications using {matched[0] if matched else 'your core tech stack'}?",
            "Can you describe a challenging bug or performance bottleneck you resolved recently?",
            "How do you approach team collaboration and code reviews in an agile engineering cycle?"
        ]
    }
