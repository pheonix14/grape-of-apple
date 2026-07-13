import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table("locations").select("id, name, lat, lon").execute()
    print(f"Total Locations found: {len(res.data)}")
    for i, loc in enumerate(res.data, start=1):
        print(f"[{i}] Name: {loc['name']}, ID: {loc['id']}")
except Exception as e:
    print("Failed to get locations:")
    print(e)
