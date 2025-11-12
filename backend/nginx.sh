#!/bin/bash
# exponer_ingress_8080.sh
# Expone el ingress-nginx-controller en el puerto 8080
# y reinicia automáticamente si falla o si el healthcheck deja de responder.

set -e

NAMESPACE="ingress-nginx"
LOCAL_PORT=8080
REMOTE_PORT=80
HEALTH_URL="https://blacker.opencardano.com/api/query/health"
HEALTH_INTERVAL=30  # segundos entre cada chequeo

echo "🔄 Iniciando port-forward automático para ingress-nginx..."
echo "Cuando el túnel o el healthcheck fallen, el script intentará reconectarse."
echo "Presiona CTRL+C para detenerlo."
echo

while true; do
  POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/component=controller \
             -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

  if [ -z "$POD_NAME" ]; then
    echo "❌ No se encontró el pod del ingress controller. Reintentando en 10 segundos..."
    sleep 10
    continue
  fi

  echo "🚀 Conectando a $POD_NAME (puerto local $LOCAL_PORT → remoto $REMOTE_PORT)..."

  # Iniciar port-forward en background
  kubectl port-forward -n "$NAMESPACE" "$POD_NAME" "$LOCAL_PORT":"$REMOTE_PORT" &
  PF_PID=$!
  echo "🌐 Port-forward iniciado con PID $PF_PID"

  # Iniciar monitoreo del healthcheck
  while kill -0 "$PF_PID" 2>/dev/null; do
    sleep "$HEALTH_INTERVAL"
    STATUS=$(curl -sk -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

    if [ "$STATUS" != "200" ]; then
      echo "⚠️ Healthcheck falló (HTTP $STATUS). Reiniciando port-forward..."
      kill "$PF_PID" 2>/dev/null || true
      break
    else
      echo "✅ Healthcheck OK ($STATUS)"
    fi
  done

  echo "⚠️ Conexión perdida o healthcheck fallido. Reintentando en 5 segundos..."
  sleep 5
done
