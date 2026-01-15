
CREATE DATABASE service_ingest WITH ENCODING = 'UTF8';

CREATE USER service_ingest WITH PASSWORD 'password';

GRANT CONNECT ON DATABASE service_ingest TO service_ingest;

\c service_ingest

GRANT USAGE ON SCHEMA public TO service_ingest;
GRANT CREATE ON SCHEMA public TO service_ingest;
