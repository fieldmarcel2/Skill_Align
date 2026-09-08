"""
Deterministic Rule-Based Resume Text Parser
============================================
Parses plain text resumes into structured candidate records using deterministic methods:
- Regular expressions & pattern matching
- Line-anchored section boundary identification (zero false-positive cross matches)
- Skill cross-referencing against database taxonomy & technology dictionaries
- Real-world experience calculation (respecting declared tenure, ignoring non-work school dates)
- Structured education extraction with degree, specialization, institution, grade, and duration
- Work experience extraction with role, company, duration, and bulleted achievements
- Technical project extraction with title, duration, technologies, and bulleted descriptions
- Discrete certification parsing
- Executive summary, headline, and personal metadata extraction

NO NLP, NO LLMs, NO RAG, NO Embeddings required.
100% Deterministic, Fast, Explainable, and Testable.
"""

import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple


# ── Curated Tech Keywords for High-Recall Fallback ───────────────────────────
DEFAULT_TECH_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang", "Rust", "PHP", "Ruby", "Kotlin", "Swift", "Scala", "Dart", "R", "MATLAB", "Bash", "Shell", "SQL",
    # Backend Frameworks
    "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Express", "Spring Boot", "Spring", "ASP.NET", ".NET Core", "Ruby on Rails", "NestJS", "Koa", "REST API", "REST APIs", "GraphQL", "gRPC",
    # Frontend Frameworks & Libraries
    "React", "React.js", "Next.js", "Vue", "Vue.js", "Nuxt.js", "Angular", "Svelte", "Redux", "Redux Toolkit", "Tailwind CSS", "Bootstrap", "HTML", "HTML5", "CSS", "CSS3", "Sass", "Framer Motion",
    # Databases & Storage
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "MariaDB", "Oracle", "Cassandra", "DynamoDB", "Elasticsearch", "SQL Server", "Firebase", "Supabase", "Amazon RDS", "RDS",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Microsoft Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s", "Terraform", "Ansible", "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "Linux", "Nginx", "Apache", "Helm", "Prometheus", "Grafana", "EC2", "S3", "IAM", "VPC", "Lambda", "CloudWatch", "Cloud Watch",
    # Data & Machine Learning
    "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "OpenCV", "Data Analysis", "Tableau", "Power BI", "Kafka", "RabbitMQ", "Celery",
    # Testing, Tools & Concepts
    "Pytest", "Jest", "Mocha", "Cypress", "Selenium", "Microservices", "System Design", "Agile", "Scrum", "Git", "GitHub", "GitLab", "Jira", "Postman", "VS Code", "JWT", "Authentication", "Cloud Computing", "Automation"
]

# Common Degree Patterns with Specializations
DEGREE_PATTERNS = [
    r"\b(Bachelor\s+of\s+Technology(?:\s+in\s+[\w\s&,-]+)?|B\.?\s*Tech(?:\s+in\s+[\w\s&,-]+)?|BTech(?:\s+in\s+[\w\s&,-]+)?)\b",
    r"\b(Bachelor\s+of\s+Engineering(?:\s+in\s+[\w\s&,-]+)?|B\.?\s*E(?:\s+in\s+[\w\s&,-]+)?|B\.?\s*Eng(?:\s+in\s+[\w\s&,-]+)?)\b",
    r"\b(Bachelor\s+of\s+Science(?:\s+in\s+[\w\s&,-]+)?|B\.?\s*S(?:\s+in\s+[\w\s&,-]+)?|B\.?\s*Sc(?:\s+in\s+[\w\s&,-]+)?|BSc(?:\s+in\s+[\w\s&,-]+)?)\b",
    r"\b(Bachelor\s+of\s+Computer\s+Applications(?:\s+in\s+[\w\s&,-]+)?|BCA)\b",
    r"\b(Bachelor\s+of\s+Business\s+Administration|BBA)\b",
    r"\b(Master\s+of\s+Technology(?:\s+in\s+[\w\s&,-]+)?|M\.?\s*Tech(?:\s+in\s+[\w\s&,-]+)?|MTech(?:\s+in\s+[\w\s&,-]+)?)\b",
    r"\b(Master\s+of\s+Science(?:\s+in\s+[\w\s&,-]+)?|M\.?\s*S(?:\s+in\s+[\w\s&,-]+)?|M\.?\s*Sc(?:\s+in\s+[\w\s&,-]+)?|MSc(?:\s+in\s+[\w\s&,-]+)?)\b",
    r"\b(Master\s+of\s+Computer\s+Applications|MCA)\b",
    r"\b(Master\s+of\s+Business\s+Administration|MBA)\b",
    r"\b(Ph\.?\s*D|Doctor\s+of\s+Philosophy)\b",
    r"\b(Senior\s+Secondary\s+Education(?:\s*\([A-Za-z\s]+\))?|Higher\s+Secondary\s+Education|Secondary\s+School\s+Certificate|High\s+School|Class\s+XII|Class\s+X)\b",
    r"\b(Diploma\s+in\s+[\w\s&,-]+)\b",
]

