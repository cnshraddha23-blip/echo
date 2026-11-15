import os
import subprocess
import psutil
import webbrowser
from typing import Dict, Any, List, Optional

# Safe allowlist of applications mapping keywords to executable command/path
APP_ALLOWLIST = {
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "notepad": "notepad.exe",
    "paint": "mspaint.exe",
    "mspaint": "mspaint.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "terminal": "wt.exe",
    "code": "code",
    "vscode": "code",
    "vs code": "code",
    "chrome": "chrome",
    "browser": "start",
    "edge": "msedge"
}

ALLOWED_WEBSITES = {
    "youtube": "https://www.youtube.com",
    "google": "https://www.google.com",
    "gmail": "https://mail.google.com",
    "github": "https://github.com",
    "wikipedia": "https://www.wikipedia.org"
}

class AppAutomation:
    def __init__(self):
        self.launched_processes: Dict[str, psutil.Process] = {}

    def get_allowed_apps(self) -> List[Dict[str, str]]:
        unique_apps = [
            {"name": "Calculator", "id": "calculator", "type": "tool", "desc": "Windows Calculator"},
            {"name": "Notepad", "id": "notepad", "type": "tool", "desc": "Text editor"},
            {"name": "Paint", "id": "paint", "type": "tool", "desc": "MS Paint graphics"},
            {"name": "Command Prompt", "id": "cmd", "type": "system", "desc": "Terminal"},
            {"name": "VS Code", "id": "vscode", "type": "developer", "desc": "Code editor"},
            {"name": "Browser", "id": "browser", "type": "web", "desc": "Default Web Browser"},
            {"name": "YouTube", "id": "youtube", "type": "web", "desc": "YouTube Media"},
            {"name": "Google", "id": "google", "type": "web", "desc": "Google Search"},
            {"name": "Gmail", "id": "gmail", "type": "web", "desc": "Google Mail"}
        ]
        return unique_apps

    def launch_app(self, app_key: str) -> Dict[str, Any]:
        app_key_clean = app_key.lower().strip()
        
        # Check website shortcuts first
        if app_key_clean in ALLOWED_WEBSITES:
            url = ALLOWED_WEBSITES[app_key_clean]
            webbrowser.open(url)
            return {"success": True, "app": app_key_clean, "type": "url", "target": url, "message": f"Opened {app_key_clean.capitalize()} in your browser"}

        # Check application allowlist
        if app_key_clean not in APP_ALLOWLIST:
            return {"success": False, "app": app_key, "error": f"'{app_key}' is not in the safe application allowlist."}

        exe_cmd = APP_ALLOWLIST[app_key_clean]

        try:
            # Safe process spawn without shell=True to prevent command injection
            proc = subprocess.Popen([exe_cmd], shell=False)
            p = psutil.Process(proc.pid)
            self.launched_processes[app_key_clean] = p
            return {
                "success": True,
                "app": app_key_clean,
                "pid": proc.pid,
                "message": f"Successfully launched {app_key_clean.capitalize()}."
            }
        except FileNotFoundError:
            # Fallback for Windows Shell commands (like 'start' or 'calc')
            try:
                os.system(f"start {exe_cmd}")
                return {"success": True, "app": app_key_clean, "message": f"Started {app_key_clean.capitalize()} via system shell."}
            except Exception as e:
                return {"success": False, "error": f"Could not launch executable {exe_cmd}: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": f"Error launching {app_key_clean}: {str(e)}"}

    def close_app(self, app_key: str) -> Dict[str, Any]:
        app_key_clean = app_key.lower().strip()
        if app_key_clean not in APP_ALLOWLIST:
            return {"success": False, "error": f"'{app_key}' is not an authorized application."}

        exe_name = APP_ALLOWLIST[app_key_clean].replace(".exe", "").lower()
        terminated = 0
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                pname = (proc.info['name'] or '').lower()
                if exe_name in pname or pname.startswith(exe_name):
                    try:
                        proc.terminate()
                        terminated += 1
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

            if terminated > 0:
                return {"success": True, "app": app_key_clean, "message": f"Closed {terminated} instance(s) of {app_key_clean}."}
            else:
                return {"success": False, "message": f"No running instance of {app_key_clean} found."}
        except Exception as e:
            return {"success": False, "error": f"Failed to close {app_key_clean}: {str(e)}"}

    def open_web_search(self, query: str) -> Dict[str, Any]:
        if not query:
            return {"success": False, "error": "Search query cannot be empty"}
        import urllib.parse
        encoded = urllib.parse.quote(query)
        url = f"https://www.google.com/search?q={encoded}"
        webbrowser.open(url)
        return {"success": True, "query": query, "url": url, "message": f"Searching Google for '{query}'"}

    def open_youtube_search(self, query: str) -> Dict[str, Any]:
        if not query:
            return {"success": False, "error": "Search query cannot be empty"}
        import urllib.parse
        encoded = urllib.parse.quote(query)
        url = f"https://www.youtube.com/results?search_query={encoded}"
        webbrowser.open(url)
        return {"success": True, "query": query, "url": url, "message": f"Searching YouTube for '{query}'"}

app_automation = AppAutomation()
