import os
import sys
import subprocess
import webbrowser
import psutil
from typing import Dict, Any, List, Optional

APP_ALLOWLIST = {
    "calculator": "calc.exe",
    "calc": "calc.exe",
    "notepad": "notepad.exe",
    "paint": "mspaint.exe",
    "cmd": "cmd.exe",
    "terminal": "wt.exe",
    "code": "code",
    "vscode": "code",
    "spotify": "spotify",
    "chrome": "chrome",
    "edge": "msedge",
    "explorer": "explorer.exe",
    "task manager": "taskmgr.exe"
}

ALLOWED_WEBSITES = {
    "whatsapp": "https://web.whatsapp.com",
    "instagram": "https://www.instagram.com",
    "youtube": "https://www.youtube.com",
    "spotify": "https://open.spotify.com",
    "google": "https://www.google.com",
    "github": "https://github.com"
}

APP_WINDOW_PATTERNS = {
    "whatsapp": {"proc": ["whatsapp.exe", "whatsappdesktop.exe", "whatsapp.root.exe"], "title": ["whatsapp"]},
    "youtube": {"proc": [], "title": ["youtube"]},
    "spotify": {"proc": ["spotify.exe"], "title": ["spotify"]},
    "chrome": {"proc": ["chrome.exe"], "title": ["google chrome", "chrome"]},
    "edge": {"proc": ["msedge.exe"], "title": ["microsoft edge", "edge"]},
    "code": {"proc": ["code.exe"], "title": ["visual studio code", "code"]},
    "vscode": {"proc": ["code.exe"], "title": ["visual studio code", "code"]},
    "notepad": {"proc": ["notepad.exe"], "title": ["notepad"]},
    "calculator": {"proc": ["calculatorapp.exe", "calculator.exe", "calc.exe"], "title": ["calculator"]},
    "calc": {"proc": ["calculatorapp.exe", "calculator.exe", "calc.exe"], "title": ["calculator"]}
}

