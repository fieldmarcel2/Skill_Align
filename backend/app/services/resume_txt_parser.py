"""
Deterministic Rule-Based Resume Text Parser
============================================
Parses plain text resumes into structured candidate records using deterministic methods:
- Regular expressions & pattern matching
- Section boundary identification
- Skill cross-referencing against database taxonomy & technology dictionaries
- Date range calculations for total experience
- Degree & institution matching

NO NLP, NO LLMs, NO RAG, NO Embeddings.
Fast, explainable, and testable.
"""

import re
from datetime import datetime
from typing import List, Dict, Any, Optional, Set, Tuple


# ── Curated Tech Keywords for High-Recall Fallback ───────────────────────────
DEFAULT_TECH_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang", "Rust", "PHP", "Ruby", "Kotlin", "Swift", "Scala", "Dart", "R", "MATLAB",
    # Backend Frameworks
    "FastAPI", "Django", "Flask", "Node.js", "Express.js", "Express", "Spring Boot", "Spring", "ASP.NET", ".NET Core", "Ruby on Rails", "NestJS", "Koa",
    # Frontend Frameworks & Libraries
    "React", "React.js", "Next.js", "Vue", "Vue.js", "Nuxt.js", "Angular", "Svelte", "Redux", "Tailwind CSS", "Bootstrap", "HTML", "HTML5", "CSS", "CSS3", "Sass", "GraphQL", "REST API",
    # Databases & Storage
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "MariaDB", "Oracle", "Cassandra", "DynamoDB", "Elasticsearch", "SQL Server", "Firebase", "Supabase",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Microsoft Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "K8s", "Terraform", "Ansible", "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "Linux", "Bash", "Shell", "Nginx", "Apache", "Helm", "Prometheus", "Grafana",
    # Data & Machine Learning (rule-based keywords)
    "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "OpenCV", "SQL", "Data Analysis", "Tableau", "Power BI", "Kafka", "RabbitMQ", "Celery",
    # Testing & Architecture
    "Pytest", "Jest", "Mocha", "Cypress", "Selenium", "Microservices", "System Design", "Agile", "Scrum", "Git", "GitHub", "GitLab", "Jira"
]

# Common Degree Patterns
DEGREE_PATTERNS = [
    r"\b(Bachelor\s+of\s+Technology|B\.?\s*Tech|BTech)\b",
    r"\b(Bachelor\s+of\s+Engineering|B\.?\s*E|B\.?\s*Eng)\b",
    r"\b(Bachelor\s+of\s+Science|B\.?\s*S|B\.?\s*Sc|BSc)\b",
    r"\b(Bachelor\s+of\s+Computer\s+Applications|BCA)\b",
    r"\b(Bachelor\s+of\s+Business\s+Administration|BBA)\b",
    r"\b(Master\s+of\s+Technology|M\.?\s*Tech|MTech)\b",
    r"\b(Master\s+of\s+Science|M\.?\s*S|M\.?\s*Sc|MSc)\b",
    r"\b(Master\s+of\s+Computer\s+Applications|MCA)\b",
    r"\b(Master\s+of\s+Business\s+Administration|MBA)\b",
    r"\b(Ph\.?\s*D|Doctor\s+of\s+Philosophy)\b",
    r"\b(Diploma\s+in\s+[\w\s]+)\b",
]

# Recognized Certifications
CERTIFICATION_PATTERNS = [
    r"(AWS\s+Certified\s+[\w\s-]+)",
    r"(Azure\s+Certified\s+[\w\s-]+|Microsoft\s+Certified:\s*[\w\s-]+)",
    r"(Google\s+Cloud\s+Certified\s+[\w\s-]+|GCP\s+Certified\s+[\w\s-]+)",
    r"(Certified\s+Kubernetes\s+Administrator|CKA|CKAD)",
    r"(Docker\s+Certified\s+Associate)",
    r"(Certified\s+Information\s+Systems\s+Security\s+Professional|CISSP)",
    r"(Project\s+Management\s+Professional|PMP)",
    r"(Certified\s+Scrum\s+Master|CSM)",
    r"(Cisco\s+Certified\s+Network\s+Associate|CCNA)",
    r"(HashiCorp\s+Certified:\s*Terraform\s+Associate)",
]