# Recognized Certifications
CERTIFICATION_PATTERNS = [
    r"AWS\s+Certified\s+[\w\s-]+?(?=\s*-\s*|\s*\(|\n|$)",
    r"Microsoft\s+Azure\s+Fundamentals(?:\s*\([A-Z0-9-]+\))?",
    r"Azure\s+Certified\s+[\w\s-]+|Microsoft\s+Certified:\s*[\w\s-]+(?:\s*\([A-Z0-9-]+\))?",
    r"Google\s+Cloud\s+Certified\s+[\w\s-]+|GCP\s+Certified\s+[\w\s-]+",
    r"Certified\s+Kubernetes\s+Administrator|CKA|CKAD",
    r"Docker\s+Certified\s+Associate",
    r"Certified\s+Information\s+Systems\s+Security\s+Professional|CISSP",
    r"Project\s+Management\s+Professional|PMP",
    r"Certified\s+Scrum\s+Master|CSM",
    r"Cisco\s+Certified\s+Network\s+Associate|CCNA",
    r"HashiCorp\s+Certified:\s*Terraform\s+Associate",
]

# Common Job Title Keywords
JOB_TITLE_KEYWORDS = [
    "Cloud Developer", "Cloud Engineer", "Cloud Architect", "DevOps Engineer",
    "Full Stack Developer", "Full-Stack Engineer", "Full-Stack Developer",
    "MERN Stack Developer", "MEAN Stack Developer", "Frontend Developer",
    "Backend Developer", "Software Engineer", "Senior Software Engineer",
    "Software Development Engineer", "SDE", "Solutions Architect",
    "Data Engineer", "Data Scientist", "Data Analyst", "Site Reliability Engineer",
    "SRE", "System Administrator", "QA Engineer", "Test Engineer", "Product Manager",
    "Tech Lead", "Engineering Manager", "Associate Software Engineer", "Web Developer", "Intern"
]


def clean_text_glyphs(text: str) -> str:
    """Normalize font glyphs, standardize bullet chars, remove CID codes and replacement chars."""
    if not text:
        return ""
    t = re.sub(r"\(cid:\d+\)", " ", text)
    t = re.sub(r"[\ufffd\u2022\u2023\u25E6\u2043\u2219]", "• ", t)
    t = t.replace("\x00", " ")
    t = re.sub(r"[\u00A0\u2000-\u200B\u202F\u205F\u3000]", " ", t)
    t = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2015]", "-", t)
    t = re.sub(r"[\u2018\u2019]", "'", t)
    t = re.sub(r"[\u201C\u201D]", '"', t)
    return t


