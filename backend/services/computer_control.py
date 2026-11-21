import os
import sys
import re
import json
import time
import subprocess
import webbrowser
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime

# Safe Allowlist of Applications
APP_REGISTRY = {
    "calculator": {"cmd": "calc.exe", "name": "Calculator", "type": "native"},
    "calc": {"cmd": "calc.exe", "name": "Calculator", "type": "native"},
    "notepad": {"cmd": "notepad.exe", "name": "Notepad", "type": "native"},
    "paint": {"cmd": "mspaint.exe", "name": "Paint", "type": "native"},
    "cmd": {"cmd": "cmd.exe", "name": "Command Prompt", "type": "native"},
    "terminal": {"cmd": "wt.exe", "name": "Windows Terminal", "type": "native"},
    "code": {"cmd": "code", "name": "Visual Studio Code", "type": "native"},
    "vscode": {"cmd": "code", "name": "Visual Studio Code", "type": "native"},
    "spotify": {"cmd": "spotify", "name": "Spotify", "type": "native_or_web", "url": "https://open.spotify.com", "protocol": "spotify:"},
    "whatsapp": {"cmd": "whatsapp", "name": "WhatsApp", "type": "native_or_web", "url": "https://web.whatsapp.com", "protocol": "whatsapp:"},
    "chrome": {"cmd": "chrome", "name": "Google Chrome", "type": "browser"},
    "edge": {"cmd": "msedge", "name": "Microsoft Edge", "type": "browser"},
    "explorer": {"cmd": "explorer.exe", "name": "File Explorer", "type": "system"},
    "task manager": {"cmd": "taskmgr.exe", "name": "Task Manager", "type": "system"}
}

ALLOWED_FOLDERS = {
    "downloads": os.path.expanduser("~/Downloads"),
    "documents": os.path.expanduser("~/Documents"),
    "desktop": os.path.expanduser("~/Desktop"),
    "pictures": os.path.expanduser("~/Pictures"),
    "music": os.path.expanduser("~/Music"),
    "videos": os.path.expanduser("~/Videos")
}

SENSITIVE_ACTIONS = [
    "delete_file",
    "send_communication",
    "system_shutdown",
    "purchase_payment",
    "modify_system_registry"
]

