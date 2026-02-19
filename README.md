# Online Coding Interview Platform

A collaborative, real-time platform for coding interviews featuring shared state and in-browser code execution.

## Getting Started

### Prerequisites
- Python 3.12+ (uv recommended)
- Node.js 22+ (npm)

### Running Both Simultaneously (Recommended)
```bash
npm run dev
```

### Running with Docker (Recommended for Deployment)
Build and start the single-container deployment:
```bash
docker-compose up --build
```
The entire application (frontend and backend) will be available at [http://localhost:8001](http://localhost:8001).

### Running Separately
#### Running the Backend
1. Navigate to the `backend` directory.
2. Install dependencies:
   ```bash
   uv sync
   ```
3. Run the server:
   ```bash
   uv run python main.py
   ```
   The backend will start on [http://localhost:8001](http://localhost:8001).

### Running the Frontend
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will start on a local port (e.g., [http://localhost:5173](http://localhost:5173) or [http://localhost:5176](http://localhost:5176)).

## Testing

### Backend Integration Tests
1. Navigate to the `backend` directory.
2. Run tests using pytest:
   ```bash
   uv run pytest test_integration.py
   ```

## Key Technologies
- **FastAPI**: Backend API and WebSocket management.
- **React**: Modern frontend framework.
- **Monaco Editor**: Powerful code editor.
- **Yjs**: Shared state for real-time collaboration.
- **Pyodide**: Python execution in the browser.
- **WebSockets**: Low-latency communication for shared state updates.
