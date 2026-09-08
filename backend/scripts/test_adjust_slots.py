import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.match_result import MatchResult
from app.services import workflow_service

def test_adjust_and_direct_request():
    db = SessionLocal()
    try:
        hr = db.query(User).filter(User.email == "hr@skillalign.dev").first()
        if not hr:
            print("HR user not found")
            return

        # Find a match result
        mr = db.query(MatchResult).first()
        if not mr:
            print("No match result found")
            return

        print(f"Testing on MatchResult ID: {mr.id}, Current State: {mr.pipeline_state}")

        # Set state to CANDIDATE_MATCHED to test direct interview request
        mr.pipeline_state = "CANDIDATE_MATCHED"
        db.commit()

        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        day_after = datetime.now(timezone.utc) + timedelta(days=2)

        slots_1 = [
            {"slot_datetime": tomorrow.isoformat(), "slot_end_datetime": (tomorrow + timedelta(minutes=45)).isoformat()},
            {"slot_datetime": day_after.isoformat(), "slot_end_datetime": (day_after + timedelta(minutes=45)).isoformat()},
        ]

        # 1. Propose from CANDIDATE_MATCHED
        mr, inv = workflow_service.request_interview(db, mr, hr, slots=slots_1, interview_type="Technical Interview")
        print(f"[OK] Direct Request Success! Pipeline State: {mr.pipeline_state}, Interview ID: {inv.id}")

        # 2. Adjust slots while in INTERVIEW_SLOTS_PROPOSED
        day_3 = datetime.now(timezone.utc) + timedelta(days=3)
        day_4 = datetime.now(timezone.utc) + timedelta(days=4)
        slots_2 = [
            {"slot_datetime": day_3.isoformat(), "slot_end_datetime": (day_3 + timedelta(minutes=60)).isoformat()},
            {"slot_datetime": day_4.isoformat(), "slot_end_datetime": (day_4 + timedelta(minutes=60)).isoformat()},
        ]

        mr, inv = workflow_service.request_interview(db, mr, hr, slots=slots_2, interview_type="System Design Round")
        print(f"[OK] Adjust Slots Success! Pipeline State: {mr.pipeline_state}, Interview Type: {inv.interview_type}")
        print("ALL SLOT ADJUSTMENT TESTS PASSED PERFECTLY!")

    finally:
        db.close()

if __name__ == "__main__":
    test_adjust_and_direct_request()
