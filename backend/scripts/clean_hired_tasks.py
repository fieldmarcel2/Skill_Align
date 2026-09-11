import sys
import os
sys.path.insert(0, os.path.abspath("."))
from datetime import datetime, timezone
from app.database.session import SessionLocal
from app.models.recruitment_task import RecruitmentTask
from app.models.match_result import MatchResult
from app.models.candidate import Candidate

db = SessionLocal()
now = datetime.now(timezone.utc)
tasks = db.query(RecruitmentTask).filter(RecruitmentTask.status == 'OPEN').all()
print(f"Total OPEN tasks before cleanup: {len(tasks)}")

completed_count = 0
for t in tasks:
    should_complete = False
    if t.candidate and getattr(t.candidate, 'hiring_status', None) == 'HIRED':
        should_complete = True
    if t.match_result_id:
        mr = db.query(MatchResult).filter(MatchResult.id == t.match_result_id).first()
        if mr and mr.pipeline_state in ('HIRED', 'ON_HOLD_DUE_TO_HIRING', 'REJECTED', 'WITHDRAWN', 'BLACKLISTED'):
            should_complete = True
    
    if should_complete:
        t.status = 'COMPLETED'
        t.completed_at = now
        completed_count += 1

db.commit()
print(f"Auto-completed {completed_count} obsolete tasks for hired/inactive candidates.")

remaining = db.query(RecruitmentTask).filter(RecruitmentTask.status == 'OPEN').count()
print(f"Remaining active OPEN tasks: {remaining}")
db.close()
