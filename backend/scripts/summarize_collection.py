import json

with open("../SkillAlign.postman_collection.json", "r", encoding="utf-8") as f:
    col = json.load(f)

print(f"Collection Name: {col['info']['name']}")
total_reqs = 0
for folder in col["item"]:
    count = len(folder["item"])
    total_reqs += count
    print(f"\n[Module: {folder['name']}] ({count} endpoints)")
    for req in folder["item"]:
        m = req["request"]["method"]
        raw_url = req["request"]["url"]["raw"]
        name = req["name"]
        print(f"  [{m:<6}] {raw_url:<45} | {name}")

print(f"\nTotal Endpoints in Collection: {total_reqs}")
