import os
import httpx
import asyncio

class BrainEngine:
    def __init__(self):
        self.hf_token = os.environ.get("HF_TOKEN", "")
        # Using lightweight, fast models: Qwen 2.5 7B Instruct or Mistral 7B Instruct
        self.primary_model = os.environ.get("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct")
        self.fallback_model = "mistralai/Mistral-7B-Instruct-v0.3"

    async def query(self, prompt: str, system_prompt: str = None) -> dict:
        """
        Query Hugging Face Inference API with automatic model failover and smart local fallback.
        """
        if not prompt or not prompt.strip():
            return {"status": "error", "reply": "Empty query payload received."}

        sys_instruction = system_prompt or (
            "You are Grape OS AI Brain, a futuristic, fast, and helpful AI assistant embedded in a high-tech spatial operating system. "
            "Provide concise, direct, intelligent responses."
        )

        # 1. Try Hugging Face Router API if token or public endpoint is reachable
        models_to_try = [self.primary_model, self.fallback_model]
        headers = {}
        if self.hf_token:
            headers["Authorization"] = f"Bearer {self.hf_token}"

        for model in models_to_try:
            try:
                url = f"https://api-inference.huggingface.co/models/{model}"
                payload = {
                    "inputs": f"<|im_start|>system\n{sys_instruction}<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n",
                    "parameters": {
                        "max_new_tokens": 256,
                        "temperature": 0.7,
                        "return_full_text": False
                    }
                }

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        text = ""
                        if isinstance(data, list) and len(data) > 0:
                            text = data[0].get("generated_text", "")
                        elif isinstance(data, dict):
                            text = data.get("generated_text", str(data))

                        clean_reply = text.replace("<|im_end|>", "").strip()
                        if clean_reply:
                            return {
                                "status": "ok",
                                "source": "huggingface",
                                "model": model,
                                "reply": clean_reply
                            }
            except Exception as e:
                print(f"[BRAIN] HF API Model {model} query error: {e}")

        # 2. Local Intelligent Fallback Engine
        return {
            "status": "ok",
            "source": "local_brain",
            "model": "GrapeLocalBrain-v5.4",
            "reply": self._local_heuristic_response(prompt)
        }

    def _local_heuristic_response(self, prompt: str) -> str:
        lower = prompt.lower()
        if any(w in lower for w in ["who are you", "what are you", "identity"]):
            return "I am the Grape OS AI Core v5.4.1. I run on Hugging Face inference and local spatial intelligence."
        if any(w in lower for w in ["weather", "temperature", "climate"]):
            return "Atmospheric sensors report optimal conditions across active sectors. Local grid scan nominal."
        if any(w in lower for w in ["time", "date", "clock"]):
            import datetime
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return f"Current Grape OS System Time: {now}."
        if any(w in lower for w in ["status", "system", "health", "diag"]):
            return "All Grape OS modules nominal: DataEngine online, SkinHandler active, Spatial Canvas engaged."
        if any(w in lower for w in ["help", "commands", "options"]):
            return "You can issue navigation commands ('find Tokyo', 'report logistics'), toggle button skins, or speak directly to query the AI."
        
        return f"Grape Intelligence processed: '{prompt}'. All telemetry parameters active."
