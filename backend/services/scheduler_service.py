import asyncio
import threading
import time
from datetime import datetime
from typing import Callable, List
from backend.database.db_service import db

class ReminderScheduler:
    def __init__(self, check_interval: int = 10):
        self.check_interval = check_interval
        self.is_running = False
        self._thread = None
        self._callbacks: List[Callable[[dict], None]] = []

    def register_trigger_callback(self, cb: Callable[[dict], None]):
        self._callbacks.append(cb)

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        print("[ReminderScheduler] Background daemon started.")

    def stop(self):
        self.is_running = False

    def _run_loop(self):
        while self.is_running:
            try:
                now_iso = datetime.now().strftime("%Y-%m-%dT%H:%M")
                due = db.get_due_reminders(now_iso)
                for reminder in due:
                    # Update status to triggered
                    db.update_reminder(reminder["id"], status="triggered")
                    print(f"[Reminder Triggered]: {reminder['title']}")
                    for cb in self._callbacks:
                        try:
                            cb(reminder)
                        except Exception as e:
                            print(f"[Reminder Callback Error]: {e}")
            except Exception as loop_err:
                print(f"[ReminderScheduler Exception]: {loop_err}")
            time.sleep(self.check_interval)

reminder_scheduler = ReminderScheduler()
