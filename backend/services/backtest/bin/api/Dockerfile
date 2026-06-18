FROM node:22

WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    make \
    g++ \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

# Habilitar pnpm
RUN corepack enable

# Dependencias
COPY package.json pnpm-lock.yaml ./

RUN pnpm install

# Forzar instalación del binario nativo de Pulsar
RUN find node_modules/.pnpm \
    -type d \
    -path "*/pulsar-client@*/node_modules/pulsar-client" \
    -exec sh -c 'cd "$1" && npm run install' _ {} \;

# Código fuente
COPY . .

EXPOSE 8100

CMD ["pnpm", "start"]