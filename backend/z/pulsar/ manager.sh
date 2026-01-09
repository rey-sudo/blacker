git clone https://github.com/apache/pulsar-manager
cd pulsar-manager

docker compose up -d


CSRF_TOKEN=$(curl http://localhost:7750/pulsar-manager/csrf-token)

curl \
  -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
  -H "Cookie: XSRF-TOKEN=$CSRF_TOKEN;" \
  -H "Content-Type: application/json" \
  -X PUT http://localhost:7750/pulsar-manager/users/superuser \
  -d '{"name": "admin", "password": "pulsar", "description": "test", "email": "user@example.org"}'



Environment Name	local
Service URL	http://broker:8080

Bookie URL	http://bookie:8000