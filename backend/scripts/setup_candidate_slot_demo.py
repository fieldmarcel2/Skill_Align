import sys
import os
import io
from datetime import datetime, timezone, timedelta

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.candidate import Candidate
from app.models.match_result import MatchResult
from app.models.interview import Interview
from app.models.interview_slot import InterviewSlot
from app.models.audit_log import AuditLog
import secrets

db = SessionLocal()

user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
cand = db.query(Candidate).filter(Candidate.user_id == user.id).first()
match = db.query(MatchResult).filter(MatchResult.id == 509).first()

if not match:
    print("Match 509 not found!")
    sys.exit(1)

# Delete existing interview slots for match 509
existing_ivs = db.query(Interview).filter(Interview.match_result_id == 509).all()
for iv in existing_ivs:
    db.query(InterviewSlot).filter(InterviewSlot.interview_id == iv.id).delete()
    db.delete(iv)
db.commit()

# Create fresh Interview in WAITING_FOR_CANDIDATE_SLOT state
token = secrets.token_hex(32)
recruiter = db.query(User).join(User.role).filter(User.role.has(name="Recruiter")).first()
hm = db.query(User).join(User.role).filter(User.role.has(name="HR")).first()

now = datetime.now(timezone.utc)
tomorrow_10am = (now + timedelta(days=1)).replace(hour=4, minute=30, second=0, microsecond=0) # 10:00 AM IST
dayafter_2pm = (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0) # 2:30 PM IST

interview = Interview(
    match_result_id=509,
    scheduled_by=recruiter.id if recruiter else 1,
    requested_by=hm.id if hm else 1,
    interview_type="Technical Interview",
    interview_mode="online",
    meeting_link="https://meet.google.com/skillalign-tech-round",
    status="pending_slot",
    slot_token=token,
)
db.add(interview)
db.commit()
db.refresh(interview)

slot1 = InterviewSlot(
    interview_id=interview.id,
    match_result_id=509,
    proposed_by=hm.id if hm else 1,
    slot_datetime=tomorrow_10am,
    slot_end_datetime=tomorrow_10am + timedelta(minutes=45),
    status="proposed",
)
slot2 = InterviewSlot(
    interview_id=interview.id,
    match_result_id=509,
    proposed_by=hm.id if hm else 1,
    slot_datetime=dayafter_2pm,
    slot_end_datetime=dayafter_2pm + timedelta(minutes=45),
    status="proposed",
)
db.add(slot1)
db.add(slot2)

# Update match_result
match.pipeline_state = "WAITING_FOR_CANDIDATE_SLOT"
match.status = "interview_scheduled"

# Log transition in AuditLog
audit = AuditLog(
    actor_id=recruiter.id if recruiter else 1,
    action="SLOTS_SENT_TO_CANDIDATE",
    entity_type="match_result",
    entity_id=match.id,
    match_result_id=match.id,
    interview_id=interview.id,
    from_state="INTERVIEW_SLOTS_PROPOSED",
    to_state="WAITING_FOR_CANDIDATE_SLOT",
    details='{"recruiter": "Sarah Recruiter", "slots_count": 2, "note": "2 proposed time slots dispatched to Ishank Kumar"}'
)
db.add(audit)
db.commit()

print("Match 509 successfully updated to WAITING_FOR_CANDIDATE_SLOT!")
print(f"Created Interview ID: {interview.id} with 2 proposed slots:")
print(f"   Slot {slot1.id}: {slot1.slot_datetime} - {slot1.slot_end_datetime}")
print(f"   Slot {slot2.id}: {slot2.slot_datetime} - {slot2.slot_end_datetime}")
print(f"Token: {token}")

db.close()
