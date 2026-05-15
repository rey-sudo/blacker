# =========================
# BASE
# =========================
FROM python:3.11-slim

# =========================
# ENV
# =========================
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# =========================
# WORKDIR
# =========================
WORKDIR /app

# =========================
# DEPENDENCIAS
# =========================
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# =========================
# CÓDIGO
# =========================
COPY . .
# =========================
# COMANDO
# =========================
CMD ["python", "main.py"]