# Common Job Title Keywords
JOB_TITLE_KEYWORDS = [
    "Software Engineer", "Senior Software Engineer", "Backend Developer", "Frontend Developer",
    "Full Stack Developer", "Full-Stack Engineer", "DevOps Engineer", "Cloud Engineer",
    "Cloud Architect", "Solutions Architect", "Data Engineer", "Data Scientist",
    "Data Analyst", "System Administrator", "Site Reliability Engineer", "SRE",
    "QA Engineer", "Test Engineer", "Product Manager", "Tech Lead", "Engineering Manager",
    "Software Development Engineer", "SDE", "Intern", "Associate Software Engineer"
]


def extract_email(text: str) -> Optional[str]:
    """Extract first valid email address from text."""
    pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    matches = re.findall(pattern, text)
    if matches:
        # Filter out obvious false positives like example.com or image files
        valid = [m for m in matches if not m.endswith((".png", ".jpg", ".pdf", ".gif"))]
        if valid:
            return valid[0].lower()
    return None


def extract_phone(text: str) -> Optional[str]:
    """Extract candidate phone number."""
    # Matches international and national formats: +91 9876543210, +1 (555) 0199, 9876543210
    pattern = r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}"
    matches = re.finditer(pattern, text)
    
    for m in matches:
        raw = m.group(0).strip()
        # Keep only digits and plus
        digits_only = re.sub(r"[^\d+]", "", raw)
        if 10 <= len(re.sub(r"\D", "", digits_only)) <= 15:
            return raw
    return None


def extract_name(text: str) -> Optional[str]:
    """
    Extract candidate full name from top lines of the resume.
    Avoids headings like 'Resume', 'Curriculum Vitae', contact lines, etc.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    invalid_keywords = {"resume", "curriculum", "vitae", "cv", "profile", "summary", "contact", "page"}

    for line in lines[:8]:
        # Skip if contains email, URL, or phone
        if "@" in line or "http" in line or "www." in line or re.search(r"\d{4,}", line):
            continue
        
        cleaned = re.sub(r"[^a-zA-Z\s]", "", line).strip()
        words = cleaned.split()

        # Candidates names are typically 2 to 4 alphabetic words
        if 2 <= len(words) <= 4:
            if not any(w.lower() in invalid_keywords for w in words):
                return " ".join(words).title()

    return None


def segment_sections(text: str) -> Dict[str, str]:
    """
    Segment resume text into standard thematic sections:
    - summary
    - skills
    - experience
    - education
    - certifications
    - projects
    """
    sections = {
        "header": "",
        "summary": "",
        "skills": "",
        "experience": "",
        "education": "",
        "certifications": "",
        "projects": "",
        "other": "",
    }

    section_regexes = {
        "skills": r"\b(TECHNICAL\s+SKILLS|SKILLS\s*&?\s*TECHNOLOGIES|SKILLS|CORE\s+COMPETENCIES|EXPERTISE|TECHNOLOGIES)\b",
        "experience": r"\b(WORK\s+EXPERIENCE|PROFESSIONAL\s+EXPERIENCE|EMPLOYMENT\s+HISTORY|EXPERIENCE|WORK\s+HISTORY)\b",
        "education": r"\b(EDUCATION|ACADEMIC\s+BACKGROUND|ACADEMIC\s+QUALIFICATIONS|DEGREES)\b",
        "certifications": r"\b(CERTIFICATIONS|CERTIFICATES|LICENSES|ACCREDITATIONS)\b",
        "projects": r"\b(KEY\s+PROJECTS|PROJECTS|ACADEMIC\s+PROJECTS|PERSONAL\s+PROJECTS)\b",
        "summary": r"\b(SUMMARY|PROFESSIONAL\s+SUMMARY|OBJECTIVE|CAREER\s+OBJECTIVE|ABOUT\s+ME)\b",
    }

    # Find section header matches and their start offsets
    matches: List[Tuple[int, str]] = []
    for sec_name, pattern in section_regexes.items():
        for m in re.finditer(pattern, text, flags=re.IGNORECASE):
            matches.append((m.start(), sec_name))

    # Sort matches by appearance in text
    matches.sort(key=lambda x: x[0])

    if not matches:
        # Fallback: treat whole text as mixed
        sections["other"] = text
        return sections

    # First segment before any section is header
    first_offset, first_sec = matches[0]
    sections["header"] = text[:first_offset].strip()

    # Slice between consecutive section markers
    for i in range(len(matches)):
        cur_offset, cur_sec = matches[i]
        next_offset = matches[i + 1][0] if (i + 1 < len(matches)) else len(text)
        chunk = text[cur_offset:next_offset].strip()
        
        # Append chunk to section (in case same section header matched multiple times)
        if sections[cur_sec]:
            sections[cur_sec] += "\n\n" + chunk
        else:
            sections[cur_sec] = chunk

    return sections


def extract_skills(text: str, master_skills: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Extract skills by scanning full text and skills section against master taxonomy + curated terms.
    Returns list of dicts: [{"name": "Python", "category": "Programming"}]
    """
    found_skills: Dict[str, Dict[str, Any]] = {}

    skill_catalog = list(DEFAULT_TECH_SKILLS)
    if master_skills:
        for s in master_skills:
            if s not in skill_catalog:
                skill_catalog.append(s)

    # Sort by length descending so multi-word terms match before single words (e.g. "Spring Boot" before "Spring")
    skill_catalog.sort(key=lambda s: len(s), reverse=True)

    text_lower = " " + text.lower() + " "

    for skill in skill_catalog:
        # Word boundary regex matching with safe escaping
        escaped = re.escape(skill.lower())
        # Handle special characters like C++, C#, .NET, Node.js
        if escaped.endswith(r"\+\+"):
            pattern = r"(?:\s|[^\w])" + escaped + r"(?:\s|[^\w])"
        elif escaped.endswith(r"\#"):
            pattern = r"(?:\s|[^\w])" + escaped + r"(?:\s|[^\w])"
        else:
            pattern = r"\b" + escaped + r"\b"

        if re.search(pattern, text_lower):
            normalized_name = skill.strip()
            found_skills[normalized_name.lower()] = {
                "name": normalized_name,
                "category": _categorize_skill(normalized_name),
            }

    return list(found_skills.values())


