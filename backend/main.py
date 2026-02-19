from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uuid
import os
from typing import Dict, List, Set

app = FastAPI(title="Online Coding Interview Platform API")

@app.get("/healthz")
async def health_check():
    return {"status": "ok"}

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SessionCreate(BaseModel):
    name: str

class SessionInfo(BaseModel):
    id: str
    name: str

# In-memory storage for sessions and their binary state
# In a real app, this would be a database or Redis
sessions: Dict[str, Dict] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)

    async def broadcast(self, message: bytes, session_id: str, sender: WebSocket):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                if connection != sender:
                    try:
                        await connection.send_bytes(message)
                    except:
                        pass

manager = ConnectionManager()

@app.post("/sessions", response_model=SessionInfo)
async def create_session(session: SessionCreate):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "name": session.name,
        "state": None # Store the binary Y.Doc state if needed
    }
    return {"id": session_id, "name": session.name}

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        return {"error": "Session not found"}, 404
    return {"id": session_id, "name": sessions[session_id]["name"]}

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_bytes()
            await manager.broadcast(data, session_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

# Mount static files (ensure this is after all API/WS routes)
dist_path = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(dist_path):
    # Only mount assets if the directory exists inside dist
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API and WebSocket calls to pass through (though they should be handled above)
        if full_path.startswith("api") or full_path.startswith("ws"):
            return {"error": "Not Found"}, 404
            
        # Serve index.html for all other routes to support client-side routing
        index_file = os.path.join(dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}, 404

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
