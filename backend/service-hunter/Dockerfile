FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    python3-tk \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

RUN npm install --verbose --no-package-lock

COPY . .

RUN npm run build

COPY src/handlers/rsi/main.py dist/handlers/rsi/main.py
COPY src/handlers/rsi/color.py dist/handlers/rsi/color.py
COPY src/handlers/rsi/rsi.py dist/handlers/rsi/rsi.py

EXPOSE 3001

CMD ["sh", "-c", "npm start"]
