import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.skill import Skill

COMPREHENSIVE_SKILLS = [
    # Frontend Technologies
    {"name": "HTML5", "category": "Frontend"},
    {"name": "CSS3", "category": "Frontend"},
    {"name": "HTML", "category": "Frontend"},
    {"name": "CSS", "category": "Frontend"},
    {"name": "React.js", "category": "Frontend"},
    {"name": "React", "category": "Frontend"},
    {"name": "Next.js", "category": "Frontend"},
    {"name": "Vue.js", "category": "Frontend"},
    {"name": "Angular", "category": "Frontend"},
    {"name": "Nuxt.js", "category": "Frontend"},
    {"name": "Svelte", "category": "Frontend"},
    {"name": "Vite", "category": "Frontend"},
    {"name": "Webpack", "category": "Frontend"},
    {"name": "Redux", "category": "Frontend"},
    {"name": "Redux Toolkit", "category": "Frontend"},
    {"name": "Zustand", "category": "Frontend"},
    {"name": "Tailwind CSS", "category": "Frontend"},
    {"name": "Bootstrap", "category": "Frontend"},
    {"name": "Sass / SCSS", "category": "Frontend"},
    {"name": "Material-UI (MUI)", "category": "Frontend"},
    {"name": "Chakra UI", "category": "Frontend"},
    {"name": "Framer Motion", "category": "Frontend"},
    {"name": "Three.js", "category": "Frontend"},
    {"name": "WebSockets", "category": "Frontend"},
    {"name": "Responsive Design", "category": "Frontend"},

    # Programming Languages
    {"name": "JavaScript", "category": "Programming"},
    {"name": "TypeScript", "category": "Programming"},
    {"name": "Python", "category": "Programming"},
    {"name": "Java", "category": "Programming"},
    {"name": "C++", "category": "Programming"},
    {"name": "C#", "category": "Programming"},
    {"name": "C", "category": "Programming"},
    {"name": "Go", "category": "Programming"},
    {"name": "Rust", "category": "Programming"},
    {"name": "PHP", "category": "Programming"},
    {"name": "Ruby", "category": "Programming"},
    {"name": "Kotlin", "category": "Programming"},
    {"name": "Swift", "category": "Programming"},
    {"name": "Dart", "category": "Programming"},
    {"name": "Bash / Shell", "category": "Programming"},
    {"name": "SQL", "category": "Programming"},

    # Backend Frameworks & Systems
    {"name": "Node.js", "category": "Backend"},
    {"name": "Express.js", "category": "Backend"},
    {"name": "NestJS", "category": "Backend"},
    {"name": "FastAPI", "category": "Backend"},
    {"name": "Django", "category": "Backend"},
    {"name": "Flask", "category": "Backend"},
    {"name": "Spring Boot", "category": "Backend"},
    {"name": "ASP.NET Core", "category": "Backend"},
    {"name": "Laravel", "category": "Backend"},
    {"name": "Ruby on Rails", "category": "Backend"},
    {"name": "GraphQL", "category": "Backend"},
    {"name": "REST APIs", "category": "Backend"},
    {"name": "gRPC", "category": "Backend"},
    {"name": "Microservices", "category": "Backend"},
    {"name": "Celery", "category": "Backend"},
    {"name": "RabbitMQ", "category": "Backend"},
    {"name": "Kafka", "category": "Backend"},
    {"name": "Redis", "category": "Backend"},
    {"name": "Elasticsearch", "category": "Backend"},

    # Tools, SCM & Productivity
    {"name": "Git", "category": "Tools"},
    {"name": "GitHub", "category": "Tools"},
    {"name": "GitLab", "category": "Tools"},
    {"name": "Bitbucket", "category": "Tools"},
    {"name": "Postman", "category": "Tools"},
    {"name": "JIRA", "category": "Tools"},
    {"name": "Confluence", "category": "Tools"},
    {"name": "Swagger / OpenAPI", "category": "Tools"},
    {"name": "VS Code", "category": "Tools"},
    {"name": "Figma", "category": "Tools"},

    # Cloud & DevOps
    {"name": "Docker", "category": "DevOps"},
    {"name": "Kubernetes", "category": "DevOps"},
    {"name": "Helm", "category": "DevOps"},
    {"name": "Terraform", "category": "DevOps"},
    {"name": "Ansible", "category": "DevOps"},
    {"name": "CI/CD Pipelines", "category": "DevOps"},
    {"name": "GitHub Actions", "category": "DevOps"},
    {"name": "GitLab CI", "category": "DevOps"},
    {"name": "Jenkins", "category": "DevOps"},
    {"name": "Linux", "category": "DevOps"},
    {"name": "Nginx", "category": "DevOps"},
    {"name": "Apache", "category": "DevOps"},
    {"name": "AWS", "category": "Cloud"},
    {"name": "AWS EC2", "category": "Cloud"},
    {"name": "AWS S3", "category": "Cloud"},
    {"name": "AWS Lambda", "category": "Cloud"},
    {"name": "AWS CloudWatch", "category": "Cloud"},
    {"name": "GCP", "category": "Cloud"},
    {"name": "Google Cloud Run", "category": "Cloud"},
    {"name": "Azure", "category": "Cloud"},
    {"name": "Azure DevOps", "category": "Cloud"},
    {"name": "Cloudflare", "category": "Cloud"},
    {"name": "Serverless", "category": "Cloud"},
    {"name": "Prometheus", "category": "DevOps"},
    {"name": "Grafana", "category": "DevOps"},

    # Databases & Storage
    {"name": "PostgreSQL", "category": "Database"},
    {"name": "MySQL", "category": "Database"},
    {"name": "MongoDB", "category": "Database"},
    {"name": "SQLite", "category": "Database"},
    {"name": "DynamoDB", "category": "Database"},
    {"name": "Supabase", "category": "Database"},
    {"name": "Firebase", "category": "Database"},
    {"name": "Cassandra", "category": "Database"},
    {"name": "Prisma", "category": "Database"},
    {"name": "SQLAlchemy", "category": "Database"},

    # AI & Data Science
    {"name": "Machine Learning", "category": "AI"},
    {"name": "Deep Learning", "category": "AI"},
    {"name": "Large Language Models (LLMs)", "category": "AI"},
    {"name": "Prompt Engineering", "category": "AI"},
    {"name": "LangChain", "category": "AI"},
    {"name": "LlamaIndex", "category": "AI"},
    {"name": "Hugging Face", "category": "AI"},
    {"name": "Vector Databases", "category": "AI"},
    {"name": "OpenAI API", "category": "AI"},
    {"name": "PyTorch", "category": "AI"},
    {"name": "TensorFlow", "category": "AI"},
    {"name": "scikit-learn", "category": "AI"},
    {"name": "NLP", "category": "AI"},
    {"name": "Pandas", "category": "Data Science"},
    {"name": "NumPy", "category": "Data Science"},
    {"name": "Databricks", "category": "Data Science"},
    {"name": "dbt", "category": "Data Science"},
    {"name": "Apache Airflow", "category": "Data Science"},
    {"name": "Apache Spark", "category": "Data Science"},
    {"name": "Snowflake", "category": "Data Science"},
    {"name": "BigQuery", "category": "Data Science"},
    {"name": "Power BI", "category": "Analytics"},
    {"name": "Tableau", "category": "Analytics"},

    # Testing & QA
    {"name": "pytest", "category": "Testing"},
    {"name": "Jest", "category": "Testing"},
    {"name": "Vitest", "category": "Testing"},
    {"name": "Cypress", "category": "Testing"},
    {"name": "Playwright", "category": "Testing"},
    {"name": "Selenium", "category": "Testing"},
    {"name": "JUnit", "category": "Testing"},
    {"name": "Unit Testing", "category": "Testing"},
    {"name": "Integration Testing", "category": "Testing"},

    # Security
    {"name": "OAuth 2.0", "category": "Security"},
    {"name": "JWT", "category": "Security"},
    {"name": "OWASP Security", "category": "Security"},
    {"name": "SIEM", "category": "Security"},
    {"name": "Network Security", "category": "Security"},
    {"name": "Keycloak", "category": "Security"},
    {"name": "Role-Based Access Control (RBAC)", "category": "Security"},

    # Mobile
    {"name": "React Native", "category": "Mobile"},
    {"name": "Flutter", "category": "Mobile"},
    {"name": "iOS Development", "category": "Mobile"},
    {"name": "Android Development", "category": "Mobile"},
]


def seed_skills():
    db = SessionLocal()
    try:
        existing_skills = {s.name.lower(): s for s in db.query(Skill).all()}
        added_count = 0
        updated_count = 0

        for sk_data in COMPREHENSIVE_SKILLS:
            name_lower = sk_data["name"].lower()
            if name_lower in existing_skills:
                # Update category if needed
                existing = existing_skills[name_lower]
                if existing.category != sk_data["category"] and existing.category in ["Other", "Framework"]:
                    existing.category = sk_data["category"]
                    updated_count += 1
            else:
                new_skill = Skill(name=sk_data["name"], category=sk_data["category"])
                db.add(new_skill)
                existing_skills[name_lower] = new_skill
                added_count += 1

        db.commit()
        total_now = db.query(Skill).count()
        print(f"Taxonomy update complete! Added: {added_count}, Updated: {updated_count}, Total Skills in DB: {total_now}")
    except Exception as e:
        db.rollback()
        print(f"Error seeding skills: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_skills()
