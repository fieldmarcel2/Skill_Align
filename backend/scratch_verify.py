from app.database.session import SessionLocal
from app.models.candidate import Candidate
from app.models.offer import Offer
from app.models.match_result import MatchResult
from sqlalchemy import select

def main():
    with SessionLocal() as db:
        # Check Candidate Shiva
        candidate = db.execute(select(Candidate).where(Candidate.id == 6)).scalar_one_or_none()
        print(f"Candidate #{candidate.id}: Name={candidate.full_name}, hiring_status={candidate.hiring_status}")

        # Check Candidate's matches
        matches = db.execute(select(MatchResult).where(MatchResult.candidate_id == 6)).scalars().all()
        for m in matches:
            print(f"  Match #{m.id}: job_id={m.job_id}, status={m.status}, pipeline_state={m.pipeline_state}")

        # Check Accepted Offers
        offers = db.execute(select(Offer).where(Offer.status == 'ACCEPTED')).scalars().all()
        print(f"Accepted offers count: {len(offers)}")
        for o in offers:
            print(f"  Offer #{o.id}: candidate_name={o.candidate_name}, job_title={o.job_title}, status={o.status}, joining_date={o.joining_date or o.expected_joining_date}")

if __name__ == "__main__":
    main()
