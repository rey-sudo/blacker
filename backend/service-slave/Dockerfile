FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN bun run build

EXPOSE 8002

CMD ["sh", "-c", "bun run setup && bun run start"]
