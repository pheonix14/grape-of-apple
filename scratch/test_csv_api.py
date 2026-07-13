import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_flow():
    print("1. Signup user")
    res = requests.post(f"{BASE_URL}/api/auth/signup", json={"user_id": "test1", "password": "pwd"})
    print(res.json())
    
    print("\n2. Get points")
    res = requests.get(f"{BASE_URL}/api/user/points/test1")
    print(res.json())
    
    print("\n3. Save config")
    res = requests.post(f"{BASE_URL}/api/user/config", json={"user_id": "test1", "settings": {"theme": "dark"}})
    print(res.json())
    
    print("\n4. Proximity Check (New Delhi: 28.6139, 77.2090)")
    # Exactly at New Delhi
    res = requests.post(f"{BASE_URL}/api/check-proximity", json={"user_id": "test1", "lat": 28.6139, "lon": 77.2090})
    print(res.json())
    
    print("\n5. Get Locations")
    res = requests.get(f"{BASE_URL}/api/locations")
    print(len(res.json()), "locations returned")
    
    print("\n6. Get Travel Reports")
    res = requests.get(f"{BASE_URL}/api/travel-reports")
    print(len(res.json()), "reports returned")
    
    print("\n7. System check updates")
    res = requests.get(f"{BASE_URL}/api/system/check-updates")
    print(res.json())

if __name__ == "__main__":
    test_flow()
