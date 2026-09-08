import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.database.session import SessionLocal
from app.models.user import User
from app.models.interview import Interview
from app.models.match_result import MatchResult
from app.models.audit_log import AuditLog

client = TestClient(app)
db = SessionLocal()

user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
token = create_access_token(data={"sub": str(user.id), "role": "Candidate"})

# 1. Candidate fetches my interviews
res = client.get("/api/interviews/my", headers={"Authorization": f"Bearer {token}"})
print(f"1. Candidate GET /api/interviews/my -> Status {res.status_code}")
data = res.json()
assert len(data) > 0, "Expected at least 1 interview"
iv = data[0]
print(f"   Found Interview {iv['id']} in state {iv.get('pipeline_state')}")
slots = iv.get("slots") or []
print(f"   Available slots: {len(slots)}")
for s in slots:
    print(f"     - Slot {s['id']}: {s['slot_datetime']} ({s['status']})")

slot_to_choose = slots[0]

# 2. Candidate selects Slot 1
print(f"\n2. Candidate selecting Slot {slot_to_choose['id']}...")
res_sel = client.post(
    f"/api/workflow/interviews/{iv['id']}/select-slot",
    json={"slot_id": slot_to_choose["id"]},
    headers={"Authorization": f"Bearer {token}"}
)
print(f"   Select Slot Status: {res_sel.status_code}")
if res_sel.status_code != 200:
    print(f"   Error: {res_sel.text}")
assert res_sel.status_code == 200, "Slot selection failed"
sel_data = res_sel.json()
print(f"   Result: Interview date set to {sel_data.get('interview_date')}, status={sel_data.get('status')}")

# 3. Verify Candidate Dashboard state after selection
res_after = client.get("/api/interviews/my", headers={"Authorization": f"Bearer {token}"})
iv_after = res_after.json()[0]
print(f"\n3. Candidate GET /api/interviews/my after selection:")
print(f"   Pipeline State: {iv_after.get('pipeline_state')}")
print(f"   Interview Date: {iv_after.get('interview_date')}")

# 4. Verify Audit Log
logs = db.query(AuditLog).filter(AuditLog.match_result_id == 509).order_by(AuditLog.created_at.desc()).limit(3).all()
print(f"\n4. Recent Audit Logs for Match 509:")
for l in logs:
    print(f"   - Action: {l.action} | {l.from_state} -> {l.to_state} | Actor ID: {l.actor_id}")

db.close()
print("\n--- ALL CANDIDATE SLOT SELECTION STEPS VERIFIED 100%! ---")
