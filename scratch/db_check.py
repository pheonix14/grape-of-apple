import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

print(f"Connecting to: {SUPABASE_URL}")
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    res = supabase.table("locations").select("*").limit(5).execute()
    print("Connection Successful!")
    print(f"Retrieved {len(res.data)} locations from 'locations' table:")
    for loc in res.data:
        print(f" - {loc.get('name')} at ({loc.get('lat')}, {loc.get('lon')})")
except Exception as e:
    print("Database Connection / Query Failed:")
    print(e)
