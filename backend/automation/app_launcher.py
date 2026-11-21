import os
import sys
import subprocess
import psutil
import webbrowser
from typing import Dict, Any, List, Optional

# Desktop executables and URI protocols
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
    "spotify": "spotify",
    "chrome": "chrome",
    "edge": "msedge",
    "browser": "start",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "files": "explorer.exe",
    "task manager": "taskmgr.exe",
    "word": "winword.exe",
    "excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "camera": "microsoft.windows.camera:"
}

# Web apps & digital platforms
ALLOWED_WEBSITES = {
    "whatsapp": "https://web.whatsapp.com",
    "instagram": "https://www.instagram.com",
    "insta": "https://www.instagram.com",
    "youtube": "https://www.youtube.com",
    "spotify": "https://open.spotify.com",
    "browser": "https://www.google.com",
    "google": "https://www.google.com",
    "gmail": "https://mail.google.com",
    "mail": "https://mail.google.com",
    "github": "https://github.com",
    "wikipedia": "https://www.wikipedia.org",
    "twitter": "https://x.com",
    "x": "https://x.com",
    "facebook": "https://www.facebook.com",
    "reddit": "https://www.reddit.com",
    "linkedin": "https://www.linkedin.com",
    "netflix": "https://www.netflix.com",
    "telegram": "https://web.telegram.org",
    "chatgpt": "https://chatgpt.com",
    "amazon": "https://www.amazon.com"
}

# Process mapping and window matching patterns for bringing to front & closing
APP_WINDOW_PATTERNS = {
    "whatsapp": {
        "proc": ["whatsapp.exe", "whatsapp.root.exe", "whatsappdesktop.exe"],
        "title": ["whatsapp"]
    },
    "youtube": {
        "proc": [],
        "title": ["youtube"]
    },
    "spotify": {
        "proc": ["spotify.exe"],
        "title": ["spotify"]
    },
    "chrome": {
        "proc": ["chrome.exe"],
        "title": ["google chrome", "chrome"]
    },
    "edge": {
        "proc": ["msedge.exe"],
        "title": ["microsoft edge", "edge"]
    },
    "browser": {
        "proc": ["chrome.exe", "msedge.exe"],
        "title": ["chrome", "edge", "browser"]
    },
    "code": {
        "proc": ["code.exe"],
        "title": ["visual studio code", "code"]
    },
    "vscode": {
        "proc": ["code.exe"],
        "title": ["visual studio code", "code"]
    },
    "vs code": {
        "proc": ["code.exe"],
        "title": ["visual studio code", "code"]
    },
    "notepad": {
        "proc": ["notepad.exe"],
        "title": ["notepad"]
    },
    "calculator": {
        "proc": ["calculatorapp.exe", "calc.exe", "calculator.exe"],
        "title": ["calculator", "calc"]
    },
    "calc": {
        "proc": ["calculatorapp.exe", "calc.exe", "calculator.exe"],
        "title": ["calculator", "calc"]
    },
    "paint": {
        "proc": ["mspaint.exe", "paint.exe"],
        "title": ["paint"]
    },
    "terminal": {
        "proc": ["windowsterminal.exe", "wt.exe"],
        "title": ["terminal", "windows terminal"]
    },
    "cmd": {
        "proc": ["cmd.exe"],
        "title": ["command prompt", "cmd"]
    },
    "task manager": {
        "proc": ["taskmgr.exe"],
        "title": ["task manager"]
    }
}

