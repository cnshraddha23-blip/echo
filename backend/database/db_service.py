import sqlite3
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

class DatabaseService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "echo.db")
        self.db_path = db_path
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
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
                display_name TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 2. preferences table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 3. conversations table (parent sessions)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 4. conversation_history table (messages)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL, -- 'user', 'assistant', 'system'
                content TEXT NOT NULL,
                language TEXT DEFAULT 'en-IN',
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )
            """)

            # 5. command_history table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS command_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL,
                action_type TEXT NOT NULL,
                status TEXT NOT NULL, -- 'success', 'failed'
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 6. notes table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                is_pinned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 7. tasks table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                due_date TEXT,
                priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
                status TEXT DEFAULT 'pending', -- 'pending', 'completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 8. reminders table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'triggered', 'dismissed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # 9. app_history table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS app_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT NOT NULL,
                action TEXT NOT NULL, -- 'launched', 'closed'
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)

            # Seed default preferences if not present
            defaults = {
                "theme": "light",
                "language": "en-IN",
                "speech_rate": "1.0",
                "assistant_name": "Echo",
                "user_name": "Shivaraj",
                "wake_word_enabled": "true",
                "auto_speak_responses": "true",
                "active_ai_provider": "gemini",
                "ai_model": "gemini-2.5-flash"
            }
            for k, v in defaults.items():
                cursor.execute("INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)", (k, v))
            
            # Seed default conversation session
            cursor.execute("""
            INSERT OR IGNORE INTO conversations (id, title) VALUES ('default', 'Main Session')
            """)

            conn.commit()

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
    def get_notes(self, search: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if search:
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

    def update_task(self, task_id: int, title: Optional[str] = None, description: Optional[str] = None,
                    due_date: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            current = self.get_task_by_id(task_id)
            if not current:
                return None
            t = title if title is not None else current["title"]
            d = description if description is not None else current["description"]
            due = due_date if due_date is not None else current["due_date"]
            p = priority if priority is not None else current["priority"]
            s = status if status is not None else current["status"]
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE tasks SET title = ?, description = ?, due_date = ?, priority = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (t, d, due, p, s, task_id))
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
                rows = cursor.execute("SELECT * FROM reminders ORDER BY status ASC, remind_at ASC").fetchall()
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

    def create_conversation(self, conv_id: str, title: str) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT OR IGNORE INTO conversations (id, title) VALUES (?, ?)
            """, (conv_id, title))
            conn.commit()
            return {"id": conv_id, "title": title}

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
            # Ensure conversation exists
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
