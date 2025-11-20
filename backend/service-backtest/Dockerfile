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

COPY src/tools/rsi/main.py dist/tools/rsi/main.py
COPY src/tools/rsi/rsi.py dist/tools/rsi/rsi.py

COPY src/tools/squeeze/main.py dist/tools/squeeze/main.py
COPY src/tools/squeeze/squeeze.py dist/tools/squeeze/squeeze.py

COPY src/tools/squeeze/main.py dist/tools/squeeze/main.py
COPY src/tools/squeeze/squeeze.py dist/tools/squeeze/squeeze.py

COPY src/tools/adx/main.py dist/tools/adx/main.py
COPY src/tools/adx/adx.py dist/tools/adx/adx.py

COPY src/tools/adx/main.py dist/tools/adx/main.py
COPY src/tools/adx/adx.py dist/tools/adx/adx.py

COPY src/tools/heikin/main.py dist/tools/heikin/main.py
COPY src/tools/heikin/heikin.py dist/tools/heikin/heikin.py

EXPOSE 3000

CMD ["sh", "-c", "npm run setup && npm start"]
