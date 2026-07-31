import os
import subprocess
from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

from dataengine import DataEngine
from brainengine import BrainEngine
from skin_handler import SkinHandler
from theme import ThemeEngine

load_dotenv()

app = FastAPI(title="Grape OS Engine", version="5.4.3")

os.makedirs("static", exist_ok=True)
os.makedirs("data", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Core Engine Instances
data_engine = DataEngine(data_dir="data")
brain_engine = BrainEngine()
theme_engine = ThemeEngine()

@app.get("/")
async def read_home():
    return FileResponse("static/home.html")

@app.get("/grape")
async def read_grape():
    return FileResponse("static/grape.html")

# --- AUTH ROUTES ---
@app.post("/api/auth/login")
async def login(data: dict = Body(...)):
    user_id = data.get("user_id")
    password = data.get("password")
    print(f"[AUTH] LOGIN ATTEMPT: {user_id}")
    res = data_engine.authenticate_user(user_id, password)
    if res.get("status") == "ok":
        print(f"[AUTH] SUCCESS: {user_id} LINKED")
    else:
        print(f"[AUTH] DENIED: INVALID CREDENTIALS FOR {user_id}")
    return res

@app.post("/api/auth/signup")
async def signup(data: dict = Body(...)):
    user_id = data.get("user_id")
    password = data.get("password")
    print(f"[AUTH] SIGNUP REQUEST: {user_id}")
    res = data_engine.register_user(user_id, password)
    if res.get("status") == "ok":
        print(f"[AUTH] SUCCESS: {user_id} IDENTITY ARCHIVED")
    else:
        print(f"[AUTH] SIGNUP DENIED: {user_id} ALREADY EXISTS")
    return res

@app.get("/api/user/points/{user_id}")
async def get_points(user_id: str):
    return data_engine.get_user_points(user_id)

@app.get("/api/user/config/{user_id}")
async def get_config(user_id: str):
    return data_engine.get_user_config(user_id)

@app.post("/api/user/config")
async def save_config(data: dict = Body(...)):
    user_id = data.get("user_id")
    settings = data.get("settings")
    return data_engine.save_user_config(user_id, settings)

# --- TELEMETRY & PROXIMITY ---
@app.post("/api/check-proximity")
async def check_proximity(data: dict = Body(...)):
    user_id = data.get("user_id")
    u_lat = data.get("lat")
    u_lon = data.get("lon")

    if not user_id or u_lat is None or u_lon is None:
        return {"status": "error", "message": "Invalid telemetry data"}

    print(f"[PROXIMITY] SCANNING FOR {user_id} @ {u_lat}, {u_lon}")
    return data_engine.process_proximity(user_id, float(u_lat), float(u_lon))

@app.get("/api/locations")
async def get_locations():
    return JSONResponse(content=data_engine.get_locations())

@app.get("/api/travel-reports")
async def get_travel_reports():
    return JSONResponse(content=data_engine.get_transactions())

# --- HUGGING FACE AI BRAIN ENGINE ROUTE ---
@app.post("/api/brain/query")
async def query_brain(data: dict = Body(...)):
    prompt = data.get("prompt", "")
    sys_prompt = data.get("system_prompt", None)
    res = await brain_engine.query(prompt, system_prompt=sys_prompt)
    return res

# --- SKINS & THEMES PRESET ROUTE ---
@app.get("/api/skins/presets")
async def get_skins():
    return {"status": "ok", "presets": SkinHandler.get_presets(), "themes": ThemeEngine.get_presets()}

@app.get("/api/theme/presets")
async def get_theme_presets():
    return {"status": "ok", "theme_presets": ThemeEngine.get_presets()}

# --- SUPABASE DATA SYNC ROUTE ---
@app.post("/api/data/sync")
async def sync_data():
    if not data_engine.has_supabase():
        return {"status": "error", "message": "Supabase credentials not configured in environment"}
    users = data_engine.get_users()
    synced = await data_engine.sync_to_supabase("users", users)
    return {"status": "ok" if synced else "error", "synced": synced}

# --- SYSTEM UPDATES & MEDIA ---
@app.get("/api/system/check-updates")
async def check_updates():
    try:
        git_bin = r"C:\Users\Roset\Desktop\PortableGit\cmd\git.exe"
        cmd = [git_bin, "fetch"] if os.path.exists(git_bin) else ["git", "fetch"]
        subprocess.run(cmd, check=False)

        cmd_status = [git_bin, "status", "-uno"] if os.path.exists(git_bin) else ["git", "status", "-uno"]
        result = subprocess.run(cmd_status, capture_output=True, text=True, check=False)

        if "Your branch is behind" in result.stdout:
            cmd_pull = [git_bin, "pull"] if os.path.exists(git_bin) else ["git", "pull"]
            subprocess.run(cmd_pull, check=False)
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
