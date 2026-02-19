import pytest
from httpx import AsyncClient, ASGITransport
from main import app
import websockets
import asyncio

@pytest.mark.asyncio
async def test_create_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/sessions", json={"name": "Test Interview"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["name"] == "Test Interview"

@pytest.mark.asyncio
async def test_get_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        create_res = await ac.post("/sessions", json={"name": "Fetch Me"})
        session_id = create_res.json()["id"]
        
        get_res = await ac.get(f"/sessions/{session_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Fetch Me"

@pytest.mark.asyncio
async def test_websocket_broadcast():
    # We need to run the app in a way that we can connect via real websockets
    # However, testing with libraries like 'websockets' against a live app
    # usually requires running the app in a separate thread/process.
    # For this environment, we'll use a mocked scenario or verify
    # the manager's broadcast logic if we want to be thorough.
    
    from main import manager
    class MockWS:
        def __init__(self):
            self.sent_data = []
        async def send_bytes(self, data):
            self.sent_data.append(data)
    
    ws1 = MockWS()
    ws2 = MockWS()
    session_id = "test-ws"
    
    # Simulate connections
    if session_id not in manager.active_connections:
        manager.active_connections[session_id] = set()
    manager.active_connections[session_id].add(ws1)
    manager.active_connections[session_id].add(ws2)
    
    test_msg = b"hello collaboration"
    await manager.broadcast(test_msg, session_id, ws1)
    
    assert ws2.sent_data == [test_msg]
    assert ws1.sent_data == [] # Sender shouldn't receive its own message
