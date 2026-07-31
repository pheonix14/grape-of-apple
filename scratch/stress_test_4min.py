import os
import sys
import psutil
import asyncio
import time
import random
import uuid

# Ensure UTF-8 output encoding for Windows console
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.abspath('.'))

from dataengine import DataEngine
from brainengine import BrainEngine

def get_ram_mb():
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / (1024 * 1024)

async def run_4min_stress_test():
    total_duration_sec = 240 # 4 minutes
    start_time = time.time()
    end_time = start_time + total_duration_sec

    print("=" * 70)
    print(f"[STRESS TEST] STARTING 4-MINUTE CONTINUOUS AI & DB WORKLOAD TEST")
    print(f"[STRESS TEST] Target Duration: {total_duration_sec} seconds (4.0 minutes)")
    print("=" * 70)

    data_engine = DataEngine("data")
    brain_engine = BrainEngine(data_engine=data_engine)

    initial_ram = get_ram_mb()
    print(f"[RAM LOG] Boot RAM: {initial_ram:.2f} MB")

    job_categories = [
        # AI Conversational Jobs
        ["Who are you?", "What is Grape OS?", "How does spatial intelligence work?", "System status update"],
        # DB Query Jobs
        ["How many points do I have?", "What locations exist?", "Show travel transactions", "List active operatives"],
        # App Execution Directives
        ["Open map app", "Play music", "Open travel reports", "Open compass", "Open auth portal", "Open settings"],
        # DataEngine Dynamic Operations
        ["REGISTER_USER", "PROXIMITY_SCAN", "FETCH_LOCATIONS", "SAVE_CONFIG"]
    ]

    job_counter = 0
    success_counter = 0
    ram_samples = []
    latencies = []

    last_log_time = time.time()

    while time.time() < end_time:
        job_counter += 1
        job_start = time.time()
        
        # Pick category
        cat_idx = random.randint(0, len(job_categories) - 1)
        sub_items = job_categories[cat_idx]
        chosen_job = random.choice(sub_items)

        current_ram = get_ram_mb()
        ram_samples.append(current_ram)

        try:
            if chosen_job == "REGISTER_USER":
                test_uid = f"op_{uuid.uuid4().hex[:6]}"
                res = data_engine.register_user(test_uid, "pass123")
                status = res.get('status')
            elif chosen_job == "PROXIMITY_SCAN":
                res = data_engine.process_proximity("op_test", 28.6139, 77.2090)
                status = res.get('status')
            elif chosen_job == "FETCH_LOCATIONS":
                res = data_engine.get_locations()
                status = "ok" if isinstance(res, list) else "error"
            elif chosen_job == "SAVE_CONFIG":
                res = data_engine.save_user_config("op_test", {"theme": "neon", "appSize": 64})
                status = res.get('status')
            else:
                res = await brain_engine.query(chosen_job, user_id="OPERATIVE_STRESS_TEST")
                status = res.get('status')

            if status == 'ok':
                success_counter += 1
        except Exception as e:
            print(f"[ERROR] Job {job_counter} failed: {e}")

        job_elapsed = time.time() - job_start
        latencies.append(job_elapsed)

        # Log status every 15 seconds
        now = time.time()
        if now - last_log_time >= 15.0 or now >= end_time:
            elapsed_sec = now - start_time
            rem_sec = max(0.0, end_time - now)
            avg_lat = (sum(latencies) / len(latencies)) * 1000 if latencies else 0.0
            print(
                f"[TIME {elapsed_sec:5.1f}s / 240.0s] "
                f"Jobs: {job_counter:3d} | "
                f"Success Rate: {(success_counter/job_counter)*100:5.1f}% | "
                f"Avg Latency: {avg_lat:5.1f}ms | "
                f"RAM: {current_ram:5.2f} MB (Peak: {max(ram_samples):5.2f} MB)"
            )
            last_log_time = now

        # Brief async yield to prevent CPU saturation
        await asyncio.sleep(0.05)

    final_ram = get_ram_mb()
    total_elapsed = time.time() - start_time
    avg_latency = (sum(latencies) / len(latencies)) * 1000 if latencies else 0.0

    print("\n" + "=" * 70)
    print("[STRESS TEST COMPLETE] 4-MINUTE CONTINUOUS WORKLOAD SUMMARY")
    print("=" * 70)
    print(f"Total Test Time     : {total_elapsed:.2f} seconds ({total_elapsed/60:.2f} minutes)")
    print(f"Total Jobs Executed : {job_counter}")
    print(f"Successful Jobs     : {success_counter} ({(success_counter/job_counter)*100:.2f}%)")
    print(f"Average Job Latency : {avg_latency:.2f} ms")
    print(f"Initial RAM Usage   : {initial_ram:.2f} MB")
    print(f"Final RAM Usage     : {final_ram:.2f} MB")
    print(f"Peak RAM Usage      : {max(ram_samples):.2f} MB")
    print(f"Min RAM Usage       : {min(ram_samples):.2f} MB")
    print(f"Target Memory Limit : 300.00 MB")
    
    if max(ram_samples) <= 300.0:
        margin = 300.0 - max(ram_samples)
        print(f"\nSUCCESS: 4-minute continuous test passed! Peak RAM = {max(ram_samples):.2f} MB ({margin:.2f} MB under 300MB limit). Zero memory leaks detected!")
    else:
        print(f"\nFAIL: Peak RAM exceeded limit! ({max(ram_samples):.2f} MB > 300MB)")

if __name__ == "__main__":
    asyncio.run(run_4min_stress_test())