class AppController:
    def __init__(self):
        self.launched_pids: List[int] = []

    def popup_if_open(self, app_name: str) -> bool:
        """If application is already open, restores and brings window to front."""
        clean = app_name.strip().lower()
        pattern = APP_WINDOW_PATTERNS.get(clean, {})
        titles = pattern.get("title", [clean])
        procs = pattern.get("proc", [])

        if sys.platform == "win32":
            try:
                import win32gui, win32con, win32process
                matches = []
                def enum_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        for t in titles:
                            if t in w_title:
                                matches.append(hwnd)
                                return True
                        if procs:
                            try:
                                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                                p = psutil.Process(pid)
                                if p.name().lower() in procs:
                                    matches.append(hwnd)
                                    return True
                            except Exception:
                                pass
                    return True

                win32gui.EnumWindows(enum_cb, None)
                if matches:
                    h = matches[0]
                    win32gui.ShowWindow(h, win32con.SW_RESTORE)
                    win32gui.ShowWindow(h, win32con.SW_SHOW)
                    win32gui.BringWindowToTop(h)
                    win32gui.SetForegroundWindow(h)
                    return True
            except Exception:
                pass

            try:
                import win32com.client
                ws = win32com.client.Dispatch("WScript.Shell")
                for t in titles:
                    if ws.AppActivate(t):
                        return True
            except Exception:
                pass

        if procs:
            for p in psutil.process_iter(['name']):
                try:
                    if (p.info['name'] or '').lower() in procs:
                        return True
                except Exception:
                    pass

        return False

    def launch_app(self, app_name: str) -> Dict[str, Any]:
        """Launches an allowlisted desktop app or platform URL on the local host."""
        key = app_name.strip().lower()
        
        # Requirement: If app is already opened, popup again
        if self.popup_if_open(key):
            return {
                "success": True, 
                "app": key.capitalize(), 
                "popped_up": True, 
                "message": f"{key.capitalize()} was already running; brought window to front."
            }

        if key == "whatsapp":
            try:
                ret = os.system("start whatsapp:")
                if ret == 0:
                    return {"success": True, "app": "WhatsApp", "mode": "protocol", "popped_up": False, "message": "WhatsApp desktop launched."}
            except Exception:
                pass
            webbrowser.open(ALLOWED_WEBSITES["whatsapp"])
            return {"success": True, "app": "WhatsApp", "mode": "web", "popped_up": False, "message": "WhatsApp Web launched."}

        if key == "spotify":
            try:
                ret = os.system("start spotify:")
                if ret == 0:
                    return {"success": True, "app": "Spotify", "mode": "protocol", "popped_up": False, "message": "Spotify application launched."}
            except Exception:
                pass
            webbrowser.open(ALLOWED_WEBSITES["spotify"])
            return {"success": True, "app": "Spotify", "mode": "web", "popped_up": False, "message": "Spotify Web launched."}

        if key in ALLOWED_WEBSITES:
            url = ALLOWED_WEBSITES[key]
            webbrowser.open(url)
            return {"success": True, "app": key.capitalize(), "mode": "web", "url": url, "popped_up": False}

        if key in APP_ALLOWLIST:
            cmd = APP_ALLOWLIST[key]
            try:
                proc = subprocess.Popen([cmd], shell=False)
                self.launched_pids.append(proc.pid)
                return {"success": True, "app": key.capitalize(), "pid": proc.pid, "mode": "native", "popped_up": False}
            except Exception:
                try:
                    os.system(f"start {cmd}")
                    return {"success": True, "app": key.capitalize(), "mode": "shell", "popped_up": False}
                except Exception as e:
                    return {"success": False, "error": f"Failed to launch {cmd}: {str(e)}"}

        return {"success": False, "error": f"Application '{app_name}' is not in the companion allowlist."}

    def close_app(self, app_name: str) -> Dict[str, Any]:
        """Closes application instances."""
        key = app_name.strip().lower()

        # Generic "close app" / "close window"
        if key in ["app", "apps", "the app", "the apps", "current app", "window", "active", ""]:
            if sys.platform == "win32":
                try:
                    import win32gui, win32con
                    hwnd = win32gui.GetForegroundWindow()
                    if hwnd:
                        title = win32gui.GetWindowText(hwnd)
                        win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
                        return {"success": True, "app": title or "Active Window", "closed_instances": 1, "message": f"Closed active window ({title})."}
                except Exception:
                    pass

        pattern = APP_WINDOW_PATTERNS.get(key, {})
        procs = pattern.get("proc", [])
        titles = pattern.get("title", [key])

        if not procs and key in APP_ALLOWLIST:
            procs = [APP_ALLOWLIST[key].replace(".exe", "").lower() + ".exe"]

        terminated = 0

        # Special tab closing for YouTube and WhatsApp Web
        if key in ["youtube", "whatsapp"] and sys.platform == "win32":
            try:
                import win32gui, win32con, win32com.client
                ws = win32com.client.Dispatch("WScript.Shell")
                tab_hwnds = []
                def enum_tab_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        if key in w_title:
                            tab_hwnds.append(hwnd)
                    return True
                win32gui.EnumWindows(enum_tab_cb, None)
                for h in tab_hwnds:
                    try:
                        win32gui.ShowWindow(h, win32con.SW_RESTORE)
                        win32gui.SetForegroundWindow(h)
                        ws.SendKeys("^w") # Ctrl+W to close browser tab
                        win32gui.PostMessage(h, win32con.WM_CLOSE, 0, 0)
                        terminated += 1
                    except Exception:
                        pass
            except Exception:
                pass

        # Try posting WM_CLOSE to windows
        if sys.platform == "win32":
            try:
                import win32gui, win32con
                matching = []
                def enum_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        for t in titles:
                            if t in w_title:
                                matching.append(hwnd)
                                break
                    return True
                win32gui.EnumWindows(enum_cb, None)
                for h in matching:
                    try:
                        win32gui.PostMessage(h, win32con.WM_CLOSE, 0, 0)
                        terminated += 1
                    except Exception:
                        pass
            except Exception:
                pass

        # Terminate matching processes via taskkill on Windows (bypasses permission limitations)
        if sys.platform == "win32" and procs:
            for p in procs:
                try:
                    res = subprocess.run(["taskkill", "/F", "/IM", p, "/T"], capture_output=True, text=True)
                    if res.returncode == 0:
                        terminated += 1
                except Exception:
                    pass

        # Fallback: Terminate matching processes via psutil
        if procs:
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    pname = (proc.info['name'] or '').lower()
                    if any(pname == target or pname.startswith(target.replace(".exe", "")) for target in procs):
                        proc.terminate()
                        terminated += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

        return {
            "success": True,
            "closed_instances": terminated,
            "app": key.capitalize(),
            "message": f"Closed {key.capitalize()}."
        }

    def get_system_telemetry(self) -> Dict[str, Any]:
        try:
            return {
                "cpu": {
                    "usage_percent": psutil.cpu_percent(interval=0.1),
                    "cores": psutil.cpu_count(logical=True)
                },
                "memory": {
                    "percent": psutil.virtual_memory().percent,
                    "used_gb": round(psutil.virtual_memory().used / (1024**3), 2),
                    "total_gb": round(psutil.virtual_memory().total / (1024**3), 2)
                },
                "disk": {
                    "percent": psutil.disk_usage("/").percent
                }
            }
        except Exception as e:
            return {"error": str(e)}

app_controller = AppController()
