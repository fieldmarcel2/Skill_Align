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

client = TestClient(app)
db = SessionLocal()
user = db.query(User).filter(User.email == "ishankkumar@example.com").first()
token = create_access_token(data={"sub": user.email, "role": "Candidate", "user_id": user.id})

res = client.get("/api/interviews/my", headers={"Authorization": f"Bearer {token}"})
print(f"Status: {res.status_code}")
data = res.json()
print(f"Interviews returned: {len(data)}")
for iv in data:
    print(f"\nInterview ID {iv['id']} | Job: {iv.get('job_title')} | Status: {iv.get('status')} | Pipeline State: {iv.get('pipeline_state')}")
    print(f"Slots ({len(iv.get('slots') or [])}):")
    for s in (iv.get('slots') or []):
        print(f"  Slot {s['id']}: {s['slot_datetime']} - {s['slot_end_datetime']} [{s['status']}]")
db.close()
