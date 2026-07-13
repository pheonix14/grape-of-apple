import os
import math
import uuid
import csv
import json
import datetime
import subprocess
from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

os.makedirs("static", exist_ok=True)
os.makedirs("data", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

DATA_DIR = "data"
USERS_CSV = os.path.join(DATA_DIR, "users.csv")
CONFIGS_CSV = os.path.join(DATA_DIR, "configs.csv")
LOCATIONS_CSV = os.path.join(DATA_DIR, "locations.csv")
TXNS_CSV = os.path.join(DATA_DIR, "transactions.csv")

# Ensure files exist
for file_path, headers in [
    (USERS_CSV, ["user_id", "password", "points", "level", "is_admin", "is_guide"]),
    (CONFIGS_CSV, ["user_id", "settings", "updated_at"]),
    (LOCATIONS_CSV, ["id", "name", "lat", "lon", "category", "reward_per_visit"]),
    (TXNS_CSV, ["txn_id", "user_id", "amount", "category", "details", "timestamp"])
]:
    if not os.path.exists(file_path):
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

def read_csv(file_path):
    with open(file_path, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def write_csv(file_path, rows, fieldnames=None):
    if not rows and not fieldnames: return
    if not fieldnames: fieldnames = list(rows[0].keys())
    with open(file_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

@app.get("/")
async def read_home():
    return FileResponse("static/home.html")

@app.get("/grape")
async def read_grape():
    return FileResponse("static/grape.html")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.post("/api/auth/login")
async def login(data: dict = Body(...)):
    user_id = data.get("user_id")
    password = data.get("password")
    print(f"[AUTH] LOGIN ATTEMPT: {user_id}")
    
    users = read_csv(USERS_CSV)
    for u in users:
        if u['user_id'] == user_id and u['password'] == password:
            print(f"[AUTH] SUCCESS: {user_id} LINKED")
            # Convert types appropriately
            u['points'] = int(u['points'])
            return {"status": "ok", "user": u}
            
    print(f"[AUTH] DENIED: INVALID CREDENTIALS FOR {user_id}")
    return {"status": "error", "message": "Access Denied"}

@app.post("/api/auth/signup")
async def signup(data: dict = Body(...)):
    user_id = data.get("user_id")
    password = data.get("password")
    print(f"[AUTH] SIGNUP REQUEST: {user_id}")
    
    users = read_csv(USERS_CSV)
    if any(u['user_id'] == user_id for u in users):
        print(f"[AUTH] SIGNUP DENIED: {user_id} ALREADY EXISTS")
        return {"status": "error", "message": "ID Already Archived"}

    new_user = {
        "user_id": user_id,
        "password": password,
        "points": 100,
        "level": 1,
        "is_admin": "False",
        "is_guide": "False"
    }
    
    users.append(new_user)
    write_csv(USERS_CSV, users)
    
    print(f"[AUTH] SUCCESS: {user_id} IDENTITY ARCHIVED")
    new_user['points'] = int(new_user['points']) # cast for response
    return {"status": "ok", "user": new_user}

@app.get("/api/user/points/{user_id}")
async def get_points(user_id: str):
    users = read_csv(USERS_CSV)
    for u in users:
        if u['user_id'] == user_id:
            return {"status": "ok", "points": int(u['points'])}
    return {"status": "error", "message": "User Not Found"}

@app.get("/api/user/config/{user_id}")
async def get_config(user_id: str):
    configs = read_csv(CONFIGS_CSV)
    for c in configs:
        if c['user_id'] == user_id:
            try:
                settings_json = json.loads(c['settings'])
            except:
                settings_json = {}
            return {"status": "ok", "settings": settings_json}
    return {"status": "ok", "settings": {}}

@app.post("/api/user/config")
async def save_config(data: dict = Body(...)):
    user_id = data.get("user_id")
    settings = data.get("settings")
    if not user_id: return {"status": "error", "message": "Invalid Request"}
    
    configs = read_csv(CONFIGS_CSV)
    found = False
    for c in configs:
        if c['user_id'] == user_id:
            c['settings'] = json.dumps(settings)
            c['updated_at'] = datetime.datetime.utcnow().isoformat()
            found = True
            break
            
    if not found:
        configs.append({
            "user_id": user_id,
            "settings": json.dumps(settings),
            "updated_at": datetime.datetime.utcnow().isoformat()
        })
        
    write_csv(CONFIGS_CSV, configs)
    return {"status": "ok"}

@app.post("/api/check-proximity")
async def check_proximity(data: dict = Body(...)):
    user_id = data.get("user_id")
    u_lat = data.get("lat")
    u_lon = data.get("lon")
    
    if not user_id or u_lat is None or u_lon is None:
        return {"status": "error", "message": "Invalid telemetry data"}

    print(f"[PROXIMITY] SCANNING FOR {user_id} @ {u_lat}, {u_lon}")
    
    locations = read_csv(LOCATIONS_CSV)
    txns = read_csv(TXNS_CSV)
    users = read_csv(USERS_CSV)
    
    triggered = []
    nearby = []
    
    user_history = [t for t in txns if t['user_id'] == user_id and t['category'] == 'REWARD_PROXIMITY']
    
    for loc in locations:
        try:
            loc_lat = float(loc['lat'])
            loc_lon = float(loc['lon'])
            dist = haversine(u_lat, u_lon, loc_lat, loc_lon)
        except ValueError:
            continue
        
        # 100km Nearby Detection
        if dist <= 100:
            nearby.append({
                "name": loc['name'],
                "category": loc.get('category', 'POINT OF INTEREST'),
                "dist": round(dist, 2)
            })
        
        # 11km Reward Trigger
        if dist <= 11:
            already_rewarded = any(loc['name'].lower() in t['details'].lower() for t in user_history)
            
            if not already_rewarded:
                reward = int(loc.get('reward_per_visit', 100))
                txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
                
                print(f"[PROXIMITY] REWARD UNLOCKED: {user_id} @ {loc['name']} (+{reward})")
                
                new_txn = {
                    "txn_id": txn_id, "user_id": user_id, "amount": str(reward),
                    "category": "REWARD_PROXIMITY", "details": f"Proximity Reward: {loc['name']}",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                }
                txns.append(new_txn)
                write_csv(TXNS_CSV, txns)
                
                # Update user points
                for u in users:
                    if u['user_id'] == user_id:
                        u['points'] = str(int(u['points']) + reward)
                        write_csv(USERS_CSV, users)
                        break
                
                triggered.append({"name": loc['name'], "reward": reward, "dist": round(dist, 2)})

    return {"status": "ok", "triggered": triggered, "nearby": nearby}

@app.get("/api/locations")
async def get_locations():
    return JSONResponse(content=read_csv(LOCATIONS_CSV))

@app.get("/api/travel-reports")
async def get_travel_reports():
    txns = read_csv(TXNS_CSV)
    return JSONResponse(content=txns)

@app.get("/api/system/check-updates")
async def check_updates():
    try:
        # Check git status
        subprocess.run(["git", "fetch"], check=False, shell=True)
        result = subprocess.run(["git", "status", "-uno"], capture_output=True, text=True, check=False, shell=True)
        
        if "Your branch is behind" in result.stdout:
            # Pull updates
            subprocess.run(["git", "pull"], check=False, shell=True)
            return {"status": "updated", "message": "Repository updated successfully. Refreshing."}
        
        return {"status": "ok", "message": "System is up to date."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/media")
async def list_media():
    media_dir = os.path.join("static", "media")
    if not os.path.exists(media_dir):
        return JSONResponse(content=[])
    files = [f for f in os.listdir(media_dir) if f.lower().endswith(('.mp3', '.wav', '.ogg'))]
    files.sort()
    return JSONResponse(content=files)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
