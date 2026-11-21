import os
import sys

# Ensure both companion directory and repository root are in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

import json
import time
import socket
import argparse
from typing import Optional, Dict, Any, List
import requests
import socketio

try:
    from companion.app_controller import app_controller
except ImportError:
    from app_controller import app_controller

CONFIG_PATH = os.path.expanduser("~/.echo_companion_config.json")

def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_config(config: dict):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"[Echo Companion] Failed to save config: {e}")

class EchoCompanionClient:
    def __init__(self, server_url: str = None, device_name: str = None):
        self.config = load_config()
        self.server_url = (server_url or self.config.get("server_url") or "https://echo-ai-assistant.embarko.app").rstrip("/")
        self.device_name = device_name or self.config.get("device_name") or socket.gethostname()
        self.device_id = self.config.get("device_id")
        self.device_token = self.config.get("device_token")
        self.sio = socketio.Client(reconnection=True, reconnection_attempts=0, reconnection_delay=3)
        self.setup_handlers()
        self.status_callback = None

    def set_status_callback(self, cb):
        self.status_callback = cb

    def _log(self, msg: str):
        print(f"[Echo Companion] {msg}")
        if self.status_callback:
            self.status_callback(msg)

    def pair_with_code(self, pairing_code: str, server_url: Optional[str] = None) -> bool:
        """Exchanges an expiring 6-digit code for permanent authenticated device credentials."""
        target_url = (server_url or self.server_url).rstrip("/")
        
        servers_to_try = [target_url]
        fallback = "https://echo-ai-assistant.embarko.app" if ("127.0.0.1" in target_url or "localhost" in target_url) else "http://127.0.0.1:5000"
        if fallback not in servers_to_try:
            servers_to_try.append(fallback)

        payload = {
            "pairing_code": pairing_code.strip(),
            "device_name": self.device_name,
            "os_name": "Windows" if sys.platform == "win32" else sys.platform.capitalize(),
            "companion_version": "2.0.0",
            "capabilities": ["app_launch", "window_control", "system_telemetry", "file_search"]
        }

        last_error = ""
        for srv in servers_to_try:
            url = f"{srv}/api/devices/pair"
            try:
                self._log(f"Submitting pairing code to {url}...")
                res = requests.post(url, json=payload, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    self.device_id = data["device_id"]
                    self.device_token = data.get("device_token")
                    self.server_url = srv
                    self.config["device_id"] = self.device_id
                    self.config["device_token"] = self.device_token
                    self.config["server_url"] = self.server_url
                    save_config(self.config)
                    self._log(f"Successfully paired to {srv}! Device ID: {self.device_id}")
                    return True
                else:
                    last_error = res.text
                    self._log(f"Pairing at {srv} returned: {res.text}")
            except Exception as e:
                last_error = str(e)
                self._log(f"Pairing connection error to {srv}: {e}")

        self._log(f"Pairing failed across target servers: {last_error}")
        return False

    def setup_handlers(self):
        @self.sio.event
        def connect():
            self._log(f"Connected to Echo Cloud ({self.server_url})")
            # Handshake with Echo Cloud
            handshake_payload = {
                "device_id": self.device_id or f"unpaired-{socket.gethostname()}",
                "name": self.device_name,
                "os": "Windows" if sys.platform == "win32" else sys.platform.capitalize(),
                "version": "2.0.0",
                "capabilities": [
                    "app_launch", "window_control", "system_telemetry", "file_search", 
                    "browser_control", "screenshot_capture", "ui_interaction", "volume_control"
                ]
            }
            self.sio.emit("companion_handshake", handshake_payload)

        @self.sio.event
        def disconnect():
            self._log("Disconnected from Echo Cloud. Retrying in background...")

        @self.sio.on("companion_command")
        def on_command(data):
            cmd_id = data.get("command_id")
            cmd_type = data.get("type")
            payload = data.get("payload", {})
            self._log(f"Received Command [{cmd_type}] ID: {cmd_id}")

            result = {}
            status = "completed"

            try:
                if cmd_type == "launch_app":
                    app_name = payload.get("app", "calc")
                    result = app_controller.launch_app(app_name)
                    if not result.get("success"):
                        status = "failed"
                elif cmd_type == "close_app":
                    app_name = payload.get("app", "")
                    result = app_controller.close_app(app_name)
                elif cmd_type == "capture_screenshot":
                    result = app_controller.capture_screenshot()
                    if not result.get("success"):
                        status = "failed"
                elif cmd_type == "interact_ui":
                    action = payload.get("action", "click")
                    center = payload.get("center", [0.5, 0.5])
                    text = payload.get("text", "")
                    key = payload.get("key", "enter")
                    amount = payload.get("amount", -300)
                    result = app_controller.interact_ui(action, center, text, key, amount)
                elif cmd_type == "search_browser":
                    q = payload.get("query", "")
                    engine = payload.get("engine", "google")
                    result = app_controller.search_browser(q, engine)
                elif cmd_type == "open_folder":
                    folder = payload.get("folder_name", "downloads")
                    result = app_controller.open_folder(folder)
                elif cmd_type == "adjust_volume":
                    action = payload.get("action", "up")
                    result = app_controller.adjust_volume(action)
                elif cmd_type == "get_telemetry" or cmd_type == "telemetry":
                    result = app_controller.get_system_telemetry()
                elif cmd_type == "search_files":
                    kw = payload.get("query", "")
                    result = {"files": app_controller.search_local_files(kw)}
                elif cmd_type == "ping":
                    result = {"status": "pong", "device": self.device_name}
                else:
                    status = "failed"
                    result = {"error": f"Unknown command type: {cmd_type}"}
            except Exception as e:
                status = "failed"
                result = {"error": str(e)}

            # Send execution outcome back to Echo Cloud
            self._log(f"Command [{cmd_type}] finished -> {status}")
            self.sio.emit("companion_command_result", {
                "command_id": cmd_id,
                "status": status,
                "result": result
            })

    def run(self):
        """Starts socket connection loop."""
        try:
            self._log(f"Starting Echo Companion for device: '{self.device_name}'")
            self._log(f"Target Echo Cloud Brain: {self.server_url}")
            self.sio.connect(self.server_url, transports=['websocket', 'polling'])
            self.sio.wait()
        except KeyboardInterrupt:
            self._log("Exiting...")
            self.sio.disconnect()
        except Exception as e:
            self._log(f"Connection failed: {e}")

def main():
    parser = argparse.ArgumentParser(description="Echo Companion - Local Device Agent for Windows")
    parser.add_argument("--server", default="http://127.0.0.1:5000", help="Echo Cloud server URL")
    parser.add_argument("--pair-code", default=None, help="6-digit pairing code from Echo Web")
    parser.add_argument("--name", default=None, help="Device display name")
    parser.add_argument("--gui", action="store_true", help="Launch interactive graphical window")
    args = parser.parse_args()

    client = EchoCompanionClient(server_url=args.server, device_name=args.name)

    if args.pair_code:
        success = client.pair_with_code(args.pair_code)
        if not success:
            sys.exit(1)

    if args.gui:
        try:
            try:
                from companion.companion_gui import run_gui
            except ImportError:
                from companion_gui import run_gui
            run_gui(client)
            return
        except Exception as e:
            print(f"[Echo Companion] GUI launch error: {e}. Falling back to CLI mode.")

    client.run()

if __name__ == "__main__":
    main()
