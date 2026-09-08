import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.database.session import SessionLocal
from app.models.user import User
from app.routers.interviews import list_my_interviews

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
    interviews = list_my_interviews(db=db, current_user=user)
    print(f"Ishank Kumar active interviews count: {len(interviews)}")
    for iv in interviews:
        print(f"  - Interview ID {iv.id}, Job: {iv.job_title}, Status: {iv.status}, Pipeline: {iv.pipeline_state}, Slots: {len(iv.slots or [])}")
finally:
    db.close()
