import sqlite3
import os
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class DatabaseService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            try:
                from backend.config import settings
                db_path = settings.DB_PATH
            except Exception:
                db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "echo.db")
        
        self.db_path = db_path
        try:
            parent_dir = os.path.dirname(os.path.abspath(self.db_path))
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)
        except Exception:
            fallback = "/tmp/echo.db" if os.name != "nt" else "echo.db"
            self.db_path = fallback
            
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        try:
            parent_dir = os.path.dirname(os.path.abspath(self.db_path))
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)
            conn = sqlite3.connect(self.db_path)
        except Exception:
            fallback = "/tmp/echo.db" if os.name != "nt" else "echo.db"
            self.db_path = fallback
            conn = sqlite3.connect(self.db_path)

        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. users table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                display_name TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            # Auto-migrate any existing users table
            for col, col_type in [("password_hash", "TEXT"), ("email", "TEXT"), ("role", "TEXT DEFAULT 'user'")]:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
                except Exception:
                    pass

            # 2. sessions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """)

            # 3. preferences table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 4. conversations table (parent sessions)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                title TEXT NOT NULL,
                folder TEXT DEFAULT 'Echo Assistant',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            try:
                cursor.execute("ALTER TABLE conversations ADD COLUMN folder TEXT DEFAULT 'Echo Assistant'")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE conversations ADD COLUMN user_id INTEGER DEFAULT 1")
            except Exception:
                pass

            # 5. conversation_history table (messages)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                language TEXT DEFAULT 'en-IN',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """)

            # 6. devices table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                name TEXT NOT NULL,
                os TEXT NOT NULL,
                companion_version TEXT DEFAULT '2.0.0',
                status TEXT DEFAULT 'offline', -- 'online', 'offline'
                ip_address TEXT,
                capabilities_json TEXT DEFAULT '[]',
                permissions_json TEXT DEFAULT '[]',
                pairing_code TEXT,
                pairing_code_expires TIMESTAMP,
                last_seen TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """)

            # 7. commands table (Remote device execution tracking)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS commands (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                target_device_id TEXT,
                command_type TEXT NOT NULL,
                payload_json TEXT,
                status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'executing', 'completed', 'failed', 'cancelled'
                result_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
            """)

            # 8. memories table (Persistent long-term AI memory)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                category TEXT DEFAULT 'preference', -- 'preference', 'fact', 'project', 'productivity'
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                importance INTEGER DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """)

            # 9. workflows table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                name TEXT NOT NULL,
                description TEXT,
                trigger_type TEXT DEFAULT 'manual', -- 'manual', 'voice', 'schedule'
                trigger_value TEXT,
                steps_json TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                last_run TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """)

            # 10. workflow_executions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflow_executions (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                user_id INTEGER DEFAULT 1,
                status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
                output_summary TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                finished_at TIMESTAMP,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
            )
            """)

            # 11. agent_executions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_executions (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                agent_name TEXT NOT NULL,
                task_input TEXT NOT NULL,
                output_summary TEXT,
                tools_used_json TEXT DEFAULT '[]',
                execution_time_ms INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 12. audit_logs table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 13. notes table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                is_pinned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 14. tasks table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                due_date TEXT,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 15. reminders table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                title TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 16. app_history table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 17. command_history table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS command_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                action_type TEXT NOT NULL,
                status TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # Seed default preferences if not present
            defaults = {
                "theme": "light",
                "language": "en-IN",
                "speech_rate": "1.0",
                "assistant_name": "Echo",
                "user_name": "Shraddha",
                "wake_word_enabled": "true",
                "auto_speak_responses": "true",
                "active_ai_provider": "gemini",
                "ai_model": "gemini-flash-lite-latest"
            }
            for k, v in defaults.items():
                cursor.execute("INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)", (k, v))
            
            # Seed default user if not exists
            cursor.execute("SELECT id FROM users WHERE username = 'shraddha'")
            admin_user = cursor.fetchone()
            if not admin_user:
                # Password is 'echopassword123'
                from backend.services.crypto_utils import hash_password
                pwd_hash = hash_password("echopassword123")
                cursor.execute("""
                INSERT INTO users (username, password_hash, display_name, email, role)
                VALUES ('shraddha', ?, 'Shraddha', 'shraddha@echo.ai', 'admin')
                """, (pwd_hash,))

            # Seed conversations and folders matching project structure
            preset_convs = [
                ('conv_college_faq', 'AI College FAQ Chatbot', 'AI-Based College FA...'),
                ('default', 'Project Echo Full-Stack UI', 'Echo Voice Assistant'),
                ('conv_smart_parking', 'Smart Parking Management System', 'New folder'),
                ('conv_general_greeting', 'General Greeting', 'GATHER & SETTLE'),
                ('conv_cab_booking', 'Cab Booking System Architecture', 'Cab Booking System'),
                ('conv_ev_charging', 'EV Charging System Setup', 'EV Charging'),
                ('conv_signalforge', 'SignalForge AI Frontend', 'ContentkaKheeda'),
                ('conv_edith', 'EDITH 3D AI Frontend', 'E.D.I.T.H. AI')
            ]
            for cid, title, folder in preset_convs:
                cursor.execute("""
                INSERT OR IGNORE INTO conversations (id, title, folder) VALUES (?, ?, ?)
                """, (cid, title, folder))

            # Seed realistic chat messages for preset conversations if empty
            cursor.execute("SELECT COUNT(*) as count FROM conversation_history")
            msg_count = cursor.fetchone()["count"]
            if msg_count <= 2:
                seed_messages = [
                    ('default', 'user', 'Welcome to Project Echo Full-Stack UI.'),
                    ('default', 'assistant', 'Echo Cloud Brain is online and ready. Voice and typed commands are isolated, multi-device companion dispatch is primed, and all 9 specialized agents are operational.'),
                    ('conv_college_faq', 'user', 'How do I train the FAQ retrieval model with our college syllabus and fee structure?'),
                    ('conv_college_faq', 'assistant', 'Ingest the syllabus and fee schedule documents through the File Management Agent (FM-04). We will embed them into vector chunks and index them for semantic similarity search with threshold 0.85.'),
                    ('conv_smart_parking', 'user', 'What is the sensor polling interval for the IoT parking slot detection?'),
                    ('conv_smart_parking', 'assistant', 'The ultrasonic and camera sensors poll every 2.5 seconds, pushing slot status changes over MQTT to the central broker with sub-second latency.'),
                    ('conv_general_greeting', 'user', 'Hello Echo, introduce yourself and your capabilities.'),
                    ('conv_general_greeting', 'assistant', 'Greetings! I am Echo, your bilingual AI personal assistant. I can orchestrate multi-step workflows, manage desktop companion devices, research the web, organize files, and assist in both English and Kannada.'),
                    ('conv_cab_booking', 'user', 'Can you outline the microservices needed for the real-time cab dispatch system?'),
                    ('conv_cab_booking', 'assistant', 'The architecture consists of: 1) Rider API Service, 2) Driver Location Ingestion (WebSocket / Kafka), 3) Geo-hashing Dispatch Matching Engine, 4) Ride Lifecycle & Payment Service, and 5) Notification Hub.'),
                    ('conv_ev_charging', 'user', 'What protocol should we use for communicating with EV charge points?'),
                    ('conv_ev_charging', 'assistant', 'Use OCPP 2.0.1 (Open Charge Point Protocol) over secure WebSockets (WSS). It handles remote start/stop, smart charging profiles, and meter values reliably.'),
                    ('conv_signalforge', 'user', 'Review the responsive layout for the SignalForge analytics dashboard.'),
                    ('conv_signalforge', 'assistant', 'The layout uses CSS Grid with adaptive breakout columns. On desktop, the metric cards and charts render in a 3-column split, folding cleanly into a single vertical stack on mobile viewports.'),
                    ('conv_edith', 'user', 'Optimize the Three.js particle sphere rendering loop for 60fps.'),
                    ('conv_edith', 'assistant', 'Use InstancedMesh with a custom RawShaderMaterial to batch all particle vertices into a single draw call. Avoid allocating objects or matrix recalculations inside the render loop.')
                ]
                for cid, role, content in seed_messages:
                    cursor.execute("""
                    INSERT INTO conversation_history (conversation_id, role, content, language)
                    VALUES (?, ?, ?, 'en-IN')
                    """, (cid, role, content))

            # Seed default preset workflows
            cursor.execute("SELECT COUNT(*) as count FROM workflows")
            wf_count = cursor.fetchone()["count"]
            if wf_count == 0:
                preset_workflows = [
                    (
                        "wf-coding-mode",
                        1,
                        "Coding Mode",
                        "Prepares full developer workspace by launching VS Code, Browser, and fetching active tasks",
                        "voice",
                        "activate coding mode",
                        json.dumps([
                            {"action": "open_app", "target": "code", "desc": "Launch Visual Studio Code"},
                            {"action": "open_app", "target": "chrome", "desc": "Launch Web Browser"},
                            {"action": "read_tasks", "desc": "Display pending engineering tasks"}
                        ]),
                        1
                    ),
                    (
                        "wf-study-mode",
                        1,
                        "Study & Calculation Mode",
                        "Sets up research and math tools (Calculator and Notepad) with a 45-minute focus timer",
                        "voice",
                        "study mode",
                        json.dumps([
                            {"action": "open_app", "target": "calc", "desc": "Launch Calculator"},
                            {"action": "open_app", "target": "notepad", "desc": "Open Note Taking Pad"},
                            {"action": "create_reminder", "title": "Study break time", "minutes": 45}
                        ]),
                        1
                    ),
                    (
                        "wf-morning-briefing",
                        1,
                        "Morning Executive Briefing",
                        "Reviews weather, pending tasks, and recent system telemetry",
                        "schedule",
                        "08:00 AM",
                        json.dumps([
                            {"action": "get_weather", "city": "Bengaluru", "desc": "Retrieve meteorological conditions"},
                            {"action": "get_tasks", "desc": "Summarize high-priority agenda items"},
                            {"action": "get_telemetry", "desc": "Inspect host system metrics"}
                        ]),
                        1
                    )
                ]
                for wf in preset_workflows:
                    cursor.execute("""
                    INSERT OR IGNORE INTO workflows (id, user_id, name, description, trigger_type, trigger_value, steps_json, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, wf)

            conn.commit()

    # --- User & Session Operations ---
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            return dict(row) if row else None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            return dict(row) if row else None

    def create_user(self, username: str, password_hash: str, display_name: str, email: str = "") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO users (username, password_hash, display_name, email)
            VALUES (?, ?, ?, ?)
            """, (username, password_hash, display_name, email))
            uid = cursor.lastrowid
            conn.commit()
            return {"id": uid, "username": username, "display_name": display_name, "email": email, "role": "user"}

    def create_session(self, token: str, user_id: int, days: int = 30):
        expires_at = datetime.now() + timedelta(days=days)
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR REPLACE INTO sessions (token, user_id, expires_at)
            VALUES (?, ?, ?)
            """, (token, user_id, expires_at.isoformat()))
            conn.commit()

    def delete_session(self, token: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()

    # --- Device Management ---
    def get_devices(self, user_id: int = 1) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC", (user_id,)).fetchall()
            devices = []
            for r in rows:
                d = dict(r)
                d["capabilities"] = json.loads(d.get("capabilities_json") or "[]")
                d["permissions"] = json.loads(d.get("permissions_json") or "[]")
                devices.append(d)
            return devices

    def get_device_by_id(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
            if not row:
                return None
            d = dict(row)
            d["capabilities"] = json.loads(d.get("capabilities_json") or "[]")
            d["permissions"] = json.loads(d.get("permissions_json") or "[]")
            return d

    def register_or_update_device(self, device_id: str, user_id: int, name: str, os_name: str, companion_version: str = "2.0.0", capabilities: list = None, permissions: list = None, ip_address: str = None) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cap_json = json.dumps(capabilities or ["app_launch", "close_app", "window_control", "system_telemetry", "file_search", "browser_control", "app_control"])
            perm_json = json.dumps(permissions or ["app_launch", "close_app", "window_control", "system_telemetry", "file_search", "browser_control", "app_control"])
            now = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO devices (id, user_id, name, os, companion_version, status, ip_address, capabilities_json, permissions_json, last_seen)
            VALUES (?, ?, ?, ?, ?, 'online', ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                os = excluded.os,
                companion_version = excluded.companion_version,
                status = 'online',
                ip_address = excluded.ip_address,
                capabilities_json = excluded.capabilities_json,
                last_seen = excluded.last_seen
            """, (device_id, user_id, name, os_name, companion_version, ip_address, cap_json, perm_json, now))
            conn.commit()
            return self.get_device_by_id(device_id)

    def set_device_status(self, device_id: str, status: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            cursor.execute("UPDATE devices SET status = ?, last_seen = ? WHERE id = ?", (status, now, device_id))
            conn.commit()

    def generate_pairing_code(self, user_id: int) -> Dict[str, Any]:
        import random
        code = f"{random.randint(100000, 999999)}"
        expires = (datetime.now() + timedelta(minutes=10)).isoformat()
        temp_id = f"dev-pair-{uuid.uuid4().hex[:8]}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO devices (id, user_id, name, os, status, pairing_code, pairing_code_expires)
            VALUES (?, ?, 'New Device (Pending)', 'Windows', 'pairing', ?, ?)
            """, (temp_id, user_id, code, expires))
            conn.commit()
            return {"pairing_code": code, "expires_at": expires, "temp_id": temp_id}

    def claim_pairing_code(self, pairing_code: str, device_name: str, os_name: str, companion_version: str = "2.0.0", capabilities: list = None, ip_address: str = None) -> Optional[Dict[str, Any]]:
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("""
            SELECT * FROM devices 
            WHERE pairing_code = ? AND pairing_code_expires > ?
            """, (pairing_code, now)).fetchone()
            if not row:
                return None
            
            user_id = row["user_id"]
            new_device_id = f"dev-{uuid.uuid4().hex[:12]}"
            # Delete temporary pairing stub
            cursor.execute("DELETE FROM devices WHERE id = ?", (row["id"],))
            
            # Register permanent authenticated device
            cap_json = json.dumps(capabilities or ["app_launch", "window_control", "system_telemetry", "file_search", "browser_control"])
            perm_json = json.dumps(["app_launch", "telemetry", "window_control", "file_search"])
            cursor.execute("""
            INSERT INTO devices (id, user_id, name, os, companion_version, status, ip_address, capabilities_json, permissions_json, last_seen)
            VALUES (?, ?, ?, ?, ?, 'online', ?, ?, ?, ?)
            """, (new_device_id, user_id, device_name, os_name, companion_version, ip_address, cap_json, perm_json, now))
            conn.commit()
            
            device_token = f"devtok_{new_device_id}_{uuid.uuid4().hex}"
            return {
                "device_id": new_device_id,
                "user_id": user_id,
                "device_token": device_token,
                "name": device_name,
                "status": "online"
            }

    def delete_device(self, device_id: str, user_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM devices WHERE id = ? AND user_id = ?", (device_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_device_permissions(self, device_id: str, permissions: list) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE devices SET permissions_json = ? WHERE id = ?", (json.dumps(permissions), device_id))
            conn.commit()
            return cursor.rowcount > 0

    # --- Remote Command Tracking ---
    def create_command(self, user_id: int, target_device_id: str, command_type: str, payload: dict) -> Dict[str, Any]:
        cmd_id = f"cmd_{uuid.uuid4().hex[:12]}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO commands (id, user_id, target_device_id, command_type, payload_json, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
            """, (cmd_id, user_id, target_device_id, command_type, json.dumps(payload)))
            conn.commit()
            return {
                "id": cmd_id,
                "user_id": user_id,
                "target_device_id": target_device_id,
                "command_type": command_type,
                "payload": payload,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }

    def update_command_status(self, cmd_id: str, status: str, result: dict = None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            res_json = json.dumps(result or {})
            cursor.execute("""
            UPDATE commands 
            SET status = ?, result_json = ?, completed_at = ?
            WHERE id = ?
            """, (status, res_json, now if status in ('completed', 'failed', 'cancelled') else None, cmd_id))
            conn.commit()

    def get_command(self, cmd_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM commands WHERE id = ?", (cmd_id,)).fetchone()
            if not row:
                return None
            c = dict(row)
            c["payload"] = json.loads(c.get("payload_json") or "{}")
            c["result"] = json.loads(c.get("result_json") or "{}")
            return c

    # --- Persistent Long-Term Memory ---
    def get_memories(self, user_id: int = 1, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM memories WHERE user_id = ?"
            params = [user_id]
            if category:
                query += " AND category = ?"
                params.append(category)
            if search:
                query += " AND (key LIKE ? OR value LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            query += " ORDER BY importance DESC, updated_at DESC"
            rows = cursor.execute(query, params).fetchall()
            return [dict(r) for r in rows]

    def create_memory(self, user_id: int, key: str, value: str, category: str = "preference", importance: int = 3) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO memories (user_id, category, key, value, importance)
            VALUES (?, ?, ?, ?, ?)
            """, (user_id, category, key, value, importance))
            mid = cursor.lastrowid
            conn.commit()
            return {"id": mid, "user_id": user_id, "category": category, "key": key, "value": value, "importance": importance}

    def delete_memory(self, memory_id: int, user_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memories WHERE id = ? AND user_id = ?", (memory_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    # --- Workflows Engine ---
    def get_workflows(self, user_id: int = 1) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM workflows WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
            res = []
            for r in rows:
                wf = dict(r)
                wf["steps"] = json.loads(wf.get("steps_json") or "[]")
                res.append(wf)
            return res

    def get_workflow_by_id(self, wf_id: str) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM workflows WHERE id = ?", (wf_id,)).fetchone()
            if not row:
                return None
            wf = dict(row)
            wf["steps"] = json.loads(wf.get("steps_json") or "[]")
            return wf

    def create_workflow(self, user_id: int, name: str, description: str, steps: list, trigger_type: str = "manual", trigger_value: str = "") -> Dict[str, Any]:
        wf_id = f"wf_{uuid.uuid4().hex[:8]}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO workflows (id, user_id, name, description, trigger_type, trigger_value, steps_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (wf_id, user_id, name, description, trigger_type, trigger_value, json.dumps(steps)))
            conn.commit()
            return self.get_workflow_by_id(wf_id)

    def log_workflow_execution(self, wf_id: str, user_id: int, status: str, summary: str):
        exec_id = f"wfx_{uuid.uuid4().hex[:8]}"
        now = datetime.now().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO workflow_executions (id, workflow_id, user_id, status, output_summary, finished_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (exec_id, wf_id, user_id, status, summary, now))
            cursor.execute("UPDATE workflows SET last_run = ? WHERE id = ?", (now, wf_id))
            conn.commit()

    def get_workflow_executions(self, user_id: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("""
            SELECT e.*, w.name as workflow_name 
            FROM workflow_executions e 
            JOIN workflows w ON e.workflow_id = w.id
            WHERE e.user_id = ?
            ORDER BY e.started_at DESC LIMIT ?
            """, (user_id, limit)).fetchall()
            return [dict(r) for r in rows]

    # --- Agent Execution Logging ---
    def log_agent_execution(self, user_id: int, agent_name: str, task_input: str, output_summary: str, tools: list = None, time_ms: int = 0):
        aid = f"agtx_{uuid.uuid4().hex[:8]}"
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO agent_executions (id, user_id, agent_name, task_input, output_summary, tools_used_json, execution_time_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (aid, user_id, agent_name, task_input, output_summary, json.dumps(tools or []), time_ms))
            conn.commit()

    def get_agent_executions(self, user_id: int = 1, limit: int = 25) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM agent_executions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit)).fetchall()
            res = []
            for r in rows:
                item = dict(r)
                item["tools_used"] = json.loads(item.get("tools_used_json") or "[]")
                res.append(item)
            return res

    # --- Audit Logging ---
    def log_audit(self, user_id: int, action: str, resource_type: str, resource_id: str, details: str, ip: str = "127.0.0.1"):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, action, resource_type, resource_id, details, ip))
            conn.commit()

    def get_audit_logs(self, user_id: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?", (user_id, limit)).fetchall()
            return [dict(r) for r in rows]

    # --- Preferences CRUD ---
    def get_preferences(self) -> Dict[str, str]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT key, value FROM preferences").fetchall()
            return {row["key"]: row["value"] for row in rows}

    def update_preference(self, key: str, value: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
            """, (key, value))
            conn.commit()

    # --- Notes CRUD ---
    def get_notes(self, category: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if category and search:
                query = "SELECT * FROM notes WHERE category = ? AND (title LIKE ? OR content LIKE ?) ORDER BY is_pinned DESC, updated_at DESC"
                pattern = f"%{search}%"
                rows = cursor.execute(query, (category, pattern, pattern)).fetchall()
            elif category:
                query = "SELECT * FROM notes WHERE category = ? ORDER BY is_pinned DESC, updated_at DESC"
                rows = cursor.execute(query, (category,)).fetchall()
            elif search:
                query = "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY is_pinned DESC, updated_at DESC"
                pattern = f"%{search}%"
                rows = cursor.execute(query, (pattern, pattern)).fetchall()
            else:
                rows = cursor.execute("SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC").fetchall()
            return [dict(row) for row in rows]

    def create_note(self, title: str, content: str, category: str = "general", is_pinned: bool = False) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO notes (title, content, category, is_pinned)
            VALUES (?, ?, ?, ?)
            """, (title, content, category, 1 if is_pinned else 0))
            note_id = cursor.lastrowid
            conn.commit()
            return self.get_note_by_id(note_id)

    def get_note_by_id(self, note_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
            return dict(row) if row else None

    def update_note(self, note_id: int, title: str, content: str, category: Optional[str] = None, is_pinned: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            current = self.get_note_by_id(note_id)
            if not current:
                return None
            cat = category if category is not None else current["category"]
            pinned = (1 if is_pinned else 0) if is_pinned is not None else current["is_pinned"]
            cursor.execute("""
            UPDATE notes SET title = ?, content = ?, category = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (title, content, cat, pinned, note_id))
            conn.commit()
            return self.get_note_by_id(note_id)

    def delete_note(self, note_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Tasks CRUD ---
    def get_tasks(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if status:
                rows = cursor.execute("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC", (status,)).fetchall()
            else:
                rows = cursor.execute("SELECT * FROM tasks ORDER BY status ASC, created_at DESC").fetchall()
            return [dict(row) for row in rows]

    def create_task(self, title: str, description: str = "", due_date: Optional[str] = None, priority: str = "medium") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO tasks (title, description, due_date, priority, status)
            VALUES (?, ?, ?, ?, 'pending')
            """, (title, description, due_date, priority))
            task_id = cursor.lastrowid
            conn.commit()
            return self.get_task_by_id(task_id)

    def get_task_by_id(self, task_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            return dict(row) if row else None

    def update_task(self, task_id: int, title: Optional[str] = None, description: Optional[str] = None, due_date: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            current = self.get_task_by_id(task_id)
            if not current:
                return None
            t = title if title is not None else current["title"]
            d = description if description is not None else current["description"]
            dd = due_date if due_date is not None else current["due_date"]
            p = priority if priority is not None else current["priority"]
            s = status if status is not None else current["status"]
            cursor.execute("""
            UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (t, d, dd, p, s, task_id))
            conn.commit()
            return self.get_task_by_id(task_id)

    def delete_task(self, task_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            conn.commit()
            return cursor.rowcount > 0

    # --- Reminders CRUD ---
    def get_reminders(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if status:
                rows = cursor.execute("SELECT * FROM reminders WHERE status = ? ORDER BY remind_at ASC", (status,)).fetchall()
            else:
                rows = cursor.execute("SELECT * FROM reminders ORDER BY remind_at ASC").fetchall()
            return [dict(row) for row in rows]

    def create_reminder(self, title: str, remind_at: str) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO reminders (title, remind_at, status)
            VALUES (?, ?, 'pending')
            """, (title, remind_at))
            rem_id = cursor.lastrowid
            conn.commit()
            return self.get_reminder_by_id(rem_id)

    def get_reminder_by_id(self, rem_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            row = cursor.execute("SELECT * FROM reminders WHERE id = ?", (rem_id,)).fetchone()
            return dict(row) if row else None

    def update_reminder(self, rem_id: int, title: Optional[str] = None, remind_at: Optional[str] = None, status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            current = self.get_reminder_by_id(rem_id)
            if not current:
                return None
            t = title if title is not None else current["title"]
            r = remind_at if remind_at is not None else current["remind_at"]
            s = status if status is not None else current["status"]
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE reminders SET title = ?, remind_at = ?, status = ? WHERE id = ?
            """, (t, r, s, rem_id))
            conn.commit()
            return self.get_reminder_by_id(rem_id)

    def delete_reminder(self, rem_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reminders WHERE id = ?", (rem_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_due_reminders(self, current_iso: str) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("""
            SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= ?
            """, (current_iso,)).fetchall()
            return [dict(row) for row in rows]

    # --- Conversations & History ---
    def get_conversations(self) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM conversations ORDER BY updated_at DESC").fetchall()
            return [dict(row) for row in rows]

    def create_conversation(self, conv_id: str, title: str, folder: str = "Echo Assistant") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR IGNORE INTO conversations (id, title, folder) VALUES (?, ?, ?)
            """, (conv_id, title, folder or "Echo Assistant"))
            conn.commit()
            return {"id": conv_id, "title": title, "folder": folder or "Echo Assistant"}

    def delete_conversation(self, conv_id: str) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("""
            SELECT * FROM conversation_history
            WHERE conversation_id = ?
            ORDER BY id ASC
            LIMIT ?
            """, (conversation_id, limit)).fetchall()
            return [dict(row) for row in rows]

    def add_message(self, conversation_id: str, role: str, content: str, language: str = "en-IN") -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR IGNORE INTO conversations (id, title) VALUES (?, ?)", (conversation_id, f"Chat {conversation_id[:8]}"))
            cursor.execute("""
            INSERT INTO conversation_history (conversation_id, role, content, language)
            VALUES (?, ?, ?, ?)
            """, (conversation_id, role, content, language))
            msg_id = cursor.lastrowid
            cursor.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conversation_id,))
            conn.commit()
            return {"id": msg_id, "conversation_id": conversation_id, "role": role, "content": content, "language": language}

    def clear_conversation(self, conversation_id: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM conversation_history WHERE conversation_id = ?", (conversation_id,))
            conn.commit()

    # --- Command History & App History ---
    def log_command(self, command: str, action_type: str, status: str, details: str = ""):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO command_history (command, action_type, status, details)
            VALUES (?, ?, ?, ?)
            """, (command, action_type, status, details))
            conn.commit()

    def get_recent_commands(self, limit: int = 10) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            rows = cursor.execute("SELECT * FROM command_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in rows]

    def log_app_action(self, app_name: str, action: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO app_history (app_name, action) VALUES (?, ?)", (app_name, action))
            conn.commit()

db = DatabaseService()
