"""
SkillAlign - Recruiter and Candidate Cleanup Script

1. Consolidates recruiters so ONLY 2 exist:
   - James Recruiter (recruiter@skillalign.dev)
   - Second Recruiter (recruiter2@skillalign.dev)
   All jobs, tasks, matches, assignments, and records belonging to other recruiters
   are safely reassigned to James Recruiter before deleting the redundant accounts.

2. Removes Alice Johnson and all candidates without genuine uploaded resumes.
   Keeps candidates with actual resumes (Shiva Tripathi, Ishank kumar, Harsh Kandera).
   Cascades and cleans associated candidate child records safely.
"""

import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database.session import SessionLocal
from app.core.security import hash_password


def run_cleanup():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("Starting SkillAlign User & Candidate Cleanup")
        print("=" * 60)

        # -------------------------------------------------------------
        # STEP 1: Ensure James Recruiter and Second Recruiter exist cleanly
        # -------------------------------------------------------------
        recruiter_role = db.execute(text("SELECT id FROM roles WHERE name = 'Recruiter'")).fetchone()
        if not recruiter_role:
            raise RuntimeError("Recruiter role not found in database!")
        recruiter_role_id = recruiter_role[0]

        # Ensure James Recruiter exists (recruiter@skillalign.dev)
        james = db.execute(
            text("SELECT id, email, name FROM users WHERE email = 'recruiter@skillalign.dev'")
        ).fetchone()

        if not james:
            # Check if recruiter@skillaign.dev exists and rename it, or insert
            legacy_james = db.execute(
                text("SELECT id FROM users WHERE email = 'recruiter@skillaign.dev'")
            ).fetchone()
            if legacy_james:
                db.execute(
                    text("""
                        UPDATE users 
                        SET email = 'recruiter@skillalign.dev', name = 'James Recruiter', is_active = TRUE
                        WHERE id = :id
                    """),
                    {"id": legacy_james[0]}
                )
                james_id = legacy_james[0]
            else:
                res = db.execute(
                    text("""
                        INSERT INTO users (name, email, password_hash, role_id, is_active, created_at)
                        VALUES ('James Recruiter', 'recruiter@skillalign.dev', :pwd, :role_id, TRUE, NOW())
                        RETURNING id
                    """),
                    {"pwd": hash_password("Pass@123"), "role_id": recruiter_role_id}
                )
                james_id = res.fetchone()[0]
        else:
            james_id = james[0]
            # Ensure name and active
            db.execute(
                text("UPDATE users SET name = 'James Recruiter', is_active = TRUE WHERE id = :id"),
                {"id": james_id}
            )

        print(f"[OK] James Recruiter active with ID {james_id} (recruiter@skillalign.dev)")

        # Ensure Second Recruiter exists (recruiter2@skillalign.dev)
        second_rec = db.execute(
            text("SELECT id, email, name FROM users WHERE email = 'recruiter2@skillalign.dev'")
        ).fetchone()

        if not second_rec:
            # Check if one of the rec2_... users exists
            existing_rec2 = db.execute(
                text("SELECT id FROM users WHERE name = 'Second Recruiter' ORDER BY id LIMIT 1")
            ).fetchone()
            if existing_rec2:
                db.execute(
                    text("""
                        UPDATE users 
                        SET email = 'recruiter2@skillalign.dev', name = 'Second Recruiter', 
                            password_hash = :pwd, is_active = TRUE, role_id = :role_id
                        WHERE id = :id
                    """),
                    {"id": existing_rec2[0], "pwd": hash_password("Pass@123"), "role_id": recruiter_role_id}
                )
                second_rec_id = existing_rec2[0]
            else:
                res = db.execute(
                    text("""
                        INSERT INTO users (name, email, password_hash, role_id, is_active, created_at)
                        VALUES ('Second Recruiter', 'recruiter2@skillalign.dev', :pwd, :role_id, TRUE, NOW())
                        RETURNING id
                    """),
                    {"pwd": hash_password("Pass@123"), "role_id": recruiter_role_id}
                )
                second_rec_id = res.fetchone()[0]
        else:
            second_rec_id = second_rec[0]
            db.execute(
                text("UPDATE users SET name = 'Second Recruiter', is_active = TRUE WHERE id = :id"),
                {"id": second_rec_id}
            )

        print(f"[OK] Second Recruiter active with ID {second_rec_id} (recruiter2@skillalign.dev)")

        # -------------------------------------------------------------
        # STEP 2: Find all other recruiter accounts and reassign dependencies
        # -------------------------------------------------------------
        other_recruiters = db.execute(
            text("""
                SELECT u.id, u.email, u.name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE r.name = 'Recruiter' AND u.id NOT IN (:j_id, :s_id)
            """),
            {"j_id": james_id, "s_id": second_rec_id}
        ).fetchall()

        other_recruiter_ids = [r[0] for r in other_recruiters]
        print(f"\nFound {len(other_recruiter_ids)} other recruiter accounts to remove: {[f'{r[1]} (ID {r[0]})' for r in other_recruiters]}")

        if other_recruiter_ids:
            # Reassign jobs
            r_jobs = db.execute(
                text("UPDATE jobs SET created_by = :j_id WHERE created_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            ).rowcount
            print(f"Reassigned {r_jobs} jobs to James Recruiter.")

            # Reassign match_results recruiter_id & matched_by
            r_matches = db.execute(
                text("UPDATE match_results SET recruiter_id = :j_id WHERE recruiter_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            ).rowcount
            db.execute(
                text("UPDATE match_results SET matched_by = :j_id WHERE matched_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            print(f"Reassigned {r_matches} match results to James Recruiter.")

            # Clean duplicate assignments or reassign
            db.execute(
                text("""
                    DELETE FROM candidate_recruiter_assignments 
                    WHERE recruiter_id = ANY(:r_ids) 
                      AND candidate_id IN (
                          SELECT candidate_id FROM candidate_recruiter_assignments WHERE recruiter_id = :j_id
                      )
                """),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("""
                    DELETE FROM candidate_recruiter_assignments a
                    WHERE recruiter_id = ANY(:r_ids)
                      AND EXISTS (
                          SELECT 1 FROM candidate_recruiter_assignments b
                          WHERE b.recruiter_id = ANY(:r_ids)
                            AND b.candidate_id = a.candidate_id
                            AND b.id < a.id
                      )
                """),
                {"r_ids": other_recruiter_ids}
            )
            r_cra = db.execute(
                text("UPDATE candidate_recruiter_assignments SET recruiter_id = :j_id WHERE recruiter_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            ).rowcount
            db.execute(
                text("UPDATE candidate_recruiter_assignments SET assigned_by = :j_id WHERE assigned_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            print(f"Reassigned candidate recruiter assignments ({r_cra}) to James Recruiter.")

            # Job recruiter assignments: deduplicate against james_id, then across other_recruiter_ids
            db.execute(
                text("""
                    DELETE FROM job_recruiter_assignments 
                    WHERE recruiter_id = ANY(:r_ids) 
                      AND job_id IN (
                          SELECT job_id FROM job_recruiter_assignments WHERE recruiter_id = :j_id
                      )
                """),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("""
                    DELETE FROM job_recruiter_assignments a
                    WHERE recruiter_id = ANY(:r_ids)
                      AND EXISTS (
                          SELECT 1 FROM job_recruiter_assignments b
                          WHERE b.recruiter_id = ANY(:r_ids)
                            AND b.job_id = a.job_id
                            AND b.id < a.id
                      )
                """),
                {"r_ids": other_recruiter_ids}
            )
            r_jra = db.execute(
                text("UPDATE job_recruiter_assignments SET recruiter_id = :j_id WHERE recruiter_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            ).rowcount
            db.execute(
                text("UPDATE job_recruiter_assignments SET assigned_by = :j_id WHERE assigned_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            print(f"Reassigned job recruiter assignments ({r_jra}) to James Recruiter.")

            # Recruitment tasks
            r_tasks = db.execute(
                text("UPDATE recruitment_tasks SET assigned_to = :j_id WHERE assigned_to = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            ).rowcount
            db.execute(
                text("UPDATE recruitment_tasks SET created_by = :j_id WHERE created_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            print(f"Reassigned {r_tasks} recruitment tasks to James Recruiter.")

            # Interviews
            db.execute(
                text("UPDATE interviews SET scheduled_by = :j_id WHERE scheduled_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE interviews SET requested_by = :j_id WHERE requested_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE interviews SET confirmed_by = :j_id WHERE confirmed_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE interviews SET interviewer_id = :j_id WHERE interviewer_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )

            # Slots & Feedback
            db.execute(
                text("UPDATE interview_slots SET proposed_by = :j_id WHERE proposed_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE interview_feedback SET reviewer_id = :j_id WHERE reviewer_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )

            # Offers
            db.execute(
                text("UPDATE offers SET created_by = :j_id WHERE created_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE offers SET approved_by = :j_id WHERE approved_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )
            db.execute(
                text("UPDATE offers SET pdf_generated_by = :j_id WHERE pdf_generated_by = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )

            # Audit logs actor_id
            db.execute(
                text("UPDATE audit_logs SET actor_id = :j_id WHERE actor_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )

            # Recruitment messages
            db.execute(
                text("UPDATE recruitment_messages SET sender_id = :j_id WHERE sender_id = ANY(:r_ids)"),
                {"j_id": james_id, "r_ids": other_recruiter_ids}
            )

            # Notifications
            db.execute(
                text("DELETE FROM notifications WHERE user_id = ANY(:r_ids)"),
                {"r_ids": other_recruiter_ids}
            )

            # Delete the other recruiter users
            del_rec = db.execute(
                text("DELETE FROM users WHERE id = ANY(:r_ids)"),
                {"r_ids": other_recruiter_ids}
            ).rowcount
            print(f"[OK] Successfully deleted {del_rec} old recruiter user accounts.")

        # -------------------------------------------------------------
        # STEP 3: Remove Alice Johnson and Candidates without genuine resumes
        # -------------------------------------------------------------
        # Identify genuine resumes: length of raw text > 200 and resume_file_path is not null
        all_candidates = db.execute(
            text("""
                SELECT c.id, c.user_id, u.name, u.email, c.resume_file_path, 
                       length(coalesce(c.resume_raw_text, '')) as txt_len
                FROM candidates c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.id
            """)
        ).fetchall()

        keep_candidate_ids = []
        remove_candidate_ids = []
        remove_user_ids = []

        for cand in all_candidates:
            cid, uid, cname, cemail, cpath, ctxt_len = cand
            # Alice Johnson (id=1 or name contains Alice Johnson) is explicitly removed
            is_alice = "alice" in cname.lower() or "alice" in cemail.lower()
            has_real_resume = bool(cpath) and ctxt_len > 200 and not is_alice

            if has_real_resume:
                keep_candidate_ids.append(cid)
                print(f"  [KEEP CANDIDATE] ID {cid}: {cname} ({cemail}) - Resume: {cpath} ({ctxt_len} chars)")
            else:
                remove_candidate_ids.append(cid)
                remove_user_ids.append(uid)
                print(f"  [REMOVE CANDIDATE] ID {cid}: {cname} ({cemail}) - Reason: {'Alice Johnson' if is_alice else 'No uploaded resume'}")

        # Also find candidate users with no candidate profile
        orphan_candidate_users = db.execute(
            text("""
                SELECT u.id, u.name, u.email 
                FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'Candidate' AND u.id NOT IN (
                    SELECT user_id FROM candidates WHERE id = ANY(:keep_ids)
                )
            """),
            {"keep_ids": keep_candidate_ids if keep_candidate_ids else [-1]}
        ).fetchall()

        for u in orphan_candidate_users:
            if u[0] not in remove_user_ids:
                remove_user_ids.append(u[0])
                print(f"  [REMOVE ORPHAN CANDIDATE USER] User ID {u[0]}: {u[1]} ({u[2]})")

        if remove_candidate_ids:
            print(f"\nCleaning dependencies for {len(remove_candidate_ids)} candidates...")

            # Break circular reference between interviews and interview_slots
            db.execute(
                text("""
                    UPDATE interviews 
                    SET candidate_slot_id = NULL 
                    WHERE match_result_id IN (
                        SELECT id FROM match_results WHERE candidate_id = ANY(:c_ids)
                    )
                """),
                {"c_ids": remove_candidate_ids}
            )

            # Delete interview feedback
            db.execute(
                text("""
                    DELETE FROM interview_feedback 
                    WHERE interview_id IN (
                        SELECT id FROM interviews WHERE match_result_id IN (
                            SELECT id FROM match_results WHERE candidate_id = ANY(:c_ids)
                        )
                    )
                """),
                {"c_ids": remove_candidate_ids}
            )

            # Delete interview slots
            db.execute(
                text("""
                    DELETE FROM interview_slots 
                    WHERE match_result_id IN (
                        SELECT id FROM match_results WHERE candidate_id = ANY(:c_ids)
                    )
                """),
                {"c_ids": remove_candidate_ids}
            )

            # Delete interviews
            db.execute(
                text("""
                    DELETE FROM interviews 
                    WHERE match_result_id IN (
                        SELECT id FROM match_results WHERE candidate_id = ANY(:c_ids)
                    )
                """),
                {"c_ids": remove_candidate_ids}
            )

            # Delete offers
            db.execute(
                text("DELETE FROM offers WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )

            # Delete tasks & messages
            db.execute(
                text("DELETE FROM recruitment_tasks WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )
            db.execute(
                text("DELETE FROM recruitment_messages WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )

            # Delete candidate recruiter assignments
            db.execute(
                text("DELETE FROM candidate_recruiter_assignments WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )

            # Delete candidate skills & blacklists
            db.execute(
                text("DELETE FROM candidate_skills WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )
            db.execute(
                text("DELETE FROM candidate_blacklists WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            )

            # In audit_logs: decouple candidate, match_result, and interview so history stays intact without FK blocks
            db.execute(
                text("""
                    UPDATE audit_logs 
                    SET candidate_id = NULL, match_result_id = NULL, interview_id = NULL 
                    WHERE candidate_id = ANY(:c_ids)
                """),
                {"c_ids": remove_candidate_ids}
            )

            # Delete match results
            del_matches = db.execute(
                text("DELETE FROM match_results WHERE candidate_id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            ).rowcount
            print(f"Deleted {del_matches} match results for removed candidates.")

            # Delete candidates
            del_cands = db.execute(
                text("DELETE FROM candidates WHERE id = ANY(:c_ids)"),
                {"c_ids": remove_candidate_ids}
            ).rowcount
            print(f"[OK] Deleted {del_cands} candidate profiles.")

        if remove_user_ids:
            # Delete notifications for these users
            db.execute(
                text("DELETE FROM notifications WHERE user_id = ANY(:u_ids)"),
                {"u_ids": remove_user_ids}
            )

            del_users = db.execute(
                text("DELETE FROM users WHERE id = ANY(:u_ids)"),
                {"u_ids": remove_user_ids}
            ).rowcount
            print(f"[OK] Deleted {del_users} candidate user accounts.")

        db.commit()
        print("\n" + "=" * 60)
        print("DATABASE CLEANUP COMPLETED SUCCESSFULLY")
        print("=" * 60)

        # Final Verification Display
        final_recruiters = db.execute(
            text("""
                SELECT u.id, u.email, u.name, r.name 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE r.name = 'Recruiter'
                ORDER BY u.id
            """)
        ).fetchall()
        print(f"\nRemaining Recruiters (Total: {len(final_recruiters)}):")
        for r in final_recruiters:
            print(f"  - ID {r[0]}: {r[2]} ({r[1]})")

        final_candidates = db.execute(
            text("""
                SELECT c.id, u.name, u.email, c.resume_file_path, length(coalesce(c.resume_raw_text, ''))
                FROM candidates c 
                JOIN users u ON c.user_id = u.id 
                ORDER BY c.id
            """)
        ).fetchall()
        print(f"\nRemaining Candidates with Real Resumes (Total: {len(final_candidates)}):")
        for c in final_candidates:
            print(f"  - ID {c[0]}: {c[1]} ({c[2]}) | Resume: {c[3]} ({c[4]} chars)")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_cleanup()
