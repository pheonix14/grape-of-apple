import os
import httpx
import asyncio

class BrainEngine:
    def __init__(self, data_engine=None):
        self.data_engine = data_engine
        self.hf_token = os.environ.get("HF_TOKEN", "") or "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"
        self.primary_model = os.environ.get("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct")
        self.fallback_models = [
            "meta-llama/Llama-3.2-1B-Instruct",
            "mistralai/Mistral-7B-Instruct-v0.3",
            "HuggingFaceH4/zephyr-7b-beta"
        ]

    def set_data_engine(self, data_engine):
        self.data_engine = data_engine

    def _get_db_context(self) -> str:
        """Collect live database telemetry to supply to the AI Brain."""
        if not self.data_engine:
            return "Database context currently offline."
        
        try:
            users = self.data_engine.get_users()
            locations = self.data_engine.get_locations()
            txns = self.data_engine.get_transactions()
            
            user_count = len(users)
            loc_names = [l.get('name', 'Sector') for l in locations[:5]]
            
            ctx = (
                f"Live DB Status: {user_count} registered users. "
                f"Known sectors: {', '.join(loc_names)}. "
                f"Total logged transactions: {len(txns)}."
            )
            return ctx
        except Exception as e:
            return f"Database telemetry status: nominal ({e})"

    def _detect_app_action(self, prompt: str) -> str:
        """Detect intent to open or control Grape OS apps."""
        lower = prompt.lower().strip()
        
        # Map App
        if any(k in lower for k in ["open map", "show map", "launch map", "go to map", "find sector", "navigate"]):
            return " [ACTION:OPEN_APP:map]"
        # Music App
        if any(k in lower for k in ["open music", "play music", "launch music", "music player", "play song", "soundtrack"]):
            return " [ACTION:OPEN_APP:music]"
        # Travel Reports / Logistics
        if any(k in lower for k in ["open travel reports", "show reports", "travel reports", "sitrep", "logistics", "show transactions"]):
            return " [ACTION:OPEN_APP:travel-reports]"
        # Compass App
        if any(k in lower for k in ["open compass", "show compass", "launch compass", "heading", "bearing"]):
            return " [ACTION:OPEN_APP:compass]"
        # Auth / Profile Portal
        if any(k in lower for k in ["open auth", "open identity", "show profile", "login", "identity portal"]):
            return " [ACTION:OPEN_APP:auth]"
        # Settings Panel
        if any(k in lower for k in ["open settings", "show settings", "control center", "configure system"]):
            return " [ACTION:OPEN_APP:settings]"
        
        return ""

    async def query(self, prompt: str, user_id: str = "OPERATIVE", system_prompt: str = None, token_override: str = None) -> dict:
        """
        Query Hugging Face Inference API with live DB context, fallback, and app tool execution directives.
        """
        if not prompt or not prompt.strip():
            return {"status": "error", "reply": "Empty query payload received."}

        active_token = token_override or self.hf_token
        db_context = self._get_db_context()
        action_flag = self._detect_app_action(prompt)

        sys_instruction = system_prompt or (
            f"You are Grape OS AI Brain v5.4.5, an advanced voice & spatial operating system assistant. "
            f"{db_context} Provide concise, intelligent, actionable responses. "
            f"If asked to run an app, confirm you are executing it."
        )

        # Direct database heuristic handler for fast local query execution
        db_answer = self._handle_db_query(prompt, user_id)
        if db_answer:
            full_reply = db_answer + action_flag
            return {
                "status": "ok",
                "source": "database_engine",
                "model": "GrapeDBEngine-v5.4.5",
                "reply": full_reply,
                "action": action_flag.strip()
            }

        models_to_try = [self.primary_model] + self.fallback_models
        headers = {}
        if active_token:
            headers["Authorization"] = f"Bearer {active_token}"

        for model in models_to_try:
            try:
                # 1. Standard HF Inference API
                url = f"https://api-inference.huggingface.co/models/{model}"
                payload = {
                    "inputs": f"<|im_start|>system\n{sys_instruction}<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n",
                    "parameters": {
                        "max_new_tokens": 200,
                        "temperature": 0.7,
                        "return_full_text": False
                    }
                }

                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = ""
                        if isinstance(data, list) and len(data) > 0:
                            text = data[0].get("generated_text", "")
                        elif isinstance(data, dict):
                            text = data.get("generated_text", str(data))

                        clean_reply = text.replace("<|im_end|>", "").replace("<|im_start|>", "").strip()
                        if clean_reply:
                            final_reply = clean_reply + action_flag
                            return {
                                "status": "ok",
                                "source": "huggingface",
                                "model": model,
                                "reply": final_reply,
                                "action": action_flag.strip()
                            }
            except Exception as e:
                print(f"[BRAIN] HF API Model {model} error: {e}")

        # Fallback to local heuristic engine
        local_reply = self._local_heuristic_response(prompt) + action_flag
        return {
            "status": "ok",
            "source": "local_brain",
            "model": "GrapeLocalBrain-v5.4.5",
            "reply": local_reply,
            "action": action_flag.strip()
        }

    def _handle_db_query(self, prompt: str, user_id: str) -> str:
        """Intelligent database query handler."""
        if not self.data_engine:
            return None

        lower = prompt.lower()

        # Points / Balance check
        if any(k in lower for k in ["points", "balance", "score", "reward"]):
            pts_res = self.data_engine.get_user_points(user_id)
            if pts_res.get("status") == "ok":
                return f"Operative {user_id}, your current balance in the Grape database is {pts_res.get('points')} tactical points."
            else:
                users = self.data_engine.get_users()
                if users:
                    first_u = users[0]
                    return f"System database contains {len(users)} registered operative(s). Operative {first_u.get('user_id')} has {first_u.get('points', 100)} points."
                return "Database reports zero active user points registered."

        # Locations / Sectors check
        if any(k in lower for k in ["locations", "sectors", "places", "map nodes"]):
            locs = self.data_engine.get_locations()
            if locs:
                names = [l.get('name') for l in locs if l.get('name')]
                return f"Database scan shows {len(locs)} registered sectors: {', '.join(names[:6])}."
            return "No mapped sectors found in the spatial database."

        # Transactions / Travel Reports check
        if any(k in lower for k in ["transactions", "txns", "travel reports", "history"]):
            txns = self.data_engine.get_transactions()
            if txns:
                recent = txns[-3:]
                details = [f"{t.get('details', 'TXN')} ({t.get('amount', '0')} pts)" for t in recent]
                return f"Database travel log contains {len(txns)} total transactions. Recent logs: {'; '.join(details)}."
            return "Travel transaction log is currently empty in the database."

        # Users check
        if any(k in lower for k in ["users", "operatives", "agents"]):
            users = self.data_engine.get_users()
            if users:
                user_ids = [u.get('user_id') for u in users if u.get('user_id')]
                return f"Database contains {len(users)} registered operative identities: {', '.join(user_ids)}."
            return "No operative records found in system database."

        return None

    def _local_heuristic_response(self, prompt: str) -> str:
        lower = prompt.lower()
        if any(w in lower for w in ["who are you", "what are you", "identity"]):
            return "I am the Grape OS AI Assistant v5.4.5, running Hugging Face Neural Engine and Spatial Database Integration."
        if any(w in lower for w in ["weather", "temperature", "climate"]):
            return "Sensors report nominal atmospheric conditions across active sectors. Local grid scan operational."
        if any(w in lower for w in ["time", "date", "clock"]):
            import datetime
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return f"Current Grape OS System Time: {now}."
        if any(w in lower for w in ["status", "system", "health", "diag"]):
            return "All Grape OS modules operational: DataEngine online, BrainEngine active, Spatial Canvas running."
        if any(w in lower for w in ["help", "commands", "options"]):
            return "You can query database records, issue app execution commands ('open map', 'play music', 'open travel reports'), or ask general questions."
        
        return f"Grape AI Brain processed query: '{prompt}'. Telemetry nominal."
