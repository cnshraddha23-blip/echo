import asyncio
import os
import sys
import pytest
from backend.services.command_router import command_router
from backend.services.speech_service import speech_service
from backend.services.system_service import safe_eval_math, get_system_telemetry
from backend.services.info_service import get_weather, quick_translate
from backend.automation.app_launcher import app_automation
from backend.database.db_service import db

@pytest.mark.asyncio
async def test_command_router_conversational():
    res = await command_router.execute_command("hi")
    assert "Echo" in res["response"] or "service" in res["response"] or "Hello" in res["response"]
    assert res["action"] in ["ai_chat", "chat", "ai"]

@pytest.mark.asyncio
async def test_command_router_math():
    res = await command_router.execute_command("calculate 12 * 12 + 10")
    assert res["type"] == "calculator"
    assert "154" in res["response"]

@pytest.mark.asyncio
async def test_command_router_time():
    res = await command_router.execute_command("what time is it")
    assert res["type"] == "info"
    assert "currently" in res["response"].lower()

@pytest.mark.asyncio
async def test_command_router_kannada():
    res = await command_router.execute_command("ನಮಸ್ಕಾರ", language="kn-IN")
    assert len(res["response"]) > 0

@pytest.mark.asyncio
async def test_command_router_notes():
    res = await command_router.execute_command("save note test automated note")
    assert res["type"] == "productivity"
    # verify note in db
    notes = db.get_notes(search="automated note")
    assert len(notes) > 0

def test_speech_service_offline_sapi():
    # Test speech synthesis sync does not throw
    speech_service._speak_sync("System diagnostic test speech.")
    assert speech_service.is_speaking is False

def test_system_telemetry():
    t = get_system_telemetry()
    assert t["status"] == "healthy"
    assert "cpu" in t
    assert "memory" in t
    assert t["cpu"]["cores"] > 0

def test_app_allowlist_security():
    assert app_automation.launch_app("notepad.exe")["success"] is False or app_automation.launch_app("notepad")["success"] is True
    # Disallowed app
    assert app_automation.launch_app("malicious_virus_tool")["success"] is False

def test_translation():
    t = quick_translate("hello", "en", "kn")
    assert "ನಮಸ್ಕಾರ" in t["translated"]