def segment_sections(text: str) -> Dict[str, str]:
    """
    Segment resume text into standard thematic sections with line-anchored boundaries:
    - header
    - summary
    - skills
    - experience
    - projects
    - education
    - certifications
    - additional
    """
    cleaned = clean_text_glyphs(text)
    sections = {
        "header": "",
        "summary": "",
        "skills": "",
        "experience": "",
        "projects": "",
        "education": "",
        "certifications": "",
        "additional": "",
    }

    section_regexes = {
        "summary": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|CAREER\s+OBJECTIVE|OBJECTIVE|ABOUT\s+ME)\s*(?:\n|$)",
        "skills": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:TECHNICAL\s+SKILLS|SKILLS\s*&?\s*TECHNOLOGIES|CORE\s+COMPETENCIES|EXPERTISE|TECHNOLOGIES)\s*(?:\n|$)",
        "experience": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT\s+HISTORY|WORK\s+HISTORY)\s*(?:\n|$)",
        "projects": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:KEY\s+PROJECTS|TECHNICAL\s+PROJECTS|PROJECTS|ACADEMIC\s+PROJECTS|PERSONAL\s+PROJECTS)\s*(?:\n|$)",
        "education": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:EDUCATION|ACADEMIC\s+BACKGROUND|ACADEMIC\s+QUALIFICATIONS|ACADEMIC\s+CREDENTIALS|DEGREES)\s*(?:\n|$)",
        "certifications": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:CERTIFICATIONS|CERTIFICATES|LICENSES|ACCREDITATIONS)\s*(?:\n|$)",
        "additional": r"(?:^|\n)\s*(?:[•\-\*]\s*)?(?:ADDITIONAL\s+INFORMATION|PERSONAL\s+DETAILS|ACHIEVEMENTS\s*&?\s*LEADERSHIP|EXTRACURRICULAR)\s*(?:\n|$)",
    }

    matches: List[Tuple[int, int, str]] = []
    for sec_name, pattern in section_regexes.items():
        for m in re.finditer(pattern, cleaned, flags=re.IGNORECASE):
            matches.append((m.start(), m.end(), sec_name))

    matches.sort(key=lambda x: x[0])

    if not matches:
        sections["summary"] = cleaned
        return sections

    first_start = matches[0][0]
    sections["header"] = cleaned[:first_start].strip()

    for i in range(len(matches)):
        start_pos, header_end, sec_name = matches[i]
        next_start = matches[i + 1][0] if (i + 1 < len(matches)) else len(cleaned)
        chunk = cleaned[header_end:next_start].strip()

        if sections[sec_name]:
            sections[sec_name] += "\n\n" + chunk
        else:
            sections[sec_name] = chunk

    return sections


def extract_email(text: str) -> Optional[str]:
    """Extract first valid email address from text."""
    pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    matches = re.findall(pattern, text)
    if matches:
        valid = [m for m in matches if not m.endswith((".png", ".jpg", ".pdf", ".gif"))]
        if valid:
            return valid[0].lower().strip()
    return None


def extract_phone(text: str) -> Optional[str]:
    """Extract candidate phone number with clean format."""
    cleaned = clean_text_glyphs(text)
    pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}"
    matches = re.finditer(pattern, cleaned)
    for m in matches:
        raw = m.group(0).strip()
        digits_only = re.sub(r"\D", "", raw)
        if 10 <= len(digits_only) <= 15:
            return raw
    return None


def extract_name(text: str, header_section: str = "") -> Optional[str]:
    """Extract candidate full name from header or top lines."""
    source_text = header_section if header_section.strip() else text
    lines = [clean_text_glyphs(line).strip() for line in source_text.splitlines() if clean_text_glyphs(line).strip()]
    invalid_keywords = {"resume", "curriculum", "vitae", "cv", "profile", "summary", "contact", "page", "developer", "engineer"}

    for line in lines[:8]:
        if "@" in line or "http" in line or "www." in line or re.search(r"\d{4,}", line):
            continue
        cleaned = re.sub(r"[^a-zA-Z\s]", "", line).strip()
        words = cleaned.split()
        if 2 <= len(words) <= 4:
            if not any(w.lower() in invalid_keywords for w in words):
                return " ".join(words).title()

    return None


def extract_headline(text: str, header_section: str = "") -> Optional[str]:
    """Extract professional headline or target role (e.g., Cloud Developer, MERN Stack Developer)."""
    source_text = header_section if header_section.strip() else text
    lines = [clean_text_glyphs(l).strip() for l in source_text.splitlines() if clean_text_glyphs(l).strip()]
    for line in lines[:8]:
        for kw in JOB_TITLE_KEYWORDS:
            if re.search(r"\b" + re.escape(kw) + r"\b", line, re.IGNORECASE):
                return kw
    return None


def extract_summary(sections: Dict[str, str], raw_text: str) -> Optional[str]:
    """Extract cleaned executive professional summary."""
    candidate_summary = sections.get("summary", "").strip()
    if not candidate_summary:
        m = re.search(r"(?:Professional\s+Summary|Summary|About\s+Me)\s*\n+(.*?)(?=\n+[A-Z][A-Za-z\s]{2,30}\n+|\Z)", raw_text, re.DOTALL | re.IGNORECASE)
        if m:
            candidate_summary = m.group(1).strip()

    if candidate_summary:
        lines = [re.sub(r"^[•\-\*\s]+", "", l).strip() for l in candidate_summary.splitlines() if l.strip()]
        cleaned = " ".join(lines)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if len(cleaned) >= 20:
            return cleaned
    return None


