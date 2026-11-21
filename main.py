import os
import uvicorn
from backend.main import combined_asgi_app, app as fastapi_app

# Railpack automatically runs: uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
app = combined_asgi_app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    host = "0.0.0.0"
    print(f"[*] Starting Echo Voice Assistant on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
