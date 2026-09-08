import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot

db = SessionLocal()
user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
if not user:
    print("User ishankkumar@example.com not found!")
    sys.exit(1)

cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
print(f"Candidate ID: {cand.id}, Name: {cand.full_name}, Email: {user.email}")

matches = db.query(MatchResult).filter(MatchResult.candidate_id == cand.id).all()
for m in matches:
    print(f"\n--- Match {m.id} | Job: {m.job.title if m.job else 'N/A'} (ID: {m.job_id}) ---")
    print(f"  Pipeline State: {m.pipeline_state}, Status: {m.status}, Score: {m.overall_score}")
    ivs = db.query(Interview).filter(Interview.match_result_id == m.id).all()
    for iv in ivs:
        slots = db.query(InterviewSlot).filter(InterviewSlot.interview_id == iv.id).all()
        print(f"  Interview {iv.id}: status={iv.status}, date={iv.interview_date}, link={iv.meeting_link}, slots_count={len(slots)}")
        for s in slots:
            print(f"    Slot {s.id}: {s.slot_datetime} - {s.slot_end_datetime} [{s.status}]")

db.close()
