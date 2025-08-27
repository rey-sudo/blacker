kubectl create secret generic binance-secret-secret \
  --from-literal=secret=<..............>

kubectl create secret generic binance-key-secret \
  --from-literal=key=<..............>

kubectl create secret generic coingecko-key-secret \
  --from-literal=key=<..............>

kubectl create secret generic telegram-token-secret \
  --from-literal=token=<..............>

kubectl create secret generic database-password-secret \
  --from-literal=password=<..............>