from typing import Optional, Dict, Any, Tuple
from backend.services.crypto_utils import hash_password, verify_password, generate_token, verify_token
from backend.database.db_service import db

class AuthService:
    def register(self, username: str, password: str, display_name: str, email: str = "") -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        username_clean = username.strip().lower()
        if len(username_clean) < 3:
            return False, "Username must be at least 3 characters", None
        if len(password) < 6:
            return False, "Password must be at least 6 characters", None
        
        existing = db.get_user_by_username(username_clean)
        if existing:
            return False, "Username already exists", None
        
        hashed = hash_password(password)
        user = db.create_user(username_clean, hashed, display_name or username_clean, email)
        token = generate_token(user["id"], user["username"])
        db.create_session(token, user["id"])
        db.log_audit(user["id"], "auth_register", "user", str(user["id"]), f"Registered user {username_clean}")
        return True, "User registered successfully", {"user": user, "token": token}

    def login(self, username: str, password: str) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        username_clean = username.strip().lower()
        user = db.get_user_by_username(username_clean)
        if not user:
            return False, "Invalid username or password", None
        
        if not user.get("password_hash") or not verify_password(password, user["password_hash"]):
            return False, "Invalid username or password", None
        
        token = generate_token(user["id"], user["username"])
        db.create_session(token, user["id"])
        db.log_audit(user["id"], "auth_login", "user", str(user["id"]), f"User logged in: {username_clean}")
        
        safe_user = {k: v for k, v in user.items() if k != "password_hash"}
        return True, "Login successful", {"user": safe_user, "token": token}

    def get_current_user(self, token: str) -> Optional[Dict[str, Any]]:
        payload = verify_token(token)
        if not payload:
            return None
        user = db.get_user_by_id(payload["uid"])
        if not user:
            return None
        return {k: v for k, v in user.items() if k != "password_hash"}

auth_service = AuthService()
