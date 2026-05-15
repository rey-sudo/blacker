# --- Estapa 1: Constructor (Builder) ---
# Usamos la imagen oficial de Rust basada en Debian para compilar
FROM rust:1.80-slim AS builder

WORKDIR /usr/src/app

# Copiamos los archivos de configuración del proyecto primero
# (Esto ayuda a que Docker cachee las dependencias si no han cambiado)
COPY Cargo.toml Cargo.lock ./

# Creamos un proyecto dummy para compilar las dependencias en caché
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -f src/main.rs target/release/deps/nombre_de_tu_proyecto*

# Ahora copiamos el código fuente real de tu aplicación
COPY src ./src
# Si tienes el módulo model.rs fuera de src (ej. en la raíz), asegúrate de incluirlo
# COPY model.rs ./

# Compilamos la aplicación real en modo Release
RUN cargo build --release

# --- Etapa 2: Ejecutor (Runner) ---
# Usamos una imagen Debian limpia y minimalista para correr el binario
FROM debian:bookworm-slim

# Instalar certificados SSL y librerías básicas por si tu cliente Redis los requiere
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos el binario compilado desde la etapa anterior
# NOTA: Reemplaza "nombre_de_tu_proyecto" por el 'name' que está en tu Cargo.toml
COPY --from=builder /usr/src/app/target/release/ticks /app/csv_streamer

# Variables de entorno por defecto (puedes sobrescribirlas al ejecutar el contenedor)
ENV REDIS_URL="redis://127.0.0.1:6379"
ENV CSV_PATH="/data/input.csv"
ENV BIN_PATH="/data/output.bin"
ENV STREAM_KEY="ticks:stream"

# Comando por defecto para arrancar la aplicación
CMD ["./csv_streamer"]