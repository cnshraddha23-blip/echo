import pytest
import asyncio
from backend.services.computer_control import computer_control
from backend.services.visual_interaction import visual_engine
from backend.services.agent_orchestrator import agent_orchestrator
from backend.services.device_service import device_service

def test_computer_control_registry():
    tools = computer_control.get_tool_registry()
    assert len(tools) >= 10
    names = [t["name"] for t in tools]
    assert "launch_application" in names
    assert "open_website" in names
    assert "search_browser" in names
    assert "capture_screenshot" in names
    assert "search_files" in names
    assert "open_folder" in names
    assert "get_system_information" in names

def test_computer_control_safe_execution():
    # 1. System telemetry
    tel_res = computer_control.execute_tool("get_system_information", {})
    assert tel_res["success"] is True
    assert "telemetry" in tel_res

    # 2. Folder open check
    f_res = computer_control.execute_tool("open_folder", {"folder_name": "downloads"})
    assert "folder" in f_res or "error" in f_res

    # 3. File search
    search_res = computer_control.execute_tool("search_files", {"query": "echo"})
    assert search_res["success"] is True

    # 4. Unknown tool safe rejection
    bad_res = computer_control.execute_tool("rm_rf_everything", {})
    assert bad_res["success"] is False
    assert "Unknown tool" in bad_res["error"]

def test_visual_perception_screen_capture():
    shot = visual_engine.capture_screen_base64()
    assert shot["success"] is True
    assert "base64" in shot
    assert shot["width"] > 0
    assert shot["height"] > 0
    assert "image_url" in shot

@pytest.mark.asyncio
async def test_visual_interaction_screen_analysis():
    shot = visual_engine.capture_screen_base64()
    assert shot["success"] is True

    analysis = await visual_engine.analyze_screen(shot["base64"], "Open YouTube and search for AI tutorials")
    assert "active_application" in analysis
    assert "detected_elements" in analysis
    assert "next_action" in analysis
    assert len(analysis["detected_elements"]) >= 1

@pytest.mark.asyncio
async def test_visual_loop_cycle():
    res = await visual_engine.execute_visual_loop("Inspect active desktop controls", max_steps=2)
    assert res["status"] in ("completed", "waiting_for_approval")
    assert res["steps_count"] >= 1
    assert len(res["steps"]) >= 1
    first_step = res["steps"][0]
    assert "screenshot_url" in first_step

@pytest.mark.asyncio
async def test_agent_orchestrator_computer_control_routing():
    # Test browser search natural-language routing
    q_search = "open youtube and search for quantum computing"
    res1 = await agent_orchestrator.route_and_execute(q_search, language="en-IN")
    assert res1["agent"]["id"] == "computer_control"
    assert "search_browser" in res1["tools_used"]
    assert "quantum computing" in res1["response"].lower()

    # Test visual perception natural-language routing
    q_vis = "look at my screen and tell me what is open"
    res2 = await agent_orchestrator.route_and_execute(q_vis, language="en-IN")
    assert res2["agent"]["id"] == "computer_control"
    assert "capture_screenshot" in res2["tools_used"]

    # Test Kannada natural-language routing
    q_kn = "youtube ನಲ್ಲಿ ಶೋಧಿಸು"
    res3 = await agent_orchestrator.route_and_execute(q_kn, language="kn-IN")
    assert res3["agent"]["id"] == "computer_control"

def test_visual_task_cancellation():
    visual_engine._is_running = True
    visual_engine._cancelled = False
    visual_engine.cancel_active_task()
    assert visual_engine._cancelled is True
    assert visual_engine._is_running is False

@pytest.mark.asyncio
async def test_natural_language_planning_and_execution():
    plan = await computer_control.plan_natural_language_request("Open YouTube and search for AI tutorials")
    assert len(plan) >= 1
    assert plan[0]["tool"] == "search_browser"
    assert "youtube" in plan[0]["params"]["engine"]

    plan_pdf = await computer_control.plan_natural_language_request("Find my latest PDF")
    assert len(plan_pdf) >= 1
    assert plan_pdf[0]["tool"] == "search_files"

    exec_res = await computer_control.execute_plan(plan_pdf)
    assert exec_res["success"] is True
    assert exec_res["total_steps"] >= 1

@pytest.mark.asyncio
async def test_multi_app_and_mobile_dispatch():
    # 1. Multi-app open on mobile and laptop: "open whatsapp and open youtube in mobile"
    q = "open whatsapp and open youtube in mobile"
    res = await agent_orchestrator.route_and_execute(q, language="en-IN")
    assert res["agent"]["id"] == "computer_control"
    assert "launch_application" in res["tools_used"]
    assert "remote_dispatch" in res["tools_used"]
    payload = res["result_payload"]
    assert payload["target_mobile"] is True
    assert payload["target_laptop"] is True
    assert len(payload["apps"]) == 2
    app_names = [a.get("app") for a in payload["apps"]]
    assert "whatsapp" in app_names
    assert "youtube" in app_names
    # Verify mobile intents
    assert len(payload["mobile_intents"]) >= 1
    intent_urls = [m.get("url") for m in payload["mobile_intents"]]
    assert any("whatsapp" in u or "youtube" in u for u in intent_urls)

@pytest.mark.asyncio
async def test_app_closing_commands():
    # 2. App close: "close whatsapp and close youtube"
    q_close = "close whatsapp and close youtube"
    res_close = await agent_orchestrator.route_and_execute(q_close, language="en-IN")
    assert res_close["agent"]["id"] == "computer_control"
    assert "close_application" in res_close["tools_used"]
    payload = res_close["result_payload"]
    assert "closed_apps" in payload
    assert "whatsapp" in payload["closed_apps"]
    assert "youtube" in payload["closed_apps"]
    assert "Closed" in res_close["response"]

@pytest.mark.asyncio
async def test_single_app_close_command():
    # 3. Single app close: "close whatsapp"
    res = await agent_orchestrator.route_and_execute("close whatsapp", language="en-IN")
    assert res["agent"]["id"] == "computer_control"
    assert "close_application" in res["tools_used"]
    assert "whatsapp" in res["result_payload"]["closed_apps"]

def test_app_popup_mechanism():
    from backend.automation.app_launcher import app_automation
    # Verify popup method exists and runs safely without crashing
    popped = app_automation.popup_window_if_open("calculator")
    assert isinstance(popped, bool)


