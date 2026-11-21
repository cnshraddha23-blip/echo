import hashlib
import hmac
import os
import json
import base64
import time
from typing import Optional, Dict, Any

SECRET_KEY = os.getenv("ECHO_SECRET_KEY", "echo-super-secure-architectural-key-2026-bilingual-ai")

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return base64.b64encode(salt + key).decode('ascii')

def verify_password(password: str, hashed: str) -> bool:
    try:
        raw = base64.b64decode(hashed.encode('ascii'))
        salt = raw[:16]
        expected_key = raw[16:]
        actual_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(expected_key, actual_key)
    except Exception:
        return False

def generate_token(user_id: int, username: str, duration_seconds: int = 86400 * 30) -> str:
    """Creates a tamper-proof cryptographically signed session token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "uid": user_id,
        "sub": username,
        "exp": int(time.time()) + duration_seconds,
        "iat": int(time.time())
    }
    encoded_header = base64.urlsafe_b64encode(json.dumps(header).encode('utf-8')).decode('ascii').rstrip('=')
    encoded_payload = base64.urlsafe_b64encode(json.dumps(payload).encode('utf-8')).decode('ascii').rstrip('=')
    signature_data = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode('utf-8'), signature_data, hashlib.sha256).digest()).decode('ascii').rstrip('=')
    return f"{encoded_header}.{encoded_payload}.{signature}"

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies HMAC signature and expiration."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        encoded_header, encoded_payload, signature = parts
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode('utf-8'), f"{encoded_header}.{encoded_payload}".encode('utf-8'), hashlib.sha256).digest()
        ).decode('ascii').rstrip('=')
        
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        padding = 4 - (len(encoded_payload) % 4)
        if padding != 4:
            encoded_payload += '=' * padding
        payload = json.loads(base64.urlsafe_b64decode(encoded_payload.encode('ascii')).decode('utf-8'))
        
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
