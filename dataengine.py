import os
import csv
import json
import datetime
import math
import uuid
import httpx

class DataEngine:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

        self.users_csv = os.path.join(self.data_dir, "users.csv")
        self.configs_csv = os.path.join(self.data_dir, "configs.csv")
        self.locations_csv = os.path.join(self.data_dir, "locations.csv")
        self.txns_csv = os.path.join(self.data_dir, "transactions.csv")

        self.supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.supabase_key = os.environ.get("SUPABASE_KEY", "") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

        self._ensure_local_csvs()

    def _ensure_local_csvs(self):
        schema_map = [
            (self.users_csv, ["user_id", "password", "points", "level", "is_admin", "is_guide"]),
            (self.configs_csv, ["user_id", "settings", "updated_at"]),
            (self.locations_csv, ["id", "name", "lat", "lon", "category", "reward_per_visit"]),
            (self.txns_csv, ["txn_id", "user_id", "amount", "category", "details", "timestamp"])
        ]
        for path, headers in schema_map:
            if not os.path.exists(path):
                with open(path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(headers)

    def read_csv(self, file_path: str) -> list:
        if not os.path.exists(file_path):
            return []
        with open(file_path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            return list(reader)

    def write_csv(self, file_path: str, rows: list, fieldnames: list = None):
        if not rows and not fieldnames:
            return
        if not fieldnames and rows:
            fieldnames = list(rows[0].keys())
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    # --- SUPABASE REST SYNC CAPABILITY ---
    def has_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)

    async def sync_to_supabase(self, table_name: str, records: list) -> bool:
        if not self.has_supabase() or not records:
            return False
        try:
            url = f"{self.supabase_url}/rest/v1/{table_name}"
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=records, headers=headers)
                return resp.status_code in (200, 201, 204)
        except Exception as e:
            print(f"[DATAENGINE] Supabase sync error ({table_name}): {e}")
            return False

    async def fetch_from_supabase(self, table_name: str) -> list:
        if not self.has_supabase():
            return []
        try:
            url = f"{self.supabase_url}/rest/v1/{table_name}?select=*"
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}"
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    return resp.json()
        except Exception as e:
            print(f"[DATAENGINE] Supabase fetch error ({table_name}): {e}")
        return []

    # --- USER & AUTH METHODS ---
    def get_users(self) -> list:
        return self.read_csv(self.users_csv)

    def save_users(self, users: list):
        self.write_csv(self.users_csv, users)

    def authenticate_user(self, user_id: str, password: str) -> dict:
        users = self.get_users()
        for u in users:
            if u.get('user_id') == user_id and u.get('password') == password:
                u_copy = dict(u)
                try:
                    u_copy['points'] = int(u_copy.get('points', 100))
                except (ValueError, TypeError):
                    u_copy['points'] = 100
                return {"status": "ok", "user": u_copy}
        return {"status": "error", "message": "Access Denied"}

    def register_user(self, user_id: str, password: str) -> dict:
        users = self.get_users()
        if any(u.get('user_id') == user_id for u in users):
            return {"status": "error", "message": "ID Already Archived"}

        new_user = {
            "user_id": user_id,
            "password": password,
            "points": "100",
            "level": "1",
            "is_admin": "False",
            "is_guide": "False"
        }
        users.append(new_user)
        self.save_users(users)
        
        resp_user = dict(new_user)
        resp_user['points'] = 100
        return {"status": "ok", "user": resp_user}

    def get_user_points(self, user_id: str) -> dict:
        users = self.get_users()
        for u in users:
            if u.get('user_id') == user_id:
                try:
                    pts = int(u.get('points', 0))
                except ValueError:
                    pts = 0
                return {"status": "ok", "points": pts}
        return {"status": "error", "message": "User Not Found"}

    # --- CONFIG METHODS ---
    def get_user_config(self, user_id: str) -> dict:
        configs = self.read_csv(self.configs_csv)
        for c in configs:
            if c.get('user_id') == user_id:
                try:
                    settings_json = json.loads(c.get('settings', '{}'))
                except Exception:
                    settings_json = {}
                return {"status": "ok", "settings": settings_json}
        return {"status": "ok", "settings": {}}

    def save_user_config(self, user_id: str, settings: dict) -> dict:
        if not user_id:
            return {"status": "error", "message": "Invalid Request"}
        configs = self.read_csv(self.configs_csv)
        found = False
        now_str = datetime.datetime.utcnow().isoformat()
        settings_str = json.dumps(settings)

        for c in configs:
            if c.get('user_id') == user_id:
                c['settings'] = settings_str
                c['updated_at'] = now_str
                found = True
                break

        if not found:
            configs.append({
                "user_id": user_id,
                "settings": settings_str,
                "updated_at": now_str
            })

        self.write_csv(self.configs_csv, configs)
        return {"status": "ok"}

    # --- LOCATIONS & PROXIMITY ---
    def get_locations(self) -> list:
        return self.read_csv(self.locations_csv)

    def get_transactions(self) -> list:
        return self.read_csv(self.txns_csv)

    def process_proximity(self, user_id: str, u_lat: float, u_lon: float) -> dict:
        locations = self.get_locations()
        txns = self.get_transactions()
        users = self.get_users()

        triggered = []
        nearby = []
        user_history = [t for t in txns if t.get('user_id') == user_id and t.get('category') == 'REWARD_PROXIMITY']

        for loc in locations:
            try:
                loc_lat = float(loc['lat'])
                loc_lon = float(loc['lon'])
                dist = self.haversine(u_lat, u_lon, loc_lat, loc_lon)
            except (ValueError, KeyError):
                continue

            if dist <= 100:
                nearby.append({
                    "name": loc.get('name', 'Sector'),
                    "category": loc.get('category', 'POINT OF INTEREST'),
                    "dist": round(dist, 2)
                })

            if dist <= 11:
                loc_name = loc.get('name', '')
                already_rewarded = any(loc_name.lower() in t.get('details', '').lower() for t in user_history)
                if not already_rewarded:
                    try:
                        reward = int(loc.get('reward_per_visit', 100))
                    except ValueError:
                        reward = 100
                    txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"

                    new_txn = {
                        "txn_id": txn_id,
                        "user_id": user_id,
                        "amount": str(reward),
                        "category": "REWARD_PROXIMITY",
                        "details": f"Proximity Reward: {loc_name}",
                        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                    }
                    txns.append(new_txn)
                    self.write_csv(self.txns_csv, txns)

                    for u in users:
                        if u.get('user_id') == user_id:
                            try:
                                curr = int(u.get('points', 0))
                            except ValueError:
                                curr = 0
                            u['points'] = str(curr + reward)
                            self.save_users(users)
                            break

                    triggered.append({"name": loc_name, "reward": reward, "dist": round(dist, 2)})

        return {"status": "ok", "triggered": triggered, "nearby": nearby}

    @staticmethod
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
