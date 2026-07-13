import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv

# Load environment variables from .env if it exists
load_dotenv()

app = FastAPI()

# Ensure static directory exists
os.makedirs("static", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)
os.makedirs("static/media", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse("static/grape_v1.2.html")

@app.get("/api/media")
async def list_media():
    media_dir = "static/media"
    files = [f for f in os.listdir(media_dir) if f.endswith(('.mp3', '.wav', '.ogg'))]
    return JSONResponse(content=files)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
