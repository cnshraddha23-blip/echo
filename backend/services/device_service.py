import asyncio
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from backend.database.db_service import db

class DeviceService:
    def __init__(self):
        # Maps device_id -> socket session ID
        self.device_sessions: Dict[str, str] = {}
        # Maps socket session ID -> device_id
        self.session_devices: Dict[str, str] = {}
        # SIO instance set by main.py
        self.sio = None

    def set_sio(self, sio_instance):
        self.sio = sio_instance

    def on_device_connect(self, sid: str, device_id: str, device_name: str, os_name: str, capabilities: list, version: str = "2.0.0", ip: str = "127.0.0.1"):
        self.device_sessions[device_id] = sid
        self.session_devices[sid] = device_id
        db.register_or_update_device(
            device_id=device_id,
            user_id=1,
            name=device_name,
            os_name=os_name,
            companion_version=version,
            capabilities=capabilities,
            ip_address=ip
        )
        print(f"[DeviceService] Device connected: {device_name} ({device_id}) via session {sid}")
        if self.sio:
            asyncio.create_task(self.sio.emit("device_status_change", {
                "device_id": device_id,
                "status": "online",
                "name": device_name,
                "last_seen": datetime.now().isoformat()
            }))

    def on_device_disconnect(self, sid: str):
        device_id = self.session_devices.pop(sid, None)
        if device_id:
            self.device_sessions.pop(device_id, None)
            db.set_device_status(device_id, "offline")
            print(f"[DeviceService] Device disconnected: {device_id}")
            if self.sio:
                asyncio.create_task(self.sio.emit("device_status_change", {
                    "device_id": device_id,
                    "status": "offline",
                    "last_seen": datetime.now().isoformat()
                }))

    def is_device_online(self, device_id: str) -> bool:
        return device_id in self.device_sessions

    async def dispatch_command(self, user_id: int, target_device_id: str, command_type: str, payload: dict, timeout_seconds: int = 15) -> Dict[str, Any]:
        """Dispatches an authenticated, structured command to a paired Echo Companion."""
        # 1. Fetch device record
        device = db.get_device_by_id(target_device_id)
        if not device:
            return {"success": False, "error": f"Target device '{target_device_id}' is not registered."}

        # 2. Check online status
        sid = self.device_sessions.get(target_device_id)
        if not sid or not self.sio:
            return {
                "success": False,
                "error": f"Target device '{device['name']}' is currently offline. Ensure Echo Companion is running on that machine.",
                "device_status": "offline"
            }

        # 3. Check permission
        permissions = device.get("permissions", [])
        authorized = (
            command_type in permissions
            or "all" in permissions
            or command_type == "ping"
            or (command_type in ["launch_app", "close_app"] and any(p in permissions for p in ["app_launch", "window_control", "app_control", "close_app"]))
        )
        if not authorized:
            return {
                "success": False,
                "error": f"Command '{command_type}' is not authorized on {device['name']}. Please enable this permission in Device Settings.",
                "permission_denied": True
            }

        # 4. Create command record
        cmd = db.create_command(user_id, target_device_id, command_type, payload)
        cmd_id = cmd["id"]

        # 5. Send command to Companion over WebSocket
        msg_payload = {
            "command_id": cmd_id,
            "type": command_type,
            "payload": payload,
            "timestamp": datetime.now().isoformat()
        }

        try:
            db.update_command_status(cmd_id, "sent")
            await self.sio.emit("companion_command", msg_payload, room=sid)

            # 6. Wait for result with timeout
            start_time = time.time()
            while time.time() - start_time < timeout_seconds:
                updated_cmd = db.get_command(cmd_id)
                if updated_cmd and updated_cmd.get("status") in ("completed", "failed"):
                    return {
                        "success": updated_cmd["status"] == "completed",
                        "command_id": cmd_id,
                        "device": device["name"],
                        "result": updated_cmd.get("result", {}),
                        "status": updated_cmd["status"]
                    }
                await asyncio.sleep(0.3)

            # If timed out
            db.update_command_status(cmd_id, "failed", {"error": "Device execution timed out"})
            return {"success": False, "error": f"Device '{device['name']}' did not acknowledge execution within {timeout_seconds}s"}
        except Exception as e:
            db.update_command_status(cmd_id, "failed", {"error": str(e)})
            return {"success": False, "error": f"Dispatch error: {str(e)}"}

    def handle_command_result(self, command_id: str, status: str, result: dict):
        """Called when Companion reports command completion back to Echo Cloud."""
        db.update_command_status(command_id, status, result)
        if self.sio:
            asyncio.create_task(self.sio.emit("command_executed", {
                "command_id": command_id,
                "status": status,
                "result": result
            }))

device_service = DeviceService()
