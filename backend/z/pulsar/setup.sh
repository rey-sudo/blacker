sudo mkdir -p ./data/zookeeper ./data/bookkeeper
# this step might not be necessary on other than Linux platforms
sudo chown -R 10000 data

docker compose down

docker compose up -d




docker exec -it broker bash
bin/pulsar-admin namespaces create public/market-data
bin/pulsar-admin namespaces create public/backtest

bin/pulsar-admin namespaces list public


bin/pulsar-admin topics create-partitioned-topic \
  persistent://public/market-data/ticks \
  --partitions 8

bin/pulsar-admin topics create-partitioned-topic \
  non-persistent://public/backtest/input \
  --partitions 8

bin/pulsar-admin topics create-partitioned-topic \
  non-persistent://public/backtest/output \
  --partitions 8