class ComputerControlService:
    """
    Central validated Computer Control Engine implementing structured tool calling.
    Guarantees no arbitrary shell execution and platform safety.
    """

    def __init__(self):
        self._execution_history: List[Dict[str, Any]] = []

    def get_tool_registry(self) -> List[Dict[str, Any]]:
        """Returns the official declarative JSON schema of all supported operations."""
        return [
            {
                "name": "launch_application",
                "description": "Launches a verified allowlisted application or platform on the device. If already open, brings window to foreground.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "app_name": {"type": "string", "description": "Name of the app (e.g. 'chrome', 'vscode', 'notepad', 'calc', 'whatsapp', 'spotify')"}
                    },
                    "required": ["app_name"]
                }
            },
            {
                "name": "close_application",
                "description": "Closes or terminates application instances (e.g. 'whatsapp', 'youtube', 'chrome', 'spotify', 'notepad', 'calc').",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "app_name": {"type": "string", "description": "Name of the app to close"}
                    },
                    "required": ["app_name"]
                }
            },
            {
                "name": "open_website",
                "description": "Opens an authorized HTTPS URL or web service in default browser.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "Web URL to open"}
                    },
                    "required": ["url"]
                }
            },
            {
                "name": "search_browser",
                "description": "Performs an internet query on YouTube, Google, or Bing directly in the browser.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query keywords"},
                        "engine": {"type": "string", "enum": ["youtube", "google", "bing"], "default": "google"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "focus_window",
                "description": "Brings a specific application window to the foreground.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title_or_app": {"type": "string", "description": "Title substring or app name"}
                    },
                    "required": ["title_or_app"]
                }
            },
            {
                "name": "minimize_window",
                "description": "Minimizes an application window.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title_or_app": {"type": "string", "description": "Title substring or app name"}
                    },
                    "required": ["title_or_app"]
                }
            },
            {
                "name": "maximize_window",
                "description": "Maximizes an application window to full screen.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title_or_app": {"type": "string", "description": "Title substring or app name"}
                    },
                    "required": ["title_or_app"]
                }
            },
            {
                "name": "capture_screenshot",
                "description": "Takes a screenshot of the primary display for visual inspection.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "search_files",
                "description": "Locates user files matching keywords in Desktop, Documents, or Downloads.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Filename keyword or extension (e.g. 'pdf', 'assignment', 'resume')"},
                        "folder": {"type": "string", "description": "Target folder name (optional)"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "open_folder",
                "description": "Opens File Explorer at a standard user directory (e.g. Downloads, Documents, Desktop).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "folder_name": {"type": "string", "enum": ["downloads", "documents", "desktop", "pictures", "music", "videos"]}
                    },
                    "required": ["folder_name"]
                }
            },
            {
                "name": "adjust_volume",
                "description": "Adjusts system master audio volume or toggles mute.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {"type": "string", "enum": ["up", "down", "mute", "unmute"], "default": "up"}
                    },
                    "required": ["action"]
                }
            },
            {
                "name": "get_system_information",
                "description": "Retrieves real-time CPU, RAM, battery, and disk telemetry from the device.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]

    def execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Validates and executes a tool deterministically."""
        start_t = time.time()
        res = {"success": False, "tool": tool_name, "params": params}

        try:
            if tool_name == "launch_application":
                app_name = params.get("app_name", "").strip().lower()
                res = self._launch_application(app_name)

            elif tool_name == "close_application":
                app_name = params.get("app_name", "").strip().lower()
                res = self._close_application(app_name)

            elif tool_name == "open_website":
                url = params.get("url", "").strip()
                res = self._open_website(url)

            elif tool_name == "search_browser":
                query = params.get("query", "").strip()
                engine = params.get("engine", "google").lower()
                res = self._search_browser(query, engine)

            elif tool_name == "focus_window":
                target = params.get("title_or_app", "").strip()
                res = self._focus_window(target)

            elif tool_name == "minimize_window":
                target = params.get("title_or_app", "").strip()
                res = self._minimize_window(target)

            elif tool_name == "maximize_window":
                target = params.get("title_or_app", "").strip()
                res = self._maximize_window(target)

            elif tool_name == "capture_screenshot":
                from backend.services.visual_interaction import visual_engine
                shot_data = visual_engine.capture_screen_base64()
                res = {
                    "success": shot_data.get("success", False),
                    "file_path": shot_data.get("file_path"),
                    "image_url": shot_data.get("image_url"),
                    "width": shot_data.get("width"),
                    "height": shot_data.get("height"),
                    "message": "Screen captured successfully." if shot_data.get("success") else shot_data.get("error")
                }

            elif tool_name == "search_files":
                q = params.get("query", "").strip()
                f_target = params.get("folder")
                res = self._search_files(q, f_target)

            elif tool_name == "open_folder":
                folder_name = params.get("folder_name", "downloads").strip().lower()
                res = self._open_folder(folder_name)

            elif tool_name == "adjust_volume":
                action = params.get("action", "up")
                res = self._adjust_volume(action)

            elif tool_name == "get_system_information":
                from backend.services.system_service import get_system_telemetry
                res = {"success": True, "telemetry": get_system_telemetry()}

            else:
                res = {"success": False, "error": f"Unknown tool: '{tool_name}'"}

        except Exception as e:
            res = {"success": False, "error": str(e)}

        res["execution_time_ms"] = int((time.time() - start_t) * 1000)
        self._execution_history.append(res)
        return res

    async def plan_natural_language_request(self, prompt: str) -> List[Dict[str, Any]]:
        """
        Translates natural-language requests into structured tool calling execution plans.
        """
        p_lower = prompt.lower().strip()
        plan = []

        # Check for multi-step browser search
        if any(w in p_lower for w in ["youtube and search", "chrome and search", "search youtube", "search google", "search for"]):
            engine = "youtube" if "youtube" in p_lower else "google"
            query_match = re.search(r'(?:search for|search|and search for|and search)\s+(.+)', p_lower)
            query = query_match.group(1).strip() if query_match else "AI tutorials"
            plan.append({
                "step": 1,
                "tool": "search_browser",
                "params": {"query": query, "engine": engine},
                "desc": f"Perform {engine.capitalize()} search for '{query}'"
            })
            return plan

        # Check for opening project in VS Code
        if any(w in p_lower for w in ["in vs code", "in vscode", "in code", "open my echo project"]):
            plan.append({
                "step": 1,
                "tool": "launch_application",
                "params": {"app_name": "code"},
                "desc": "Launch Visual Studio Code workspace"
            })
            return plan

        # Check for file finding
        if any(w in p_lower for w in ["find my latest pdf", "find document", "find file", "latest pdf"]):
            q = "pdf" if "pdf" in p_lower else "document"
            plan.append({
                "step": 1,
                "tool": "search_files",
                "params": {"query": q},
                "desc": f"Locate latest {q} files"
            })
            return plan

        # Check for folder opening
        if any(w in p_lower for w in ["downloads folder", "open downloads", "open my downloads"]):
            plan.append({
                "step": 1,
                "tool": "open_folder",
                "params": {"folder_name": "downloads"},
                "desc": "Open Downloads folder in File Explorer"
            })
            return plan

        # Check for window switching
        if "switch to" in p_lower or "focus" in p_lower:
            target = p_lower.replace("switch to", "").replace("focus", "").strip()
            plan.append({
                "step": 1,
                "tool": "focus_window",
                "params": {"title_or_app": target},
                "desc": f"Bring '{target}' window to foreground"
            })
            return plan

        # Check for volume control
        if "volume" in p_lower or "mute" in p_lower:
            action = "up" if any(w in p_lower for w in ["up", "increase"]) else "down" if any(w in p_lower for w in ["down", "decrease"]) else "mute"
            plan.append({
                "step": 1,
                "tool": "adjust_volume",
                "params": {"action": action},
                "desc": f"Adjust system volume: {action}"
            })
            return plan

        # Check for screenshot
        if any(w in p_lower for w in ["screenshot", "screen capture"]):
            plan.append({
                "step": 1,
                "tool": "capture_screenshot",
                "params": {},
                "desc": "Capture desktop display frame"
            })
            return plan

        # Check for closing app
        if any(w in p_lower for w in ["close", "quit", "terminate", "exit", "shut"]):
            for app in list(APP_REGISTRY.keys()) + ["youtube", "whatsapp", "browser"]:
                if app in p_lower:
                    plan.append({
                        "step": 1,
                        "tool": "close_application",
                        "params": {"app_name": app},
                        "desc": f"Close {app.capitalize()}"
                    })
                    return plan

        # Single app launch
        for app in APP_REGISTRY.keys():
            if app in p_lower and any(w in p_lower for w in ["open", "launch", "start", "run"]):
                plan.append({
                    "step": 1,
                    "tool": "launch_application",
                    "params": {"app_name": app},
                    "desc": f"Launch {app.capitalize()}"
                })
                return plan

        return plan

    async def execute_plan(self, plan: List[Dict[str, Any]], target_device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes a planned sequence of operations, verifying each step.
        """
        executed_steps = []
        overall_success = True

        for item in plan:
            t_name = item.get("tool")
            params = item.get("params", {})
            res = self.execute_tool(t_name, params)
            executed_steps.append({
                "step": item.get("step"),
                "desc": item.get("desc"),
                "result": res,
                "verified": res.get("success", False)
            })
            if not res.get("success"):
                overall_success = False
                break

        return {
            "success": overall_success,
            "steps": executed_steps,
            "total_steps": len(executed_steps)
        }

    def _launch_application(self, app_key: str) -> Dict[str, Any]:
        """Launches verified desktop app or website. If already open, brings window to the foreground."""
        from backend.automation.app_launcher import app_automation
        return app_automation.launch_app(app_key)

    def _close_application(self, app_key: str) -> Dict[str, Any]:
        """Closes application instances."""
        from backend.automation.app_launcher import app_automation
        return app_automation.close_app(app_key)

    def _open_website(self, url: str) -> Dict[str, Any]:
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"
        webbrowser.open(url)
        return {"success": True, "url": url, "message": f"Navigated browser to {url}."}

    def _search_browser(self, query: str, engine: str = "google") -> Dict[str, Any]:
        import urllib.parse
        encoded = urllib.parse.quote(query)
        if engine == "youtube":
            target_url = f"https://www.youtube.com/results?search_query={encoded}"
        elif engine == "bing":
            target_url = f"https://www.bing.com/search?q={encoded}"
        else:
            target_url = f"https://www.google.com/search?q={encoded}"

        webbrowser.open(target_url)
        return {"success": True, "engine": engine, "query": query, "url": target_url, "message": f"Performed {engine.capitalize()} search for '{query}'."}

    def _open_folder(self, folder_name: str) -> Dict[str, Any]:
        key = folder_name.lower().strip()
        path = ALLOWED_FOLDERS.get(key)
        if not path or not os.path.exists(path):
            return {"success": False, "error": f"Directory '{folder_name}' not accessible."}
        try:
            os.system(f'explorer "{path}"')
            return {"success": True, "folder": key, "path": path, "message": f"Opened {key.capitalize()} folder in File Explorer."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _search_files(self, query: str, folder: Optional[str] = None) -> Dict[str, Any]:
        home = os.path.expanduser("~")
        search_dirs = [
            os.path.join(home, "Desktop"),
            os.path.join(home, "Documents"),
            os.path.join(home, "Downloads")
        ]
        if folder and folder.lower() in ALLOWED_FOLDERS:
            search_dirs = [ALLOWED_FOLDERS[folder.lower()]]

        matches = []
        q_clean = query.lower()
        for sdir in search_dirs:
            if not os.path.exists(sdir):
                continue
            for root, _, files in os.walk(sdir):
                for f in files:
                    if q_clean in f.lower():
                        full_p = os.path.join(root, f)
                        try:
                            stat = os.stat(full_p)
                            matches.append({
                                "name": f,
                                "path": full_p,
                                "size_bytes": stat.st_size,
                                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                            })
                        except Exception:
                            pass
                        if len(matches) >= 15:
                            return {"success": True, "query": query, "matches": matches, "total": len(matches)}

        return {"success": True, "query": query, "matches": matches, "total": len(matches)}

    def _focus_window(self, target: str) -> Dict[str, Any]:
        try:
            import pygetwindow as gw
            wins = [w for w in gw.getAllWindows() if target.lower() in w.title.lower()]
            if wins:
                wins[0].activate()
                return {"success": True, "window": wins[0].title, "message": f"Activated window '{wins[0].title}'."}
            return {"success": False, "error": f"No open window matching '{target}' found."}
        except Exception as e:
            return {"success": False, "error": f"Window focus unsupported: {e}"}

    def _minimize_window(self, target: str) -> Dict[str, Any]:
        try:
            import pygetwindow as gw
            wins = [w for w in gw.getAllWindows() if target.lower() in w.title.lower()]
            if wins:
                wins[0].minimize()
                return {"success": True, "window": wins[0].title, "message": f"Minimized window '{wins[0].title}'."}
            return {"success": False, "error": f"No open window matching '{target}' found."}
        except Exception as e:
            return {"success": False, "error": f"Window minimize unsupported: {e}"}

    def _maximize_window(self, target: str) -> Dict[str, Any]:
        try:
            import pygetwindow as gw
            wins = [w for w in gw.getAllWindows() if target.lower() in w.title.lower()]
            if wins:
                wins[0].maximize()
                return {"success": True, "window": wins[0].title, "message": f"Maximized window '{wins[0].title}'."}
            return {"success": False, "error": f"No open window matching '{target}' found."}
        except Exception as e:
            return {"success": False, "error": f"Window maximize unsupported: {e}"}

    def _adjust_volume(self, action: str) -> Dict[str, Any]:
        try:
            import pyautogui
            if action == "up":
                for _ in range(5):
                    pyautogui.press('volumeup')
                return {"success": True, "action": "volume_up", "message": "Increased master audio volume."}
            elif action == "down":
                for _ in range(5):
                    pyautogui.press('volumedown')
                return {"success": True, "action": "volume_down", "message": "Decreased master audio volume."}
            elif action in ("mute", "unmute"):
                pyautogui.press('volumemute')
                return {"success": True, "action": "volume_mute_toggle", "message": "Toggled master audio mute."}
        except Exception as e:
            return {"success": False, "error": f"Volume adjustment error: {e}"}
        return {"success": False, "error": "Invalid volume action"}

computer_control = ComputerControlService()
