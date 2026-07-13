import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not set in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.table("users").select("*").execute()
    print("--- TACTICAL USER ARCHIVE ---")
    print(f"{'USER_ID':<20} | {'POINTS':<6} | {'LVL':<3} | {'ADMIN':<5} | {'CREATED_AT'}")
    print("-" * 70)
    for user in res.data:
        print(f"{user['user_id']:<20} | {user['points']:<6} | {user['level']:<3} | {str(user['is_admin']):<5} | {user['created_at']}")
except Exception as e:
    print(f"Error fetching users: {e}")