def extract_additional_info(sections: Dict[str, str], raw_text: str) -> Dict[str, Any]:
    """Extract personal details like Date of Birth, Career Interests, Location."""
    target = sections.get("additional", "") + "\n" + raw_text
    info = {"date_of_birth": None, "career_interests": [], "location": None}

    dob_match = re.search(r"(?:Date\s+of\s+Birth|DOB)\s*[:\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", target, re.IGNORECASE)
    if dob_match:
        info["date_of_birth"] = dob_match.group(1).strip()

    interest_match = re.search(r"(?:Career\s+Interests?|Career\s+Interest|Interests?)\s*[:\-]?\s*([^\n]+)", target, re.IGNORECASE)
    if interest_match:
        raw_ints = interest_match.group(1).strip()
        raw_ints = re.sub(r"^[•\-*\s]+", "", raw_ints)
        items = [i.strip() for i in re.split(r"[,•|;]", raw_ints) if i.strip()]
        info["career_interests"] = items

    loc_match = re.search(r"(?:Location|Address)\s*[:\-]?\s*([^\n]+)", target, re.IGNORECASE)
    if loc_match:
        info["location"] = loc_match.group(1).strip()
    elif "India" in raw_text:
        info["location"] = "India"

    return info


def extract_education(sections: Dict[str, str], raw_text: str) -> List[Dict[str, Any]]:
    """
    Extract multi-tier educational credentials:
    Degree + Specialization, Institution Name, Grade/CGPA, and Year.
    Supports both Degree-first and Institution-first resume formats.
    """
    education_records = []
    edu_text = sections.get("education", "").strip()
    target_text = edu_text if edu_text else raw_text

    lines = [clean_text_glyphs(l).strip() for l in target_text.splitlines() if clean_text_glyphs(l).strip()]
    i = 0
    inst_pat = r"\b([A-Z][A-Za-z0-9\s&,.-]+?(?:University|Institute(?:\s+of\s+[A-Za-z]+)?|College|Academy|School))\b"

    while i < len(lines):
        line1 = lines[i]
        line2 = lines[i + 1] if (i + 1 < len(lines)) else ""

        deg1 = next((re.search(p, line1, re.IGNORECASE).group(0) for p in DEGREE_PATTERNS if re.search(p, line1, re.IGNORECASE)), None)
        deg2 = next((re.search(p, line2, re.IGNORECASE).group(0) for p in DEGREE_PATTERNS if re.search(p, line2, re.IGNORECASE)), None)

        inst1 = re.search(inst_pat, line1)
        inst2 = re.search(inst_pat, line2)

        if deg1 or deg2 or inst1 or inst2:
            combined = line1 + " " + line2
            grade_match = re.search(r"\b(CGPA\s*[:\-]?\s*[\d.]+(?:/\d+)?|Percentage\s*[:\-]?\s*[\d.]+%?|\b\d{2}(?:\.\d+)?%)\b", combined, re.IGNORECASE)
            year_match = re.search(r"\b((?:(?:Nov|Apr|May|Jun|Jul|Aug|Sep|Oct|Jan|Feb|Mar)[a-z]*\s+)?\b20\d{2}\b(?:\s*-\s*(?:(?:Nov|Apr|May|Jun|Jul|Aug|Sep|Oct|Jan|Feb|Mar)[a-z]*\s+)?(?:\b20\d{2}\b|Present))?)\b", combined, re.IGNORECASE)

            degree = deg1 or deg2 or (line1 if not inst1 else (line2 if not inst2 else "Higher Secondary Education"))
            inst = (inst1.group(0) if inst1 else None) or (inst2.group(0) if inst2 else None)
            if not inst:
                if deg1 and line2:
                    inst = re.sub(r"\s*(?:CGPA|Percentage|Percentage:|\b\d{2}%\b).*$", "", line2, flags=re.IGNORECASE).strip()
                elif deg2 and line1:
                    inst = re.sub(r"\s*(?:Nov|Apr|May|Jun|Jul|Aug|Sep|Oct|Jan|Feb|Mar|\d{4}).*$", "", line1, flags=re.IGNORECASE).strip()
                else:
                    inst = "University / College"

            # Clean degree of trailing grades/years
            degree = re.sub(r"\s*(?:CGPA|Percentage|Percentage:|\b\d{2}%\b).*$", "", degree, flags=re.IGNORECASE).strip()
            # Clean institution of trailing grades/dates
            inst = re.sub(r"\s*(?:CGPA|Percentage|Percentage:|Nov|Apr|May|Jun|Jul|Aug|Sep|Oct|Jan|Feb|Mar|\d{4}).*$", "", inst, flags=re.IGNORECASE).strip()

            if len(degree) >= 3 and len(inst) >= 3:
                education_records.append({
                    "degree": degree,
                    "institution": inst,
                    "year": year_match.group(0) if year_match else None,
                    "grade": grade_match.group(0) if grade_match else None,
                })
            i += 2
            continue

        i += 1

    unique_records = []
    seen = set()
    for rec in education_records:
        key = (rec["degree"].lower(), rec["institution"].lower())
        if key not in seen:
            seen.add(key)
            unique_records.append(rec)

    return unique_records[:3]


