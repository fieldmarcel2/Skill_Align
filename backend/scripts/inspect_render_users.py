import urllib.request
import json

base_url = 'https://skill-align-1.onrender.com'
req = urllib.request.Request(
    f'{base_url}/api/auth/login',
    data=json.dumps({'email': 'admin@skillalign.dev', 'password': 'Admin@123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode())['access_token']

r = urllib.request.Request(f'{base_url}/api/admin/users?page=1&page_size=50', headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(r) as res:
    users = json.loads(res.read().decode())['data']
    for u in users:
        print(f"ID: {u['id']}, Name: {u['name']}, Email: {u.get('email')}, Phone: {u.get('phone_number')}, Role: {u['role']['name']}")