def _categorize_skill(skill_name: str) -> str:
    """Categorize standard skill into clean domain bucket."""
    s = skill_name.lower()
    if s in ["python", "javascript", "typescript", "java", "c++", "c#", "c", "go", "golang", "rust", "ruby", "kotlin", "swift", "php"]:
        return "Programming"
    elif s in ["fastapi", "django", "flask", "spring boot", "spring", "express.js", "express", "node.js", "asp.net", "nestjs", "rest api", "graphql"]:
        return "Backend"
    elif s in ["react", "react.js", "next.js", "vue", "vue.js", "angular", "html", "html5", "css", "css3", "tailwind css", "bootstrap", "redux"]:
        return "Frontend"
    elif s in ["postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle", "sql server", "dynamodb", "elasticsearch", "cassandra"]:
        return "Database"
    elif s in ["aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform", "ansible", "ci/cd", "linux", "jenkins", "git"]:
        return "DevOps & Cloud"
    elif s in ["pytest", "jest", "selenium", "cypress", "unit testing"]:
        return "Testing"
    return "Tools & Technologies"


def extract_experience(text: str, exp_section: str) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Extract total years of experience and identified job positions.
    """
    total_years = 0.0
    positions: List[Dict[str, Any]] = []

    target_text = exp_section if exp_section.strip() else text

    # 1. Search for explicit experience mentions (e.g. "3.5 years of experience", "5+ yrs")
    exp_mentions = re.findall(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:experience|exp)?", text, flags=re.IGNORECASE)
    if exp_mentions:
        try:
            parsed_vals = [float(v) for v in exp_mentions if 0.5 <= float(v) <= 40]
            if parsed_vals:
                total_years = max(parsed_vals)
        except ValueError:
            pass

    # 2. Date Range parser (e.g., "2020 - 2024", "Jan 2021 to Present", "06/2019 - 08/2022")
    date_range_pattern = r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(\b20\d{2}\b|\b19\d{2}\b)\s*(?:-|–|—|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*)?(\b20\d{2}\b|\b19\d{2}\b|Present|Current|Now)"
    
    current_year = datetime.now().year
    calculated_years = 0.0

    for m in re.finditer(date_range_pattern, target_text, flags=re.IGNORECASE):
        start_yr_str, end_yr_str = m.group(1), m.group(2)
        try:
            start_yr = int(start_yr_str)
            if end_yr_str.lower() in ["present", "current", "now"]:
                end_yr = current_year
            else:
                end_yr = int(end_yr_str)

            if 1980 <= start_yr <= end_yr <= current_year + 1:
                duration = max(0.5, float(end_yr - start_yr))
                calculated_years += duration
        except ValueError:
            continue

    if calculated_years > total_years:
        total_years = min(calculated_years, 35.0)

    # 3. Detect job titles
    for title in JOB_TITLE_KEYWORDS:
        if re.search(r"\b" + re.escape(title) + r"\b", target_text, flags=re.IGNORECASE):
            positions.append({
                "title": title,
                "duration": "Extracted from work history",
            })

    return round(total_years, 1), positions


def extract_education(text: str, edu_section: str) -> List[Dict[str, Any]]:
    """
    Extract degrees and academic institutions.
    """
    education_records = []
    target_text = edu_section if edu_section.strip() else text

    # Extract Degrees
    for pat in DEGREE_PATTERNS:
        match = re.search(pat, target_text, flags=re.IGNORECASE)
        if match:
            degree_name = match.group(0).strip()
            
            # Look for institution near the degree
            institution = "University / College"
            inst_match = re.search(r"(?:from|at)?\s*([A-Z][A-Za-z\s&,.-]+(?:University|Institute|College|Academy|School))", target_text)
            if inst_match:
                institution = inst_match.group(1).strip()

            # Look for graduation year
            year_match = re.search(r"\b(20\d{2}|19\d{2})\b", target_text)
            grad_year = year_match.group(0) if year_match else None

            education_records.append({
                "degree": degree_name,
                "institution": institution,
                "year": grad_year,
            })
            break  # Top degree found

    return education_records


def extract_certifications(text: str) -> List[str]:
    """Extract recognized certifications."""
    certs = []
    for pat in CERTIFICATION_PATTERNS:
        matches = re.finditer(pat, text, flags=re.IGNORECASE)
        for m in matches:
            c = m.group(0).strip()
            if c not in certs:
                certs.append(c)
    return certs


def extract_projects(text: str, projects_section: str) -> List[str]:
    """Extract top project names or bullet summaries."""
    projects = []
    target = projects_section if projects_section.strip() else text
    
    # Identify lines that look like project titles: "Project: ...", "• XYZ Platform:"
    lines = [line.strip() for line in target.splitlines() if line.strip()]
    for line in lines:
        if line.startswith(("•", "-", "*", "Project:", "Title:")) and len(line) > 10:
            cleaned = re.sub(r"^[•\-*\s]+(?:Project:\s*|Title:\s*)?", "", line).strip()
            if 5 < len(cleaned) < 100:
                projects.append(cleaned)
        if len(projects) >= 4:
            break

    return projects


def parse_resume_text(raw_text: str, master_skills: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Main rule-based parsing entrypoint.
    
    Args:
        raw_text: Extracted plain text of resume.
        master_skills: List of skills from the database taxonomy.

    Returns:
        Structured dictionary containing extracted candidate data.
    """
    if not raw_text or not raw_text.strip():
        return {
            "name": None,
            "email": None,
            "phone": None,
            "skills": [],
            "total_experience_years": 0.0,
            "education": [],
            "experience": [],
            "certifications": [],
            "projects": [],
        }

    # 1. Segment text into standard sections
    sections = segment_sections(raw_text)

    # 2. Extract contact information
    email = extract_email(raw_text)
    phone = extract_phone(raw_text)
    name = extract_name(raw_text)

    # 3. Extract skills
    skills_text = sections["skills"] + "\n" + raw_text
    skills_list = extract_skills(skills_text, master_skills=master_skills)

    # 4. Extract experience
    total_exp, experience_records = extract_experience(raw_text, sections["experience"])

    # 5. Extract education
    education_records = extract_education(raw_text, sections["education"])

    # 6. Extract certifications
    certs = extract_certifications(raw_text)

    # 7. Extract projects
    projects = extract_projects(raw_text, sections["projects"])

    # Top degree / institution for fast indexing
    top_degree = education_records[0]["degree"] if education_records else None
    top_institution = education_records[0]["institution"] if education_records else None

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": skills_list,
        "total_experience_years": total_exp,
        "education": education_records,
        "education_degree": top_degree,
        "education_institution": top_institution,
        "experience": experience_records,
        "certifications": certs,
        "projects": projects,
    }
