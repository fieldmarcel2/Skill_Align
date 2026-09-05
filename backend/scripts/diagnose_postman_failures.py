import json
import urllib.request
import urllib.error

# Load tokens
roles = [
    ('admin', 'admin@skillaign.dev', 'Admin@123'),
    ('hr', 'hr@skillaign.dev', 'HR@12345'),
    ('recruiter', 'recruiter@skillaign.dev', 'Rec@12345'),
    ('candidate', 'alice@candidate.dev', 'Alice@123')
]

tokens = {}
for role, email, pwd in roles:
    try:
        data = json.dumps({'email': email, 'password': pwd}).encode('utf-8')
        req = urllib.request.Request('http://localhost:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
        res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        tokens[role] = res['access_token']
    except Exception as e:
        print(f"Failed to get token for {role}: {e}")

print("Tokens obtained:", list(tokens.keys()))

with open("../SkillAlign.postman_collection.json", "r", encoding="utf-8") as f:
    col = json.load(f)

results = []
for folder in col["item"]:
    folder_name = folder["name"]
    for item in folder["item"]:
        req = item["request"]
        method = req["method"]
        raw_url = req["url"]["raw"]
        name = item["name"]
        
        # Test request against backend
        test_url = raw_url.replace("{{baseUrl}}", "http://localhost:8000")
        # Replace path variables with valid sample IDs
        test_url = test_url.replace(":user_id", "2")
        test_url = test_url.replace(":job_id", "1")
        test_url = test_url.replace(":candidate_id", "1")
        test_url = test_url.replace(":match_id", "1")
        test_url = test_url.replace(":skill_id", "1")
        test_url = test_url.replace(":interview_id", "1")

        # Select token based on module
        tok = tokens.get("admin")
        if "Candidate" in folder_name or "candidates/me" in test_url:
            tok = tokens.get("candidate")
        elif "Job" in folder_name or "jobs" in test_url and method == "POST":
            tok = tokens.get("recruiter")
        elif "Interview" in folder_name or "scorecard" in test_url:
            tok = tokens.get("hr")

        headers = {"Accept": "application/json"}
        if tok and not any(p in test_url for p in ["/api/auth/login", "/api/auth/register", "/api/auth/send-otp", "/health"]):
            headers["Authorization"] = f"Bearer {tok}"

        body_data = None
        if "body" in req and req["body"].get("raw"):
            headers["Content-Type"] = "application/json"
            body_data = req["body"]["raw"].encode("utf-8")

        status_code = None
        err_msg = ""
        try:
            http_req = urllib.request.Request(test_url, data=body_data, headers=headers, method=method)
            resp = urllib.request.urlopen(http_req)
            status_code = resp.status
        except urllib.error.HTTPError as e:
            status_code = e.code
            try:
                err_msg = e.read().decode("utf-8")[:120]
            except Exception:
                err_msg = str(e)
        except Exception as e:
            status_code = "ERR"
            err_msg = str(e)

        results.append((method, test_url, status_code, err_msg, name))

print("\n--- Summary of Endpoint Diagnoses ---")
success_count = sum(1 for r in results if isinstance(r[2], int) and 200 <= r[2] < 300)
print(f"Successful (2xx): {success_count} / {len(results)}")

print("\nFailures or Non-2xx:")
for r in results:
    if not (isinstance(r[2], int) and 200 <= r[2] < 300):
        print(f"[{r[2]}] {r[0]:<6} {r[1]:<50} | {r[3]}")
