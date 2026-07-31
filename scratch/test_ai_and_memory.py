import os
import sys
import psutil
import asyncio
import time

# Ensure UTF-8 output encoding for Windows console
if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure workspace root is in path
sys.path.insert(0, os.path.abspath('.'))

from dataengine import DataEngine
from brainengine import BrainEngine

def get_ram_mb():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

async def run_ai_and_memory_test():
    print("=" * 60)
    print("[SYSTEM] GRAPE OS - AI & LOW-RAM MEMORY BENCHMARK TEST")
    print("=" * 60)
    
    initial_ram = get_ram_mb()
    print(f"[RAM] Initial Process RAM Usage: {initial_ram:.2f} MB")
    
    # 1. Initialize Engine Instances
    data_engine = DataEngine("data")
    brain_engine = BrainEngine(data_engine=data_engine)
    
    post_init_ram = get_ram_mb()
    print(f"[RAM] Post-Initialization RAM Usage: {post_init_ram:.2f} MB")
    
    # 2. Test Cases (Jobs & Queries)
    test_jobs = [
        # Conversational Queries
        ("Who are you?", "Conversational Identity Query"),
        ("What is system health?", "System Telemetry Check"),
        # Database Jobs
        ("How many points do I have?", "Database Points Balance Check"),
        ("What locations exist?", "Database Sector List Query"),
        ("Show travel transactions", "Database Transaction History Check"),
        # App Execution Directives
        ("Open map app", "App Execution Directive - Map"),
        ("Play music", "App Execution Directive - Music"),
        ("Open travel reports", "App Execution Directive - Logistics"),
        ("Open compass", "App Execution Directive - Compass"),
        ("Open auth portal", "App Execution Directive - Auth")
    ]
    
    print("\n--- RUNNING CONVERSATIONAL & DATABASE AI JOBS ---")
    start_time = time.time()
    
    for i, (prompt, label) in enumerate(test_jobs, 1):
        ram_before = get_ram_mb()
        res = await brain_engine.query(prompt, user_id="OPERATIVE_TEST")
        ram_after = get_ram_mb()
        
        reply_text = res.get('reply', '')
        reply_snippet = reply_text[:70] + "..." if len(reply_text) > 70 else reply_text
        source = res.get('source', 'unknown')
        action = res.get('action', 'none')
        
        print(f"\n[Job {i:02d}] {label}")
        print(f"  Prompt: '{prompt}'")
        print(f"  Source: {source} | Model: {res.get('model')}")
        print(f"  Action Tag: '{action}'")
        print(f"  Reply: \"{reply_snippet}\"")
        print(f"  RAM Delta: {ram_after - ram_before:+.2f} MB (Total Current RAM: {ram_after:.2f} MB)")
    
    elapsed = time.time() - start_time
    final_ram = get_ram_mb()
    
    print("\n" + "=" * 60)
    print("[SUMMARY] FINAL BENCHMARK SUMMARY")
    print("=" * 60)
    print(f"Total Execution Time: {elapsed:.2f} seconds")
    print(f"Peak RAM Consumption: {final_ram:.2f} MB")
    print(f"Target Memory Limit : 300.00 MB")
    
    if final_ram <= 300.0:
        margin = 300.0 - final_ram
        print(f"SUCCESS: RAM footprint is {final_ram:.2f} MB (Safety Margin: {margin:.2f} MB under 300 MB limit!)")
    else:
        print(f"FAIL: RAM exceeds limit! ({final_ram:.2f} MB > 300 MB)")

if __name__ == "__main__":
    asyncio.run(run_ai_and_memory_test())
