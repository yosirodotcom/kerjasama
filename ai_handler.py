import os
import time
import datetime
import google.generativeai as genai
from typing import Optional

# Konfigurasi API - Pastikan Anda sudah set environment variable GOOGLE_API_KEY
API_KEY = os.environ.get("GOOGLE_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class AIHandler:
    _instance = None
    _cache = None
    _current_instruction = ""

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIHandler, cls).__new__(cls)
        return cls._instance

    def get_or_create_cache(self, system_instruction: str, context_text: Optional[str] = None):
        """
        Membuat atau mengambil cache. 
        Jika context_text diberikan (misal data CSV besar), ini akan di-cache.
        """
        # Identitas cache unik berdasarkan instruksi dan awal context
        content_hash = hash(system_instruction + (context_text[:100] if context_text else ""))
        
        if self._cache and self._current_instruction == content_hash:
            return self._cache

        print(f"[AI] Menyiapkan Prompt Cache (Efisiensi Token Aktif)...")
        
        # Konten yang di-cache
        # Tip: Masukkan data CSV referensi di sini jika ada
        contents = [context_text] if context_text else []
        
        try:
            self._cache = genai.caching.CachedContent.create(
                model='models/gemini-1.5-flash-001',
                display_name="kerjasama_master_cache",
                system_instruction=system_instruction,
                contents=contents,
                ttl=datetime.timedelta(minutes=60),
            )
            self._current_instruction = content_hash
            return self._cache
        except Exception as e:
            print(f"[AI] Caching gagal (biasanya karena konten < 32k token), menggunakan mode standar: {e}")
            return None

    def ask(self, prompt: str, system_instruction: str, context_text: str = ""):
        """
        Bertanya ke AI. Jika caching gagal/tidak didukung, otomatis fallback ke mode normal.
        """
        if not API_KEY:
            return "ERROR: API Key tidak ditemukan."

        cache = self.get_or_create_cache(system_instruction, context_text)
        
        try:
            if cache:
                model = genai.GenerativeModel.from_cached_content(cached_content=cache)
            else:
                model = genai.GenerativeModel(
                    model_name='gemini-1.5-flash-001',
                    system_instruction=system_instruction
                )
            
            # Optimasi: Batasi output token untuk menghemat biaya
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(max_output_tokens=500)
            )
            return response.text
        except Exception as e:
            return f"ERROR AI: {str(e)}"

# Singleton Instance
ai_service = AIHandler()
