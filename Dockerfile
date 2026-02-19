# Stage 1: Build Frontend
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Final Image
FROM python:3.12-slim
WORKDIR /app

# Install uv for backend dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy backend files
COPY backend/ ./
RUN uv pip install --system -r pyproject.toml

# Copy frontend build assets to backend/dist
COPY --from=frontend-builder /app/frontend/dist ./dist

# Expose the port FastAPI is running on
EXPOSE 8001

# Command to run the application
CMD ["python", "main.py"]
