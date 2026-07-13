import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table("users").select("*").execute()
    print(f"Total users found: {len(res.data)}")
    for u in res.data:
        print(f" - {u.get('user_id')}")
except Exception as e:
    print("Failed to fetch users:")
    print(e)
