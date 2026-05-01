from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from supabase import create_client, Client
from pydantic import BaseModel
from typing import Optional
import os

app = FastAPI()

# Supabase Config
SUPABASE_URL = "https://ihdllispdbwvwcwxlvhr.supabase.co"
SUPABASE_KEY = "sb_publishable_TbC7C4Gf277RzfQtBd3CTw_M68nRP2P"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ensure static directory exists
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/media", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.get("/api/media")
async def list_media():
    media_dir = "static/media"
    if not os.path.exists(media_dir): return JSONResponse(content=[])
    files = [f for f in os.listdir(media_dir) if f.endswith(('.mp3', '.wav', '.ogg'))]
    return JSONResponse(content=files)

@app.get("/api/locations")
async def get_locations():
    try:
        response = supabase.table("locations").select("*").execute()
        return JSONResponse(content={"locations": response.data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/search")
async def search_locations(q: str = Query(...)):
    try:
        # Search in name and description (using ilike)
        response = supabase.table("locations").select("*").ilike("name", f"%{q}%").execute()
        return JSONResponse(content={"matches": response.data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/intel/stories")
async def get_stories(loc_id: str):
    try:
        # Some tables use 'loc_id', others might use 'location_id'. Based on user format: 'loc_id'
        response = supabase.table("stories").select("*").eq("loc_id", loc_id).execute()
        return JSONResponse(content={"stories": response.data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/intel/reviews")
async def get_reviews(loc_id: str):
    try:
        # Based on user format: 'location_id'
        response = supabase.table("reviews").select("*").eq("location_id", loc_id).execute()
        return JSONResponse(content={"reviews": response.data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/intel/travel")
async def get_travel(loc_id: str):
    try:
        # Based on user format: 'loc_id'
        response = supabase.table("travel_reports").select("*").eq("loc_id", loc_id).execute()
        return JSONResponse(content={"reports": response.data})
    except Exception as e:
        # Try fallback table name 'travel_logs' if 'travel_reports' fails
        try:
            response = supabase.table("travel_logs").select("*").eq("loc_id", loc_id).execute()
            return JSONResponse(content={"reports": response.data})
        except:
            return JSONResponse(content={"error": str(e)}, status_code=500)

@app.post("/api/sync-mission")
async def sync_mission(mission: dict):
    try:
        response = supabase.table("missions").upsert(mission).execute()
        return JSONResponse(content={"status": "success", "data": response.data})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