# Mobile Deep Links & App Intents
MOBILE_APP_INTENTS = {
    "whatsapp": {
        "app": "WhatsApp",
        "url": "whatsapp://send",
        "web_url": "https://web.whatsapp.com",
        "intent": "intent://send#Intent;package=com.whatsapp;scheme=whatsapp;end"
    },
    "youtube": {
        "app": "YouTube",
        "url": "vnd.youtube://",
        "web_url": "https://m.youtube.com",
        "intent": "intent://#Intent;package=com.google.android.youtube;scheme=vnd.youtube;end"
    },
    "spotify": {
        "app": "Spotify",
        "url": "spotify://",
        "web_url": "https://open.spotify.com",
        "intent": "intent://#Intent;package=com.spotify.music;scheme=spotify;end"
    },
    "instagram": {
        "app": "Instagram",
        "url": "instagram://",
        "web_url": "https://www.instagram.com",
        "intent": "intent://#Intent;package=com.instagram.android;scheme=instagram;end"
    },
    "chrome": {
        "app": "Chrome",
        "url": "googlechrome://",
        "web_url": "https://www.google.com",
        "intent": "intent://#Intent;package=com.android.chrome;scheme=googlechrome;end"
    }
}

class AppAutomation:
    def __init__(self):
        self.launched_processes: Dict[str, psutil.Process] = {}

    def get_supported_app_names(self) -> List[str]:
        keys = list(APP_ALLOWLIST.keys()) + list(ALLOWED_WEBSITES.keys()) + list(APP_WINDOW_PATTERNS.keys())
        return list(set(keys))

    def parse_app_command(self, query: str) -> Dict[str, Any]:
        """
        Parses user query for target devices (mobile, laptop, both),
        operation type (open/launch vs close), and all mentioned application names.
        """
        import re
        q = query.lower().strip(" .?!,:;\"'\n\r\t")
        q = q.replace("whats app", "whatsapp").replace("you tube", "youtube").replace("insta gram", "instagram")
        
        # Target device detection
        has_mobile = any(w in q for w in ["in mobile", "on mobile", "on phone", "in phone", "to mobile", "to phone", "mobile", "phone", "android", "iphone"])
        has_laptop = any(w in q for w in ["in laptop", "on laptop", "on computer", "in computer", "on pc", "on desktop", "laptop", "desktop", "computer"])
        has_both = ("both" in q) or (has_mobile and has_laptop) or ("also" in q and (has_mobile or has_laptop))

        # Operation type detection
        is_close = any(w in q for w in ["close", "closing", "closed", "terminate", "terminating", "exit", "quit", "kill", "shut", "shutting", "stop", "ಮುಚ್ಚು", "ಬಂದ್ ಮಾಡು"])
        is_open = any(w in q for w in ["open", "launch", "start", "run", "popup", "bring to front", "ತೆರೆ", "ಪ್ರಾರಂಭಿಸು"]) or not is_close

        # Find all mentioned apps
        supported = self.get_supported_app_names()
        supported_sorted = sorted(supported, key=len, reverse=True)

        found_apps = []
        text_copy = q
        for app in supported_sorted:
            pattern = r'\b' + re.escape(app) + r'\b'
            if re.search(pattern, text_copy):
                found_apps.append(app)
                text_copy = re.sub(pattern, ' ', text_copy)

        normalized_apps = []
        for a in found_apps:
            if a in ["vscode", "code"]:
                norm = "vs code"
            elif a in ["calc"]:
                norm = "calculator"
            elif a in ["mspaint"]:
                norm = "paint"
            else:
                norm = a
            if norm not in normalized_apps:
                normalized_apps.append(norm)

        # Fallback for generic close commands: "close app", "close apps", "close the window", etc.
        if is_close and not normalized_apps:
            if any(w in q for w in ["app", "apps", "window", "windows", "all"]):
                normalized_apps = ["app"]

        target_laptop = True
        target_mobile = has_mobile or has_both

        return {
            "is_close": is_close,
            "is_open": is_open,
            "target_laptop": target_laptop,
            "target_mobile": target_mobile,
            "has_both": has_both or (target_laptop and target_mobile),
            "apps": normalized_apps
        }

    def get_mobile_intent(self, app_key: str) -> Optional[Dict[str, Any]]:
        clean = app_key.lower().strip()
        return MOBILE_APP_INTENTS.get(clean)

    def popup_window_if_open(self, app_key: str) -> bool:
        """
        If the application or window is already open on Windows,
        restores it if minimized and brings it directly to the foreground (pops up again).
        """
        clean = app_key.lower().strip()
        pattern = APP_WINDOW_PATTERNS.get(clean, {})
        title_keywords = pattern.get("title", [clean])
        proc_names = pattern.get("proc", [])

        # Method 1: Win32GUI Window Enumeration and Foreground Bring-to-Top
        if sys.platform == "win32":
            try:
                import win32gui
                import win32con
                import win32process

                found_hwnds = []

                def enum_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        # Match title
                        for kw in title_keywords:
                            if kw in w_title:
                                found_hwnds.append(hwnd)
                                return True
                        # Match PID
                        if proc_names:
                            try:
                                _, pid = win32process.GetWindowThreadProcessId(hwnd)
                                p = psutil.Process(pid)
                                if p.name().lower() in proc_names:
                                    found_hwnds.append(hwnd)
                                    return True
                            except Exception:
                                pass
                    return True

                win32gui.EnumWindows(enum_cb, None)

                if found_hwnds:
                    hwnd = found_hwnds[0]
                    # Restore if minimized
                    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
                    win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
                    win32gui.BringWindowToTop(hwnd)
                    win32gui.SetForegroundWindow(hwnd)
                    return True
            except Exception:
                pass

            # Method 2: WScript.Shell AppActivate
            try:
                import win32com.client
                ws = win32com.client.Dispatch("WScript.Shell")
                for kw in title_keywords + [clean]:
                    if ws.AppActivate(kw):
                        return True
            except Exception:
                pass

        # Method 3: Check if process is running via psutil
        if proc_names:
            for proc in psutil.process_iter(['name']):
                try:
                    pname = (proc.info['name'] or '').lower()
                    if pname in proc_names:
                        return True
                except Exception:
                    pass

        return False

    def launch_app(self, app_key: str, force_launch: bool = False) -> Dict[str, Any]:
        """
        Launches an application or website.
        If already open on desktop, restores and pops up the existing window.
        """
        app_key_clean = app_key.lower().strip()
        app_display = app_key_clean.capitalize()

        # Requirement: If app is already opened, it should popup again
        if not force_launch:
            popped = self.popup_window_if_open(app_key_clean)
            if popped:
                return {
                    "success": True,
                    "app": app_key_clean,
                    "popped_up": True,
                    "message": f"{app_display} was already running; brought window to the front."
                }

        # Handle Spotify specifically
        if app_key_clean == "spotify":
            try:
                ret = os.system("start spotify:")
                if ret == 0:
                    return {"success": True, "app": "spotify", "popped_up": False, "message": "Opening Spotify."}
            except Exception:
                pass
            webbrowser.open(ALLOWED_WEBSITES["spotify"])
            return {"success": True, "app": "spotify", "type": "url", "popped_up": False, "message": "Opening Spotify."}

        # Handle WhatsApp specifically
        if app_key_clean == "whatsapp":
            try:
                ret = os.system("start whatsapp:")
                if ret == 0:
                    return {"success": True, "app": "whatsapp", "popped_up": False, "message": "Opening WhatsApp."}
            except Exception:
                pass
            webbrowser.open(ALLOWED_WEBSITES["whatsapp"])
            return {"success": True, "app": "whatsapp", "type": "url", "popped_up": False, "message": "Opening WhatsApp."}

        # Check website / web service shortcuts
        if app_key_clean in ALLOWED_WEBSITES:
            url = ALLOWED_WEBSITES[app_key_clean]
            webbrowser.open(url)
            return {"success": True, "app": app_key_clean, "type": "url", "target": url, "popped_up": False, "message": f"Opening {app_display}."}

        # Check local application allowlist
        if app_key_clean in APP_ALLOWLIST:
            exe_cmd = APP_ALLOWLIST[app_key_clean]
            try:
                proc = subprocess.Popen([exe_cmd], shell=False)
                p = psutil.Process(proc.pid)
                self.launched_processes[app_key_clean] = p
                return {
                    "success": True,
                    "app": app_key_clean,
                    "pid": proc.pid,
                    "popped_up": False,
                    "message": f"Opening {app_display}."
                }
            except (FileNotFoundError, OSError):
                try:
                    os.system(f"start {exe_cmd}")
                    return {"success": True, "app": app_key_clean, "popped_up": False, "message": f"Opening {app_display}."}
                except Exception as e:
                    return {"success": False, "error": f"Could not launch executable {exe_cmd}: {str(e)}"}
            except Exception as e:
                return {"success": False, "error": f"Error launching {app_key_clean}: {str(e)}"}

        return {"success": False, "app": app_key, "error": f"'{app_key}' is not in the application allowlist."}

    def close_app(self, app_key: str) -> Dict[str, Any]:
        """
        Closes or terminates application instances.
        Supports all allowlisted apps, WhatsApp, YouTube browser tabs, Spotify, etc.
        """
        app_key_clean = app_key.lower().strip()
        app_display = app_key_clean.capitalize()

        # Handle generic "close app" or "close window"
        if app_key_clean in ["app", "apps", "the app", "the apps", "current app", "window", "active", ""]:
            if sys.platform == "win32":
                try:
                    import win32gui
                    import win32con
                    hwnd = win32gui.GetForegroundWindow()
                    if hwnd:
                        title = win32gui.GetWindowText(hwnd)
                        win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
                        return {"success": True, "app": title or "current app", "closed_instances": 1, "message": f"Closed active window ({title})."}
                except Exception:
                    pass

        pattern = APP_WINDOW_PATTERNS.get(app_key_clean, {})
        proc_names = pattern.get("proc", [])
        title_keywords = pattern.get("title", [app_key_clean])

        if not proc_names and app_key_clean in APP_ALLOWLIST:
            proc_names = [APP_ALLOWLIST[app_key_clean].replace(".exe", "").lower() + ".exe"]

        terminated = 0

        # Special handling for YouTube & browser tabs (WhatsApp Web, YouTube)
        if app_key_clean in ["youtube", "whatsapp"] and sys.platform == "win32":
            try:
                import win32gui
                import win32con
                import win32com.client
                ws = win32com.client.Dispatch("WScript.Shell")
                tab_hwnds = []
                def enum_tab_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        if app_key_clean in w_title:
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

        # 1. Gracefully send WM_CLOSE to matching windows on Windows
        if sys.platform == "win32":
            try:
                import win32gui
                import win32con
                matching_hwnds = []

                def enum_close_cb(hwnd, extra):
                    if win32gui.IsWindowVisible(hwnd):
                        w_title = (win32gui.GetWindowText(hwnd) or "").lower()
                        for kw in title_keywords:
                            if kw in w_title:
                                matching_hwnds.append(hwnd)
                                break
                    return True

                win32gui.EnumWindows(enum_close_cb, None)
                for hwnd in matching_hwnds:
                    try:
                        win32gui.PostMessage(hwnd, win32con.WM_CLOSE, 0, 0)
                        terminated += 1
                    except Exception:
                        pass
            except Exception:
                pass

        # 2. Terminate matching processes via taskkill on Windows (bypasses permission sandbox)
        if sys.platform == "win32" and proc_names:
            for p in proc_names:
                try:
                    res = subprocess.run(["taskkill", "/F", "/IM", p, "/T"], capture_output=True, text=True)
                    if res.returncode == 0:
                        terminated += 1
                except Exception:
                    pass

        # 3. Fallback: Terminate matching processes via psutil
        if proc_names:
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    pname = (proc.info['name'] or '').lower()
                    if any(pname == target or pname.startswith(target.replace(".exe", "")) for target in proc_names):
                        proc.terminate()
                        terminated += 1
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

        return {"success": True, "app": app_key_clean, "closed_instances": terminated, "message": f"Closed {app_display}."}

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
