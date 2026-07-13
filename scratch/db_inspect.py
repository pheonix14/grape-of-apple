import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_table(table_name):
    print(f"\n--- Inspecting table: {table_name} ---")
    try:
        res = supabase.table(table_name).select("*").limit(1).execute()
        print(f"Success! {len(res.data)} records found.")
        if res.data:
            print("Columns/Sample:")
            print(res.data[0])
        else:
            print("Table is empty.")
    except Exception as e:
        print(f"Failed to inspect {table_name}:")
        print(e)

inspect_table("locations")
inspect_table("stories")
inspect_table("reviews")
inspect_table("travel_reports")
