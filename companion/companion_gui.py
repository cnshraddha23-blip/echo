import tkinter as tk
from tkinter import ttk, messagebox
import threading

def run_gui(companion_client):
    root = tk.Tk()
    root.title("Echo Companion — Connected Device Agent")
    root.geometry("560x650")
    root.configure(bg="#F8F1E7")

    # Colors
    BG_COLOR = "#F8F1E7"
    CARD_BG = "#FFFDF9"
    ACCENT = "#D97745"
    TEXT_MAIN = "#29241F"
    TEXT_MUTED = "#81766B"
    BORDER = "#E8DCCD"

    # Header
    header = tk.Frame(root, bg=CARD_BG, highlightbackground=BORDER, highlightthickness=1)
    header.pack(fill="x", padx=16, pady=10)

    title_lbl = tk.Label(header, text="ECHO COMPANION", font=("Segoe UI", 14, "bold"), fg=ACCENT, bg=CARD_BG)
    title_lbl.pack(anchor="w", padx=16, pady=(10, 2))

    subtitle = tk.Label(header, text=f"Local Device OS Agent • Device: {companion_client.device_name}", font=("Segoe UI", 9), fg=TEXT_MUTED, bg=CARD_BG)
    subtitle.pack(anchor="w", padx=16, pady=(0, 10))

    # Connection Status
    status_card = tk.Frame(root, bg=CARD_BG, highlightbackground=BORDER, highlightthickness=1)
    status_card.pack(fill="x", padx=16, pady=5)

    is_paired = bool(companion_client.device_id and companion_client.device_token)
    initial_status = "Status: Authenticated & Connected" if is_paired else "Status: Waiting for Pairing Code..."
    status_color = "#166534" if is_paired else "#B95F38"

    status_var = tk.StringVar(value=initial_status)
    status_lbl = tk.Label(status_card, textvariable=status_var, font=("Segoe UI", 10, "bold"), fg=status_color, bg=CARD_BG)
    status_lbl.pack(anchor="w", padx=16, pady=(8, 2))

    dev_info = f"Device ID: {companion_client.device_id}" if is_paired else "Device ID: Not Paired"
    dev_lbl = tk.Label(status_card, text=dev_info, font=("Consolas", 8), fg=TEXT_MUTED, bg=CARD_BG)
    dev_lbl.pack(anchor="w", padx=16, pady=(0, 8))

    # Target Server Card (Supports Embarko Cloud & Localhost)
    server_card = tk.Frame(root, bg=CARD_BG, highlightbackground=BORDER, highlightthickness=1)
    server_card.pack(fill="x", padx=16, pady=5)

    server_title = tk.Label(server_card, text="Echo Brain Server URL", font=("Segoe UI", 9, "bold"), fg=TEXT_MAIN, bg=CARD_BG)
    server_title.pack(anchor="w", padx=16, pady=(8, 2))

    server_row = tk.Frame(server_card, bg=CARD_BG)
    server_row.pack(fill="x", padx=16, pady=(0, 8))

    server_entry = tk.Entry(server_row, font=("Consolas", 9), bg="#F8F1E7", fg=TEXT_MAIN, relief="flat", highlightbackground=BORDER, highlightthickness=1)
    server_entry.insert(0, companion_client.server_url)
    server_entry.pack(side="left", fill="x", expand=True, padx=(0, 8), ipady=3)

    def set_cloud_url():
        server_entry.delete(0, "end")
        server_entry.insert(0, "https://echo-ai-assistant.embarko.app")

    def set_local_url():
        server_entry.delete(0, "end")
        server_entry.insert(0, "http://127.0.0.1:5000")

    cloud_btn = tk.Button(server_row, text="Cloud", command=set_cloud_url, font=("Segoe UI", 8, "bold"), bg="#EFE3D3", fg=TEXT_MAIN, relief="flat", padx=8, pady=2, cursor="hand2")
    cloud_btn.pack(side="left", padx=2)

    local_btn = tk.Button(server_row, text="Local", command=set_local_url, font=("Segoe UI", 8, "bold"), bg="#EFE3D3", fg=TEXT_MAIN, relief="flat", padx=8, pady=2, cursor="hand2")
    local_btn.pack(side="left", padx=2)

    # Pairing Section
    pairing_card = tk.Frame(root, bg=CARD_BG, highlightbackground=BORDER, highlightthickness=1)
    pairing_card.pack(fill="x", padx=16, pady=5)

    pair_title = tk.Label(pairing_card, text="Device Pairing", font=("Segoe UI", 9, "bold"), fg=TEXT_MAIN, bg=CARD_BG)
    pair_title.pack(anchor="w", padx=16, pady=(8, 2))

    pair_desc = tk.Label(pairing_card, text="Enter the 6-digit code shown on Echo Web (Devices tab):", font=("Segoe UI", 8), fg=TEXT_MUTED, bg=CARD_BG)
    pair_desc.pack(anchor="w", padx=16, pady=(0, 6))

    pair_row = tk.Frame(pairing_card, bg=CARD_BG)
    pair_row.pack(fill="x", padx=16, pady=(0, 10))

    code_entry = tk.Entry(pair_row, font=("Consolas", 14, "bold"), width=10, justify="center", bg="#F4E1D2", fg=TEXT_MAIN, relief="flat", highlightbackground=ACCENT, highlightthickness=1)
    code_entry.pack(side="left", padx=(0, 10))

    def on_pair_click():
        code = code_entry.get().strip()
        srv = server_entry.get().strip()
        if not code or len(code) != 6:
            messagebox.showwarning("Invalid Code", "Please enter a valid 6-digit pairing code.")
            return
        status_var.set("Status: Submitting pairing code...")
        status_lbl.config(fg="#B95F38")
        threading.Thread(target=perform_pair, args=(code, srv), daemon=True).start()

    def perform_pair(code, srv):
        success = companion_client.pair_with_code(code, server_url=srv)
        if success:
            status_var.set("Status: Successfully Paired & Online")
            status_lbl.config(fg="#166534")
            dev_lbl.config(text=f"Device ID: {companion_client.device_id}")
            messagebox.showinfo("Paired", f"Device successfully paired to Echo Brain at:\n{companion_client.server_url}")
            # Reconnect socket
            threading.Thread(target=companion_client.run, daemon=True).start()
        else:
            status_var.set("Status: Pairing Failed (Check Code & Server)")
            status_lbl.config(fg="#dc2626")
            messagebox.showerror("Error", f"Pairing failed.\nEnsure the code has not expired and your Server URL matches where you generated the code ({srv}).")

    pair_btn = tk.Button(pair_row, text="Pair Device", command=on_pair_click, font=("Segoe UI", 9, "bold"), bg=ACCENT, fg="white", activebackground="#B95F38", activeforeground="white", relief="flat", padx=14, pady=4, cursor="hand2")
    pair_btn.pack(side="left")

    # Activity Log
    log_card = tk.Frame(root, bg=CARD_BG, highlightbackground=BORDER, highlightthickness=1)
    log_card.pack(fill="both", expand=True, padx=16, pady=5)

    log_title = tk.Label(log_card, text="Real-Time Command Activity Log", font=("Segoe UI", 9, "bold"), fg=TEXT_MAIN, bg=CARD_BG)
    log_title.pack(anchor="w", padx=16, pady=(8, 2))

    log_box = tk.Text(log_card, font=("Consolas", 8), bg="#F8F1E7", fg=TEXT_MAIN, relief="flat", highlightbackground=BORDER, highlightthickness=1)
    log_box.pack(fill="both", expand=True, padx=16, pady=(0, 10))

    def append_log(msg):
        def _insert():
            log_box.insert("end", f"{msg}\n")
            log_box.see("end")
        root.after(0, _insert)

    companion_client.set_status_callback(append_log)

    # Start Socket.IO connection in background daemon thread
    threading.Thread(target=companion_client.run, daemon=True).start()

    root.mainloop()