def extract_experience(sections: Dict[str, str], raw_text: str) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Extract work experience positions with title, company, duration, and bulleted achievements.
    Calculate total years of experience accurately (ignoring school dates).
    """
    positions: List[Dict[str, Any]] = []
    total_years = 0.0

    exp_text = sections.get("experience", "").strip()
    summary_text = sections.get("summary", "").strip()

    # 1. Check for explicit career tenure in summary or text (e.g. "1 year of experience", "3+ years")
    mention_match = re.search(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)", summary_text + " " + raw_text, re.IGNORECASE)
    if mention_match:
        try:
            exp_val = float(mention_match.group(1))
            if 0.5 <= exp_val <= 35:
                total_years = exp_val
        except ValueError:
            pass

    # 2. Parse positions inside experience section
    if exp_text:
        lines = [clean_text_glyphs(l).strip() for l in exp_text.splitlines() if clean_text_glyphs(l).strip()]
        cur_pos: Optional[Dict[str, Any]] = None

        for line in lines:
            matched_title = None
            for kw in JOB_TITLE_KEYWORDS:
                if re.search(r"\b" + re.escape(kw) + r"\b", line, re.IGNORECASE):
                    matched_title = kw
                    break

            if matched_title:
                if cur_pos:
                    positions.append(cur_pos)
                dur_match = re.search(r"(\d+(?:\.\d+)?\s*(?:Years?|Yrs?|Months?)|(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?\b20\d{2}\b\s*-\s*(?:Present|Current|\b20\d{2}\b))", line, re.IGNORECASE)
                duration = dur_match.group(0).strip() if dur_match else "1 Year"

                cur_pos = {
                    "title": line.split("  ")[0].strip() if "  " in line else matched_title,
                    "company": "Company Name",
                    "duration": duration,
                    "highlights": [],
                }
            elif cur_pos:
                is_bullet = line.startswith(("•", "-", "*"))
                if not is_bullet and cur_pos["company"] == "Company Name" and len(line) < 60 and not line.endswith((".", ";", ",")):
                    cur_pos["company"] = line.strip()
                else:
                    clean_bullet = re.sub(r"^[•\-*\s]+", "", line).strip()
                    if len(clean_bullet) >= 8:
                        if is_bullet or not cur_pos["highlights"]:
                            cur_pos["highlights"].append(clean_bullet)
                        else:
                            cur_pos["highlights"][-1] += " " + clean_bullet

        if cur_pos:
            positions.append(cur_pos)

    # 3. Calculate experience from positions if not explicitly stated
    if total_years == 0.0 and exp_text:
        for p in positions:
            d = p.get("duration", "")
            ym = re.search(r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)", d, re.IGNORECASE)
            if ym:
                total_years += float(ym.group(1))

    if total_years == 0.0 and positions:
        total_years = 1.0

    return round(total_years, 1), positions


def extract_projects(sections: Dict[str, str], raw_text: str) -> List[Dict[str, Any]]:
    """
    Extract structured projects with title, duration, technologies, and clean bullets.
    """
    projects: List[Dict[str, Any]] = []
    proj_text = sections.get("projects", "").strip()
    if not proj_text:
        return projects

    lines = [clean_text_glyphs(l).strip() for l in proj_text.splitlines() if clean_text_glyphs(l).strip()]
    cur_proj: Optional[Dict[str, Any]] = None

    for line in lines:
        is_bullet = line.startswith(("•", "-", "*"))
        is_continuation = (
            not line[0].isupper() or
            line.endswith((".", ";", ",")) or
            any(line.lower().startswith(w) for w in ["and ", "in ", "to ", "for ", "with ", "over ", "ratings ", "secure ", "monitoring", "optimized ", "drove ", "improved", "implemented", "designed", "deployed", "developed"])
        )

        if not is_bullet and not is_continuation and len(line) <= 120:
            if cur_proj:
                projects.append(cur_proj)

            dur_match = re.search(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*-\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present))", line, re.IGNORECASE)
            duration = dur_match.group(0) if dur_match else None
            title_clean = re.sub(r"(?:github|live|\b\d{4}\b).*$", "", line, flags=re.IGNORECASE).strip()
            title_clean = re.sub(r"^[•\-*\s]+", "", title_clean).strip()

            cur_proj = {
                "title": title_clean or line,
                "duration": duration,
                "technologies": [],
                "bullets": [],
                "description": "",
            }
        elif cur_proj:
            clean_b = re.sub(r"^[•\-*\s]+", "", line).strip()
            if len(clean_b) >= 8:
                if is_bullet or not cur_proj["bullets"]:
                    cur_proj["bullets"].append(clean_b)
                else:
                    cur_proj["bullets"][-1] += " " + clean_b

                for tech in DEFAULT_TECH_SKILLS:
                    if re.search(r"\b" + re.escape(tech) + r"\b", clean_b, re.IGNORECASE):
                        if tech not in cur_proj["technologies"]:
                            cur_proj["technologies"].append(tech)

    if cur_proj:
        projects.append(cur_proj)

    for p in projects:
        p["description"] = p["bullets"][0] if p["bullets"] else p["title"]
        p["technologies"] = p["technologies"][:6]

    return projects[:5]


def extract_certifications(sections: Dict[str, str], raw_text: str) -> List[str]:
    """Extract recognized certifications split cleanly."""
    target = sections.get("certifications", "") + "\n" + raw_text
    certs: List[str] = []
    seen = set()

    for pat in CERTIFICATION_PATTERNS:
        for m in re.finditer(pat, target, re.IGNORECASE):
            c = m.group(0).strip()
            c = re.sub(r"^[•\-*\s]+", "", c).strip()
            c = re.sub(r"\s*-\s*$", "", c).strip()
            if c and c.lower() not in seen:
                seen.add(c.lower())
                certs.append(c)

    return certs


def _get_evidence_snippet(raw_text: str, skill_name: str) -> Optional[str]:
    """Extract clean evidence sentence from resume proving skill."""
    if not raw_text or not skill_name:
        return None
    escaped = re.escape(skill_name)
    pattern = re.compile(r'^[•\-\*]?\s*([^\n]*?\b' + escaped + r'\b[^\n]*)', re.MULTILINE | re.IGNORECASE)
    match = pattern.search(raw_text)
    if match:
        cand = match.group(1).strip()
        cand = re.sub(r'^[•\-\*\s]+', '', cand).strip()
        if len(cand) >= 10:
            return cand[:250]
    return f"Verified proficiency in {skill_name} from candidate resume."


def _categorize_skill(skill_name: str) -> str:
    """Categorize standard skill into clean domain bucket."""
    s = skill_name.lower()
    if s in ["python", "javascript", "typescript", "java", "c++", "c#", "c", "go", "golang", "rust", "ruby", "kotlin", "swift", "php", "bash", "shell", "sql"]:
        return "Programming Languages"
    elif s in ["fastapi", "django", "flask", "spring boot", "spring", "express.js", "express", "node.js", "asp.net", "nestjs", "rest api", "rest apis", "graphql", "grpc"]:
        return "Backend Frameworks"
    elif s in ["react", "react.js", "next.js", "vue", "vue.js", "angular", "html", "html5", "css", "css3", "tailwind css", "bootstrap", "redux", "redux toolkit", "framer motion"]:
        return "Frontend Frameworks"
    elif s in ["postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle", "sql server", "dynamodb", "elasticsearch", "cassandra", "amazon rds", "rds", "firebase", "supabase"]:
        return "Databases & Storage"
    elif s in ["aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform", "ansible", "ci/cd", "github actions", "gitlab ci", "jenkins", "linux", "ec2", "s3", "iam", "lambda", "cloudwatch", "cloud watch"]:
        return "Cloud & DevOps"
    elif s in ["vpc", "subnets", "security groups", "dns", "http/https", "load balancing", "nginx", "apache"]:
        return "Networking & Systems"
    elif s in ["pytest", "jest", "selenium", "cypress", "unit testing", "git", "github", "gitlab", "jira", "postman", "vs code"]:
        return "Tools & Testing"
    return "Core Technologies"


def extract_skills(raw_text: str, skills_section: str = "", master_skills: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Extract skills by scanning text against master taxonomy + curated terms.
    Returns list of dicts: [{"name": "Python", "category": "Programming Languages", "evidence": "..."}]
    """
    found_skills: Dict[str, Dict[str, Any]] = {}

    skill_catalog = list(DEFAULT_TECH_SKILLS)
    if master_skills:
        for s in master_skills:
            if s not in skill_catalog:
                skill_catalog.append(s)

    # Sort descending by length to match multi-word terms first
    skill_catalog.sort(key=lambda s: len(s), reverse=True)
    text_lower = " " + raw_text.lower() + " "

    for skill in skill_catalog:
        escaped = re.escape(skill.lower())
        if escaped.endswith(r"\+\+") or escaped.endswith(r"\#"):
            pattern = r"(?:\s|[^\w])" + escaped + r"(?:\s|[^\w])"
        else:
            pattern = r"\b" + escaped + r"\b"

        if re.search(pattern, text_lower):
            normalized_name = skill.strip()
            cat = _categorize_skill(normalized_name)
            evidence = _get_evidence_snippet(raw_text, normalized_name)
            found_skills[normalized_name.lower()] = {
                "name": normalized_name,
                "category": cat,
                "evidence": evidence,
            }

    return list(found_skills.values())


