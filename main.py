import os
import math
import uuid
from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI()

# Supabase Initialization
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
    
    if not supabase: 
        print("[AUTH] FAILED: SUPABASE OFFLINE")
        return {"status": "error", "message": "Backend Offline"}

    res = supabase.table("users").select("*").eq("user_id", user_id).eq("password", password).execute()
    if res.data and len(res.data) > 0:
        print(f"[AUTH] SUCCESS: {user_id} LINKED")
        return {"status": "ok", "user": res.data[0]}
    
    print(f"[AUTH] DENIED: INVALID CREDENTIALS FOR {user_id}")
    return {"status": "error", "message": "Access Denied"}

@app.post("/api/auth/signup")
async def signup(data: dict = Body(...)):
    user_id = data.get("user_id")
    password = data.get("password")
    
    print(f"[AUTH] SIGNUP REQUEST: {user_id}")
    
    if not supabase: 
        print("[AUTH] FAILED: SUPABASE OFFLINE")
        return {"status": "error", "message": "Backend Offline"}

    # Check if exists
    existing = supabase.table("users").select("user_id").eq("user_id", user_id).execute()
    if existing.data:
        print(f"[AUTH] SIGNUP DENIED: {user_id} ALREADY EXISTS")
        return {"status": "error", "message": "ID Already Archived"}

    new_user = {
        "user_id": user_id,
        "password": password,
        "points": 100,
        "level": 1,
        "is_admin": False,
        "is_guide": False
    }
    
    res = supabase.table("users").insert(new_user).execute()
    if res.data:
        print(f"[AUTH] SUCCESS: {user_id} IDENTITY ARCHIVED")
        return {"status": "ok", "user": res.data[0]}
    
    print(f"[AUTH] FAILED: COULD NOT INSERT {user_id}")
    return {"status": "error", "message": "Archiving Failed"}

@app.get("/api/user/points/{user_id}")
async def get_points(user_id: str):
    if not supabase: return {"status": "error", "message": "Backend Offline"}
    try:
        res = supabase.table("users").select("points").eq("user_id", user_id).execute()
        if res.data and len(res.data) > 0:
            return {"status": "ok", "points": res.data[0]['points']}
        return {"status": "error", "message": "User Not Found"}
    except Exception as e:
        print(f"[POINTS] Error fetching points for {user_id}: {e}")
        return {"status": "error", "message": f"Error: {str(e)}"}

@app.get("/api/user/config/{user_id}")
async def get_config(user_id: str):
    if not supabase: return {"status": "error", "message": "Backend Offline"}
    res = supabase.table("configs").select("settings").eq("user_id", user_id).execute()
    if res.data and len(res.data) > 0:
        return {"status": "ok", "settings": res.data[0]['settings']}
    return {"status": "ok", "settings": {}}

@app.post("/api/user/config")
async def save_config(data: dict = Body(...)):
    user_id = data.get("user_id")
    settings = data.get("settings")
    if not user_id or not supabase: return {"status": "error", "message": "Invalid Request"}
    
    res = supabase.table("configs").upsert({
        "user_id": user_id,
        "settings": settings,
        "updated_at": "now()"
    }).execute()
    return {"status": "ok"}

@app.post("/api/check-proximity")
async def check_proximity(data: dict = Body(...)):
    user_id = data.get("user_id")
    u_lat = data.get("lat")
    u_lon = data.get("lon")
    
    if not user_id or u_lat is None or u_lon is None or not supabase:
        return {"status": "error", "message": "Invalid telemetry data"}

    print(f"[PROXIMITY] SCANNING FOR {user_id} @ {u_lat}, {u_lon}")
    
    res = supabase.table("locations").select("*").execute()
    locations = res.data
    triggered = []
    nearby = []
    
    for loc in locations:
        dist = haversine(u_lat, u_lon, loc['lat'], loc['lon'])
        
        # 100km Nearby Detection
        if dist <= 100:
            nearby.append({
                "name": loc['name'],
                "category": loc.get('category', 'POINT OF INTEREST'),
                "dist": round(dist, 2)
            })
        
        # 11km Reward Trigger
        if dist <= 11:
            history = supabase.table("transactions").select("*")\
                .eq("user_id", user_id)\
                .eq("category", "REWARD_PROXIMITY")\
                .ilike("details", f"%{loc['name']}%")\
                .limit(1).execute()
            
            if not history.data:
                reward = loc.get('reward_per_visit', 100)
                txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
                
                print(f"[PROXIMITY] REWARD UNLOCKED: {user_id} @ {loc['name']} (+{reward})")
                
                supabase.table("transactions").insert({
                    "txn_id": txn_id, "user_id": user_id, "amount": reward,
                    "category": "REWARD_PROXIMITY", "details": f"Proximity Reward: {loc['name']}"
                }).execute()
                
                # Update user points
                user_res = supabase.table("users").select("points").eq("user_id", user_id).execute()
                if user_res.data and len(user_res.data) > 0:
                    new_points = user_res.data[0]['points'] + reward
                    supabase.table("users").update({"points": new_points}).eq("user_id", user_id).execute()
                else:
                    print(f"[PROXIMITY] User {user_id} not found in users table, skipping points update")
                
                triggered.append({"name": loc['name'], "reward": reward, "dist": round(dist, 2)})

    return {"status": "ok", "triggered": triggered, "nearby": nearby}

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
