import pytest
import os
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.db_service import db
from backend.services.system_service import safe_eval_math
from backend.automation.app_launcher import app_automation

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_system_info():
    response = client.get("/api/system/info")
    assert response.status_code == 200
    data = response.json()
    assert "cpu" in data
    assert "memory" in data

def test_safe_math():
    assert safe_eval_math("2 + 2") == 4
    assert safe_eval_math("10 * (5 + 3)") == 80
    assert safe_eval_math("sqrt(144)") == 12
    with pytest.raises(ValueError):
        safe_eval_math("import os; os.system('calc')")

def test_database_notes_crud():
    # Create
    created = db.create_note("Test Note", "Testing Echo persistent notes", category="work", is_pinned=True)
    assert created["title"] == "Test Note"
    note_id = created["id"]
    
    # Read
    notes = db.get_notes(search="Test Note")
    assert any(n["id"] == note_id for n in notes)
    
    # Update
    updated = db.update_note(note_id, "Test Note Updated", "New content")
    assert updated["title"] == "Test Note Updated"
    
    # Delete
    deleted = db.delete_note(note_id)
    assert deleted is True

def test_database_tasks_crud():
    created = db.create_task("Finish Echo UI", priority="high")
    task_id = created["id"]
    assert created["status"] == "pending"
    
    updated = db.update_task(task_id, status="completed")
    assert updated["status"] == "completed"
    
    deleted = db.delete_task(task_id)
    assert deleted is True

def test_database_reminders_crud():
    created = db.create_reminder("Standup Meeting", "2026-11-16T10:00")
    rem_id = created["id"]
    assert created["status"] == "pending"
    
    updated = db.update_reminder(rem_id, status="triggered")
    assert updated["status"] == "triggered"
    
    deleted = db.delete_reminder(rem_id)
    assert deleted is True

def test_app_allowlist():
    apps = app_automation.get_allowed_apps()
    app_ids = [a["id"] for a in apps]
    assert "calculator" in app_ids
    assert "notepad" in app_ids
    assert "vscode" in app_ids
    
    # Test disallowed app rejection
    res = app_automation.launch_app("random_malicious_executable")
    assert res["success"] is False

def test_settings_api():
    res = client.get("/api/settings")
    assert res.status_code == 200
    
    update_res = client.put("/api/settings", json={"preferences": {"theme": "light", "language": "en-IN"}})
    assert update_res.status_code == 200
