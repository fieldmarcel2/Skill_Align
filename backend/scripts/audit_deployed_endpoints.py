import urllib.request
import urllib.error
import json
import ssl

BASE_URL = "https://skill-align-1.onrender.com"

# Create SSL context
ctx = ssl.create_default_context()

def make_request(method, path, headers=None, body=None):
    url = f"{BASE_URL}{path}"
    h = headers.copy() if headers else {}
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            status = resp.status
            try:
                body_json = json.loads(resp.read().decode())
            except Exception:
                body_json = None
            return status, body_json, None
    except urllib.error.HTTPError as e:
        err_body = None
        try:
            err_body = json.loads(e.read().decode())
        except Exception:
            pass
        return e.code, None, err_body
    except Exception as e:
        return 0, None, str(e)

print("=" * 70)
print(f"SKILLALIGN PRODUCTION API ENDPOINT AUDIT -> {BASE_URL}")
print("=" * 70)

# 1. Health check
status, body, err = make_request("GET", "/health")
print(f"GET /health -> {status}")

# 2. Log in with all standard roles
tokens = {}
users = {}

login_credentials = {
    "Admin": ("admin@skillalign.dev", "Admin@123"),
    "Admin_Alt": ("admin@skillaign.dev", "Admin@123"),
    "HR": ("hr@skillalign.dev", "HR@12345"),
    "Recruiter": ("recruiter@skillalign.dev", "Pass@123"),
    "Candidate": ("shiva4850t@gmail.com", "Password123!"),
}

print("\n--- AUTHENTICATION CHECK ---")
for role_label, (email, pwd) in login_credentials.items():
    st, res, err_res = make_request("POST", "/api/auth/login", body={"email": email, "password": pwd})
    if st == 200 and res and "access_token" in res:
        tokens[role_label] = res["access_token"]
        users[role_label] = res.get("user", {})
        print(f"  [SUCCESS] {role_label:10} ({email}): Logged in as User ID {users[role_label].get('id')}, Role: {users[role_label].get('role', {}).get('name')}")
    else:
        print(f"  [FAILED]  {role_label:10} ({email}): {st} -> {err_res}")

# Endpoints matrix to test:
# (Method, Path, Expected_Role)
test_endpoints = [
    # Auth
    ("GET", "/api/auth/me", "All_Auth"),
    
    # Admin endpoints
    ("GET", "/api/admin/users?page=1&page_size=10", "Admin_Only"),
    ("GET", "/api/admin/users?page=1&page_size=10&role=Candidate", "Admin_Only"),
    ("GET", "/api/admin/hiring-logs?page=1&page_size=10", "Admin_Only"),
    
    # Users endpoints
    ("GET", "/api/users/stats", "Admin_Only"),
    ("GET", "/api/users/recruiters", "HR_or_Admin"),
    
    # Jobs endpoints
    ("GET", "/api/jobs", "All_Auth"),
    ("GET", "/api/jobs/1/pipeline", "HR_or_Recruiter"),
    ("GET", "/api/jobs/recruiter/my-jobs", "Recruiter_Only"),
    
    # Candidates endpoints
    ("GET", "/api/candidates/me", "Candidate_Only"),
    ("GET", "/api/candidates/me/skills", "Candidate_Only"),
    ("GET", "/api/candidates/1", "HR_or_Recruiter"),
    
    # Skills / Taxonomy
    ("GET", "/api/skills", "Public_or_Auth"),
    ("GET", "/api/skills/categories", "Public_or_Auth"),
    
    # Notifications / Tasks / Workflow
    ("GET", "/api/workflow/stats", "All_Auth"),
    ("GET", "/api/recruiter-tasks/my-tasks", "Recruiter_Only"),
    ("GET", "/api/notifications", "All_Auth"),
]

print("\n--- ROLE-BASED ACCESS CONTROL AUDIT ACROSS LIVE ENDPOINTS ---")

results = []

for method, path, access_rule in test_endpoints:
    print(f"\nEndpoint: {method} {path} (Expected: {access_rule})")
    
    # Test Unauthenticated
    st, res, err_res = make_request(method, path)
    print(f"  No Auth:        Status {st:3} | {err_res.get('detail') if isinstance(err_res, dict) else err_res}")
    
    # Test each role
    for role in ["Admin", "HR", "Recruiter", "Candidate"]:
        token = tokens.get(role)
        if not token:
            print(f"  {role:14} (No token available)")
            continue
        h = {"Authorization": f"Bearer {token}"}
        st, res, err_res = make_request(method, path, headers=h)
        status_flag = "OK" if st == 200 else ("FORBIDDEN" if st == 403 else f"STATUS_{st}")
        detail = ""
        if isinstance(err_res, dict):
            detail = err_res.get("detail", "")
        elif isinstance(res, dict):
            if "total_items" in res:
                detail = f"Total items: {res['total_items']}"
            elif "id" in res:
                detail = f"Returned ID: {res['id']}"
            elif isinstance(res, list):
                detail = f"Count: {len(res)}"
        elif isinstance(res, list):
            detail = f"Count: {len(res)}"
        print(f"  {role:14} Status {st:3} [{status_flag:9}] -> {detail[:50]}")
