import pytest
import os
import json
from backend.database.db_service import db
from backend.services.auth_service import auth_service
from backend.services.agent_orchestrator import agent_orchestrator
from backend.services.device_service import device_service
from backend.services.workflow_service import workflow_service
from backend.services.research_service import research_service
from backend.services.file_service import file_service

def test_auth_service():
    test_user = "tester_" + os.urandom(4).hex()
    ok, msg, data = auth_service.register(test_user, "password123", "Tester")
    assert ok is True
    assert data is not None
    assert "token" in data
    
    # Test login
    ok2, msg2, data2 = auth_service.login(test_user, "password123")
    assert ok2 is True
    assert data2["token"] is not None

def test_device_pairing():
    # Generate pairing code
    pair_res = db.generate_pairing_code(user_id=1)
    code = pair_res["pairing_code"]
    assert len(code) == 6
    
    # Claim code
    claimed = db.claim_pairing_code(code, "Test Laptop", "Windows", "2.0.0")
    assert claimed is not None
    assert "device_id" in claimed
    assert claimed["name"] == "Test Laptop"
    
    # Verify in device list
    devs = db.get_devices(user_id=1)
    dev_ids = [d["id"] for d in devs]
    assert claimed["device_id"] in dev_ids

@pytest.mark.asyncio
async def test_agent_orchestrator():
    # Test personal assistant agent
    res = await agent_orchestrator.route_and_execute("Hello Echo", user_id=1, language="en-IN")
    assert res["agent"]["id"] == "personal_assistant"
    assert len(res["response"]) > 0

    # Test system intelligence agent
    res_sys = await agent_orchestrator.route_and_execute("What is CPU and RAM usage?", user_id=1, language="en-IN")
    assert res_sys["agent"]["id"] == "system_intelligence"
    assert "CPU" in res_sys["response"] or "ಸಿಪಿಯು" in res_sys["response"]

@pytest.mark.asyncio
async def test_workflow_service():
    res = await workflow_service.execute_workflow("wf-study-mode", user_id=1)
    assert res["success"] is True
    assert len(res["steps"]) > 0

def test_memory_service():
    mem = db.create_memory(user_id=1, key="favorite_color", value="Amber Orange", category="preference", importance=4)
    assert mem["key"] == "favorite_color"
    mems = db.get_memories(user_id=1, category="preference")
    assert any(m["key"] == "favorite_color" for m in mems)
    db.delete_memory(mem["id"], user_id=1)

def test_file_service():
    res = file_service.list_files("")
    assert res["success"] is True
    assert res["total"] > 0