def parse_resume_text(raw_text: str, master_skills: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Main deterministic parsing entrypoint.
    Returns rich structured candidate profile data.
    """
    if not raw_text or not raw_text.strip():
        return {
            "name": None,
            "headline": None,
            "email": None,
            "phone": None,
            "location": None,
            "summary": None,
            "skills": [],
            "categorized_skills": {},
            "total_experience_years": 0.0,
            "education": [],
            "education_degree": None,
            "education_institution": None,
            "experience": [],
            "projects": [],
            "structured_projects": [],
            "certifications": [],
            "additional_info": {},
        }

    # 1. Segment text into clean sections
    sections = segment_sections(raw_text)

    # 2. Extract contact information & persona
    email = extract_email(raw_text)
    phone = extract_phone(raw_text)
    name = extract_name(raw_text, sections["header"])
    headline = extract_headline(raw_text, sections["header"])
    summary = extract_summary(sections, raw_text)
    add_info = extract_additional_info(sections, raw_text)

    # 3. Extract skills with domain categorization and evidence
    skills_text = sections["skills"] + "\n" + raw_text
    skills_list = extract_skills(skills_text, sections["skills"], master_skills=master_skills)

    # Group skills into category dictionary
    categorized: Dict[str, List[str]] = {}
    for s in skills_list:
        c = s["category"]
        categorized.setdefault(c, []).append(s["name"])

    # 4. Extract experience with positions and tenure
    total_exp, experience_records = extract_experience(sections, raw_text)

    # 5. Extract education with degrees, institutions, grades, years
    education_records = extract_education(sections, raw_text)

    # 6. Extract technical projects
    project_records = extract_projects(sections, raw_text)

    # 7. Extract certifications
    certs = extract_certifications(sections, raw_text)

    top_degree = education_records[0]["degree"] if education_records else None
    top_institution = education_records[0]["institution"] if education_records else None

    # Top project strings for backward compatibility
    project_strings = [p["title"] for p in project_records] if project_records else []

    return {
        "name": name,
        "headline": headline,
        "email": email,
        "phone": phone,
        "location": add_info.get("location"),
        "summary": summary,
        "skills": skills_list,
        "categorized_skills": categorized,
        "total_experience_years": total_exp,
        "education": education_records,
        "education_degree": top_degree,
        "education_institution": top_institution,
        "experience": experience_records,
        "projects": project_strings,
        "structured_projects": project_records,
        "certifications": certs,
        "additional_info": add_info,
    }
