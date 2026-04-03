# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system deps needed to compile psycopg2 / OR-Tools wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install -r requirements.txt

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source (excluding venv, __pycache__, .env)
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run with uvicorn directly (no reload in production container)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
